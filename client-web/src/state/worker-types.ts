import {
  WebSocketClientInfo,
  UserBase,
  PublishingRequest,
  Subscription,
  PublishingQueueItem,
  CountRequest,
  RelaySubscription,
  NFilters,
} from "@nostr-ts/common";
import { NClientBase } from "./base-types";

export interface NClientWorker extends NClientBase {
  checkedUsers: string[];
  checkedEvents: string[];

  eventsPublishingQueue: PublishingQueueItem[];

  getSubscriptions: () => RelaySubscription[];
  unsubscribe: (ids: string[]) => void;
  unsubscribeAll: () => void;

  count: (payload: CountRequest) => Subscription[] | undefined;
  sendEvent: (payload: PublishingRequest) => void;
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

  setViewSubscription: (view: string, filters: NFilters) => void;
  removeViewSubscription: (view: string) => void;
  processActiveEvents: (view: string) => void;

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
    value: {
      user: UserBase;
      relayUrls: string[];
    };
    indexes: {
      user: {
        pubkey: string;
      };
    };
  };
  following: {
    key: string;
    value: {
      user: UserBase;
      relayUrls: string[];
    };
    indexes: {
      user: {
        pubkey: string;
      };
    };
  };
}
