import {
  NEvent,
  WebSocketClientInfo,
  WebSocketEvent,
  Subscription,
  PublishingQueueItem,
  PublishingRequest,
  RelaySubscription,
  LightProcessedEvent,
} from "@nostr-ts/common";
import { Remote } from "comlink";
import { NClientBase } from "./base-types";
import { NClientKeystore } from "./keystore";
import {
  NWorker,
  StorageEventsQuery,
  StorageQueryParams,
  StorageQueryResult,
  WorkerEvent,
} from "@nostr-ts/web";

export interface NClient extends NClientBase {
  status: "online" | "offline" | "loading" | "error";
  store: Remote<NWorker>;
  _processEvents: (events: WorkerEvent[]) => void;
  getRelays: () => Promise<WebSocketClientInfo[] | undefined>;
  updateRelay: (
    url: string,
    options: {
      isEnabled?: boolean;
      read?: boolean;
      write?: boolean;
    }
  ) => Promise<void>;
  relayAuth: (url: string, challenge: string) => Promise<void>;
  /**
   * Events set by worker listener
   */
  relayEvents: WebSocketEvent[];

  getSubscriptions: (options?: {
    isActive?: boolean;
  }) => Promise<RelaySubscription[] | undefined>;
  unsubscribe: (ids: string[]) => Promise<void>;
  unsubscribeAll: () => Promise<void>;

  getQueueItems: () => Promise<PublishingQueueItem[]>;

  keystore: "none" | "localstore" | "nos2x" | "download";
  loadKeyStore: () => void;
  saveKeyStore: () => void;
  resetKeyStore: () => void;
  setKeyStore: (config: NClientKeystore) => void;
  keypair: { publicKey: string; privateKey?: string };
  keypairIsLoaded: boolean;

  eventProofOfWork: (event: NEvent, bits: number) => Promise<NEvent>;
  count: (pubkey: string) => Promise<Subscription[] | undefined>;
  countEvents: () => Promise<number>;
  getEvent: (
    id: string,
    options: {
      view: string;
      retryCount?: number;
      relayUrls?: string[];
    }
  ) => Promise<LightProcessedEvent | undefined>;
  getEvents: (
    params?: StorageEventsQuery,
    insertAt?: "append" | "prepend" | "replace"
  ) => Promise<StorageQueryParams>;
  getEventReplies: (
    id: string,
    view: string,
    isLive: boolean
  ) => Promise<number | undefined>;
  sendEvent: (events: PublishingRequest) => Promise<PublishingQueueItem[]>;
  signEvent: (eventWithId: NEvent) => Promise<NEvent>;
  signAndSendEvent: (event: PublishingRequest) => Promise<string>;

  setMaxEvents: (max: number) => Promise<void>;
  determineApplicableRelays: (request: PublishingRequest) => Promise<
    | {
        relays: WebSocketClientInfo[];
        pow: number;
      }
    | undefined
  >;
  generateQueueItems: (
    request: PublishingRequest
  ) => Promise<PublishingQueueItem[] | undefined>;
  events: {
    [token: string]: LightProcessedEvent[];
  };
  eventsNewest: {
    [token: string]: number;
  };
  mergeNewerEvents: (token: string) => void;
  eventsNewer: {
    [token: string]: LightProcessedEvent[];
  };
  /**
   * Add event to array or map
   * - In worker, must post message to main thread
   */
  addEvent: (payload: LightProcessedEvent, token: string) => void;
  // addEvents: (payload: LightProcessedEvent[]) => void;
  /**
   * Update event on array or map
   * - In worker, must post message to main thread
   */
  updateEvent: (payload: LightProcessedEvent, token?: string) => void;
  // updateEvents: (payload: LightProcessedEvent[]) => void;

  nextQuery: StorageQueryResult | undefined;
  unsubscribeByToken: (token: string) => Promise<void>;

  /**
   * Set to disconnect state
   * - Clears all subscriptions
   * - Clears all events
   */
  disconnect: () => Promise<void>;
}
