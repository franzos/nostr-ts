import {
  NEvent,
  WebSocketClientInfo,
  WebSocketEvent,
  NFilters,
  Subscription,
  PublishingQueueItem,
  PublishingRequest,
  RelaySubscription,
  LightProcessedEvent,
} from "@nostr-ts/common";
import { Remote } from "comlink";
import { NClientWorker } from "./worker-types";
import { NClientBase, ProcessedEventKeys } from "./base-types";
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
    view?: string
  ) => Promise<LightProcessedEvent | undefined>;
  getEvents: (params: { limit?: number; offset?: number }) => Promise<void>;
  sendEvent: (events: PublishingRequest) => Promise<void>;
  signAndSendEvent: (event: PublishingRequest) => Promise<string>;

  setMaxEvents: (max: number) => Promise<void>;
  determineApplicableRelays: (request: PublishingRequest) => Promise<{
    relays: WebSocketClientInfo[];
    pow: number;
  }>;
  generateQueueItems: (
    request: PublishingRequest
  ) => Promise<PublishingQueueItem[] | undefined>;
  events: LightProcessedEvent[];
  /**
   * Add event to array or map
   * - In worker, must post message to main thread
   */
  addEvent: (payload: LightProcessedEvent) => void;
  addEvents: (payload: LightProcessedEvent[]) => void;
  /**
   * Update event on array or map
   * - In worker, must post message to main thread
   */
  updateEvent: (payload: LightProcessedEvent) => void;
  updateEvents: (payload: LightProcessedEvent[]) => void;
  getEventById: (
    id: string,
    key?: ProcessedEventKeys
  ) => Promise<Partial<LightProcessedEvent> | undefined>;

  activeView: string;

  setView: (view: string) => void;
  /**
   * Set subscription related to view
   */
  setViewSubscription: (
    view: string,
    filters: NFilters,
    options: {
      reset?: boolean;
      limit: number;
      offset: number;
    }
  ) => Promise<void>;

  /**
   * Remove subscription related to view
   */
  removeViewSubscription: (view: string) => Promise<void>;

  /**
   * Set to disconnect state
   * - Clears all subscriptions
   * - Clears all events
   */
  disconnect: () => Promise<void>;
}
