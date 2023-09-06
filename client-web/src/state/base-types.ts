import {
  Relay,
  ProcessedEvent,
  NUserBase,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  WebSocketClientInfo,
  Subscription,
  PublishingQueueItem,
  RelaysWithIdsOrKeys,
  SubscriptionOptions,
  AuthRequest,
  CloseRequest,
  CountRequest,
  EventsRequest,
  WebSocketEvent,
} from "@nostr-ts/common";
import { NUser } from "@nostr-ts/web";

export interface NClientBase {
  init(config?: { maxEvents?: number }): Promise<void>;
  /**
   * User switch to toggle between connected and disconnected state
   */
  connected: boolean;
  /**
   * Call this to connect
   * - Will load relay info unless you disable it
   * @param relays
   * @param options
   * @returns
   */
  connect: (
    relays?: Relay[],
    options?: {
      autoLoadInfo?: boolean;
    }
  ) => Promise<void>;
  subscribe: (
    payload: CountRequest | AuthRequest | EventsRequest | CloseRequest
  ) => Promise<Subscription[] | undefined>;
  eventsMap?: Map<string, ProcessedEvent>;
  /**
   * Add event to array or map
   * - In worker, must post message to main thread
   */
  addEvent: (payload: ProcessedEvent) => void;
  /**
   * Update event on array or map
   * - In worker, must post message to main thread
   */
  updateEvent: (payload: ProcessedEvent) => void;

  maxEvents: number;
  getUser: (pubkey: string) => Promise<UserRecord | undefined>;
  addUser: (payload: UpdateUserRecord) => Promise<void>;
  updateUser: (payload: UpdateUserRecord) => Promise<void>;
  countUsers: () => Promise<number>;
  /**
   * Process websocket events
   */
  processEvent?: (payload: {
    data:
      | RelayAuth
      | RelayCount
      | RelayEose
      | RelayEvent
      | RelayNotice
      | RelayOK;
    meta: WebSocketClientInfo;
  }) => void;
  getEventById: (id: string) => void;
  followUser(payload: { pubkey: string; relayUrls: string[] }): void;
  unfollowUser(pubkey: string): void;
  followingUser(pubkey: string): Promise<boolean>;
  // For reactive updates
  followingUserIds: string[];
  getAllUsersFollowing(): Promise<
    | {
        user: NUserBase;
        relayUrls: string[];
      }[]
    | undefined
  >;
  updateUserFollowing(payload: {
    user: NUserBase;
    relayUrls?: string[];
  }): Promise<void>;
  requestInformation(
    payload: RelaysWithIdsOrKeys,
    options: SubscriptionOptions
  ): Promise<void>;
}

export interface UpdateUserRecord {
  user: NUserBase;
  relayUrls: string[];
}

export interface UserRecord {
  user: NUser;
  relayUrls: string[];
}

export interface WorkerEvent {
  data: {
    type:
      | "event:new"
      | "event:update"
      | "relay:message"
      | "event:queue:new"
      | "event:queue:update";
    data: ProcessedEvent | WebSocketEvent | PublishingQueueItem;
  };
}
