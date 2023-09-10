import {
  WebSocketClientInfo,
  PublishingRequest,
  Subscription,
  PublishingQueueItem,
  RelaySubscription,
  NFilters,
  ProcessedUserBase,
  ProcessedEvent,
  LightProcessedEvent,
} from "@nostr-ts/common";
import { ListRecord, NClientBase, ProcessedEventKeys } from "./base-types";

export interface NClientWorker extends NClientBase {
  currentViewSubscription: {
    view: string;
    limit: number;
    offset: number;
  };

  eventsPublishingQueue: PublishingQueueItem[];
  addQueueItems: (payload: PublishingQueueItem[]) => void;
  updateQueueItem: (payload: PublishingQueueItem) => void;
  getQueueItems: () => PublishingQueueItem[];

  getSubscriptions: () => RelaySubscription[];
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
  sendEvent: (payload: PublishingRequest) => void;
  events?: ProcessedEvent[];
  /**
   * Add event to array or map
   * - In worker, must post message to main thread
   */
  addEvent: (payload: ProcessedEvent) => void;
  /**
   * Update event on array or map
   * - In worker, must post message to main thread
   */
  updateEvent: (payload: ProcessedEvent, view: string) => void;
  getEventById: (
    id: string,
    key?: ProcessedEventKeys
  ) => Partial<LightProcessedEvent> | undefined;
  setMaxEvents: (max: number) => void;
  sendQueueItems: (items: PublishingQueueItem[]) => void;
  clearEvents: () => void;
  getRelays: () => WebSocketClientInfo[];
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
  processActiveEvents: (
    view: string,
    options: {
      limit: number;
      offset: number;
    }
  ) => void;

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
      list: {
        id: string;
      };
      userPubkeys: string[];
    };
  };
}
