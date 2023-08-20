import {
  Relay,
  ClientSubscription,
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
  Subscribe,
} from "@nostr-ts/common";
import { NUser } from "@nostr-ts/web";
import { PublishingEventsQueueItem } from "./publishing-qeue";

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
  subscribe: (payload: Subscribe) => Promise<ClientSubscription[] | undefined>;
  getSubscriptions: () => Promise<ClientSubscription[]>;
  eventsMap?: Map<string, NEventWithUserBase>;

  eventsPublishingQueue: PublishingEventsQueueItem[];

  maxEvents: number;
  getUser: (pubkey: string) => Promise<NUser | undefined>;
  addUser: (user: NUserBase) => Promise<void>;
  updateUser: (user: NUserBase) => Promise<void>;
  countUsers: () => Promise<number>;
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
  getEventById: (id: string) => void;
  followUser(pubkey: string): void;
  unfollowUser(pubkey: string): void;
  followingUser(pubkey: string): Promise<boolean>;
  // For reactive updates
  followingUserIds: string[];
  getAllUsersFollowing(): Promise<NUserBase[] | undefined>;
  updateUserFollowing(user: NUserBase): Promise<void>;
  hasSubscriptionForEventIds(
    eventIds: string[],
    kinds: NEVENT_KIND[]
  ): Promise<string[] | undefined>;
  requestInformation(
    source: "events" | "users",
    idsOrKeys: string[],
    options?: {
      timeout?: number;
    }
  ): Promise<void>;
}
