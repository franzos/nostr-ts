import {
  NEvent,
  ProcessedEvent,
  WebSocketClientInfo,
  WebSocketEvent,
  NFilters,
  Subscription,
  CountRequest,
  PublishingQueueItem,
  PublishingRequest,
  RelaySubscription,
} from "@nostr-ts/common";
import { Remote } from "comlink";
import { NClientWorker } from "./worker-types";
import { NClientBase } from "./base-types";
import { NClientKeystore } from "./keystore";

export interface NClient extends NClientBase {
  store: Remote<NClientWorker>;
  getRelays: () => Promise<WebSocketClientInfo[]>;
  updateRelay: (
    url: string,
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

  getSubscriptions: () => Promise<RelaySubscription[]>;
  unsubscribe: (ids: string[]) => Promise<void>;
  unsubscribeAll: () => Promise<void>;

  keystore: "none" | "localstore" | "nos2x" | "download";
  loadKeyStore: () => void;
  saveKeyStore: () => void;
  resetKeyStore: () => void;
  setKeyStore: (config: NClientKeystore) => void;
  keypair: { publicKey: string; privateKey?: string };
  keypairIsLoaded: boolean;

  eventProofOfWork: (event: NEvent, bits: number) => Promise<NEvent>;
  count: (payload: CountRequest) => Promise<Subscription[] | undefined>;
  sendEvent: (events: PublishingRequest) => Promise<void>;
  signAndSendEvent: (event: PublishingRequest) => Promise<string>;
  eventsPublishingQueue: PublishingQueueItem[];
  clearEvents: () => Promise<void>;

  setMaxEvents: (max: number) => Promise<void>;
  determineApplicableRelays: (request: PublishingRequest) => Promise<{
    relays: WebSocketClientInfo[];
    pow: number;
  }>;
  generateQueueItems: (
    request: PublishingRequest
  ) => Promise<PublishingQueueItem[] | undefined>;
  events: ProcessedEvent[];

  viewerSubscription?: {
    page: string;
    subscription?: Subscription;
  };
  hasViewSubscription: (view: string) => Promise<boolean>;
  setViewSubscription: (
    view: string,
    filters: NFilters,
    overwrite?: boolean
  ) => Promise<void>;
  removeViewSubscription: (view: string) => Promise<void>;

  /**
   * Set to disconnect state
   * - Clears all subscriptions
   * - Clears all events
   * @returns
   */
  disconnect: () => Promise<void>;
}
