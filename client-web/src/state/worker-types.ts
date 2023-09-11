import {
  WebSocketClientInfo,
  PublishingRequest,
  Subscription,
  PublishingQueueItem,
  RelaySubscription,
  NFilters,
  ProcessedUserBase,
  LightProcessedEvent,
  EventBase,
  NEVENT_KIND,
  ProcessedEventWithEvents,
} from "@nostr-ts/common";
import { ListRecord, NClientBase } from "./base-types";

export interface NClientWorker extends NClientBase {
  eventsPublishingQueue: PublishingQueueItem[];
  addQueueItems: (payload: PublishingQueueItem[]) => void;
  updateQueueItem: (payload: PublishingQueueItem) => void;
  getQueueItems: () => PublishingQueueItem[];

  getSubscriptions: () => RelaySubscription[] | undefined;
  unsubscribe: (ids: string[]) => void;
  unsubscribeAll: () => void;

  count: (pubkey: string) => Subscription[] | undefined;
  countEvents: () => number;
  getEvent: (
    id: string,
    view?: string
  ) => Promise<LightProcessedEvent | undefined>;
  getEvents: (params: {
    view: string;
    limit?: number;
    offset?: number;
  }) => void;
  getEventReplies: (
    id: string,
    view?: string
  ) => Promise<LightProcessedEvent[] | undefined>;
  sendEvent: (payload: PublishingRequest) => void;
  events?: ProcessedEventWithEvents[];
  /**
   * Add event to array or map
   * - In worker, must post message to main thread
   */
  // useEvent: (payload: ProcessedEventWithEvents) => void;
  /**
   * Update event on array or map
   * - In worker, must post message to main thread
   */
  // updateEvent: (payload: ProcessedEventWithEvents, view: string) => void;
  setMaxEvents: (max: number) => void;
  sendQueueItems: (items: PublishingQueueItem[]) => void;
  clearEvents: () => void;
  getRelays: () => WebSocketClientInfo[] | undefined;
  updateRelay: (
    id: string,
    options: {
      isEnabled?: boolean;
      read?: boolean;
      write?: boolean;
    }
  ) => void;

  setViewSubscription: (
    view: string,
    filters: NFilters,
    options: {
      reset?: boolean;
      limit: number;
      offset: number;
    }
  ) => Promise<void | {
    viewChanged: boolean;
  }>;
  removeViewSubscription: (view: string) => void;

  /**
   * Set to disconnect state
   * - Clears all subscriptions
   * - Clears all events
   * @returns
   */
  disconnect: () => void;
}

export interface NClientDB {
  users: {
    key: string;
    value: ProcessedUserBase;
    indexes: {
      user: {
        pubkey: string;
      };
    };
  };
  lists: {
    key: string;
    value: ListRecord;
    indexes: {
      userPubkeys: string[];
    };
  };
  events: {
    key: string;
    value: EventBase;
    indexes: {
      pubkey: string;
      kind: NEVENT_KIND;
      created_at: number;
      kindAndPubkey: [NEVENT_KIND, string];
    };
  };
  tags: {
    key: string;
    value: {
      eventId: string;
      id: string;
      type: string;
      value: string;
    };
    indexes: {
      eventId: string;
      typeAndValue: [string, string];
    };
  };
}
