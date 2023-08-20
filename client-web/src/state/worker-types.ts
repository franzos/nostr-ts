import { EventBase, WebSocketClientInfo, UserBase } from "@nostr-ts/common";
import { NClientBase } from "./base-types";
import { PublishingEventsQueueItem } from "./publishing-qeue";

export interface NClientWorker extends NClientBase {
  checkedUsers: string[];
  checkedEvents: string[];

  eventsPublishingQueue: PublishingEventsQueueItem[];

  unsubscribe: (id: string) => void;
  unsubscribeAll: () => void;

  sendEvent: (event: EventBase) => void;
  setMaxEvents: (max: number) => void;
  clearEvents: () => void;
  getRelays: () => WebSocketClientInfo[];
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
