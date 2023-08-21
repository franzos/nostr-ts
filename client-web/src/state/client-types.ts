import {
  NEvent,
  NEventWithUserBase,
  WebSocketClientInfo,
  WebSocketEvent,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  ClientSubscription,
  NFilters,
  Count,
} from "@nostr-ts/common";
import { Remote } from "comlink";
import { NClientWorker } from "./worker-types";
import { NClientBase } from "./base-types";
import { NClientKeystore } from "./keystore";
import { PublishingEventsQueueItem } from "./publishing-qeue";

export interface NClient extends NClientBase {
  store: Remote<NClientWorker>;
  getRelays: () => Promise<WebSocketClientInfo[]>;
  updateRelay: (
    id: string,
    options: {
      isEnabled?: boolean;
      read?: boolean;
      write?: boolean;
    }
  ) => Promise<void>;
  /**
   * Events set by worker listener
   */
  relayEvents: WebSocketEvent[];

  unsubscribe: (id: string) => Promise<void>;
  unsubscribeAll: () => Promise<void>;

  keystore: "none" | "localstore" | "nos2x" | "download";
  loadKeyStore: () => void;
  saveKeyStore: () => void;
  setKeyStore: (config: NClientKeystore) => void;
  keypair: { publicKey: string; privateKey?: string };
  keypairIsLoaded: boolean;
  /**
   * New event being created
   * wire up to UI
   */
  newEvent: NEvent;
  eventProofOfWork: (event: NEvent, bits: number) => Promise<NEvent>;
  count: (payload: Count) => Promise<ClientSubscription[] | undefined>;
  sendEvent: (event: NEvent) => Promise<void>;
  signAndSendEvent: (event: NEvent) => Promise<string>;
  eventsPublishingQueue: PublishingEventsQueueItem[];
  clearEvents: () => Promise<void>;

  setNewEvent: (event: NEvent) => void;
  setMaxEvents: (max: number) => Promise<void>;
  events: NEventWithUserBase[];
  /**
   * Track kind name like NewShortTextNote
   */
  newEventName: string;
  setNewEventName: (name: string) => void;
  setNewEventContent: (content: string) => void;
  addEvent?: (payload: {
    data:
      | RelayAuth
      | RelayCount
      | RelayEose
      | RelayEvent
      | RelayNotice
      | RelayOK;
    meta: WebSocketClientInfo;
  }) => void;

  viewerSubscription?: {
    page: string;
    subscription?: ClientSubscription;
  };
  hasViewSubscription: (view: string) => Promise<boolean>;
  setViewSubscription: (
    view: string,
    filters: NFilters,
    overwrite?: boolean
  ) => Promise<void>;
  removeViewSubscription: (view: string) => Promise<void>;
}
