import {
  Relay,
  NEventWithUserBase,
  NUserBase,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  WebSocketClientInfo,
  NEVENT_KIND,
  SubscriptionRequest,
  Subscription,
  PublishingQueueItem,
  RelaysWithIdsOrKeys,
  SubscriptionOptions,
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
  /**
   * Set to disconnect state
   * - Clears all subscriptions
   * - Clears all events
   * @returns
   */
  disconnect: () => void;
  subscribe: (
    payload: SubscriptionRequest
  ) => Promise<Subscription[] | undefined>;
  eventsMap?: Map<string, NEventWithUserBase>;
  /**
   * Add event to array or map
   * - In worker, must post message to main thread
   */
  addEvent: (payload: NEventWithUserBase) => void;
  /**
   * Update event on array or map
   * - In worker, must post message to main thread
   */
  updateEvent: (payload: NEventWithUserBase) => void;

  eventsPublishingQueue: PublishingQueueItem[];

  addQueueItems?: (payload: PublishingQueueItem[]) => void;
  updateQueueItem: (payload: PublishingQueueItem) => void;

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
  hasSubscriptionForEventIds(
    eventIds: string[],
    kinds: NEVENT_KIND[]
  ): Promise<string[] | undefined>;
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
