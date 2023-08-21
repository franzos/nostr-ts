import {
  EventBase,
  WebSocketClientInfo,
  UserBase,
  ClientSubscription,
  Count,
} from "@nostr-ts/common";
import { NClientBase } from "./base-types";
import { PublishingEventsQueueItem } from "./publishing-qeue";

export interface NClientWorker extends NClientBase {
  checkedUsers: string[];
  checkedEvents: string[];

  eventsPublishingQueue: PublishingEventsQueueItem[];

  unsubscribe: (id: string) => void;
  unsubscribeAll: () => void;

  count: (payload: Count) => ClientSubscription[] | undefined;
  sendEvent: (event: EventBase) => void;
  setMaxEvents: (max: number) => void;
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
}

export interface NClientDB {
  users: {
    key: string;
    value: UserBase;
    indexes: { pubkey: string };
  };
  following: {
    key: string;
    value: UserBase;
    indexes: { pubkey: string };
  };
}
