import { LightProcessedEvent, NEvent, PublishingQueueItem, SubscriptionOptions } from "@nostr-ts/common";
import { NWorker, RequestInformationPayload, WorkerEvent } from "@nostr-ts/web";
import { Remote } from "comlink";

// Request deduplication cache
const pendingUserRequests = new Map<string, Promise<void>>();

// Utility functions
export const findEventById = (events: LightProcessedEvent[], eventId: string): number =>
  events.findIndex((e) => e.event.id === eventId);

export const findEventInBatch = (eventsBatch: WorkerEvent[], eventId: string): number =>
  eventsBatch.findIndex((batchEvent) => {
    if (batchEvent.data.type === "event:update") {
      const batchEventId = (batchEvent.data.data as LightProcessedEvent).event.id;
      return batchEventId === eventId;
    }
    return false;
  });

export const calculatePOWRequirement = (requestedPOW: number | undefined, neededPow: number): number => {
  if (requestedPOW && requestedPOW !== 0) {
    if (requestedPOW < neededPow) {
      throw new Error(`Requested POW ${requestedPOW} is lower than needed ${neededPow}`);
    }
    return requestedPOW;
  }
  return neededPow;
};

export const prepareEventForSigning = (event: NEvent, publicKey: string): NEvent => {
  event.pubkey = publicKey;
  event.generateId();
  return event;
};

export const processQueueItemsWithPOW = async (
  queueItems: PublishingQueueItem[],
  event: NEvent,
  store: Remote<NWorker>
): Promise<void> => {
  for (const item of queueItems) {
    item.event = event;
    item.powDone = Date.now();
    await store.updateQueueItem(item);
  }
};

export const requestRelatedData = (
  events: LightProcessedEvent[],
  token: string,
  requestInfo: (payload: RequestInformationPayload, options: SubscriptionOptions) => void
): void => {
  if (events.length === 0) return;

  const eventIds = events.map((e) => e.event.id);
  const userPubkeys = [...new Set(events.map((e) => e.event.pubkey))];
  
  // Request related events (replies, reactions, etc.)
  requestInfo(
    {
      source: "events:related",
      idsOrKeys: eventIds,
    },
    {
      view: token,
      timeoutIn: 10000,
      isLive: true,
    }
  );
  
  // Request user information
  requestInfo(
    {
      source: "users",
      idsOrKeys: userPubkeys,
    },
    {
      view: token,
      timeoutIn: 10000,
      isLive: true,
    }
  );
};

export const filterEventsByBlockedUser = (
  events: Record<string, LightProcessedEvent[]>,
  blockedPubkey: string
): Record<string, LightProcessedEvent[]> => {
  const updatedEvents: Record<string, LightProcessedEvent[]> = {};
  
  for (const [key, eventArray] of Object.entries(events)) {
    updatedEvents[key] = eventArray.filter(
      (e) => e.event.pubkey !== blockedPubkey
    );
  }
  
  return updatedEvents;
};

export const fetchUserFromRelays = async (
  publicKey: string,
  requestInfo: (payload: RequestInformationPayload, options: SubscriptionOptions) => void
): Promise<void> => {
  // Check if request is already pending
  const existing = pendingUserRequests.get(publicKey);
  if (existing) {
    return existing;
  }

  // Create new request
  const request = (async () => {
    try {
      await requestInfo(
        {
          idsOrKeys: [publicKey],
          source: "users",
        },
        {
          timeoutIn: 10000,
        }
      );
    } finally {
      // Clean up after completion
      pendingUserRequests.delete(publicKey);
    }
  })();

  pendingUserRequests.set(publicKey, request);
  return request;
};

export const clearPendingUserRequest = (publicKey: string): void => {
  pendingUserRequests.delete(publicKey);
};

export const scheduleUserRetry = (
  retryFn: () => Promise<void>,
  delayMs: number = 1000
): void => {
  setTimeout(retryFn, delayMs);
};

export function throttle(fn: (events: WorkerEvent[]) => void, delay: number) {
  let timeout: number | null = null;
  let eventsBatch: WorkerEvent[] = [];

  return function (incomingEvent: WorkerEvent) {
    if (incomingEvent.data.type === "event:update") {
      const incomingEventId = (incomingEvent.data.data as LightProcessedEvent)
        .event.id;

      const existingEventIndex = findEventInBatch(eventsBatch, incomingEventId);

      if (existingEventIndex !== -1) {
        eventsBatch[existingEventIndex] = incomingEvent;
      } else {
        eventsBatch.push(incomingEvent);
      }
    } else {
      eventsBatch.push(incomingEvent);
    }

    if (!timeout) {
      timeout = setTimeout(() => {
        fn(eventsBatch);
        eventsBatch = [];
        timeout = null;
      }, delay);
    }
  };
}