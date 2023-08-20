import { EventBase } from "@nostr-ts/common";

export interface QueueRelay {
  id: string;
  send: boolean;
  accepted?: boolean;
  error?: string;
  // When a relay responds with a request for POW, we store it here
  powRequested?: 0;
}

export interface PublishingEventsQueueItem {
  event: EventBase;
  send: boolean;
  powRequired?: number;
  powStartTime?: number;
  powEndTime?: number;
  powDone?: boolean;
  accepted?: boolean;
  relays: QueueRelay[];
}
