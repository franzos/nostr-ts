import {
  Relay,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  WebSocketClientInfo,
  Subscription,
  SubscriptionOptions,
  AuthRequest,
  CloseRequest,
  CountRequest,
  EventsRequest,
  ProcessedUserBase,
  UserRecord,
  UserPublicKeyAndRelays,
  LightProcessedEvent,
  EventBaseSigned,
} from "@nostr-ts/common";

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
    relays: Relay[],
    options?: {
      autoLoadInfo?: boolean;
    }
  ) => Promise<void>;
  subscribe: (
    payload: CountRequest | AuthRequest | EventsRequest | CloseRequest
  ) => Promise<Subscription[] | undefined>;

  maxEvents: number;
  getUser: (pubkey: string) => Promise<UserRecord | undefined>;
  addUser: (payload: ProcessedUserBase) => Promise<void>;
  updateUser: (pubkey: string, payload: ProcessedUserBase) => Promise<void>;
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

  getPopularUsers: () => Promise<UserRecord[] | undefined>;
  getPopularEvents: () => Promise<LightProcessedEvent[] | undefined>;
  calculatePopular: () => Promise<void>;

  followUser(payload: UserPublicKeyAndRelays): Promise<void>;
  unfollowUser(pubkey: string): Promise<void>;
  followingUser(pubkey: string): Promise<boolean>;
  // For reactive updates
  followingUserIds: string[];
  getAllUsersFollowing(): Promise<UserRecord[] | undefined>;
  unfollowUser(pubkey: string): Promise<void>;
  blockUser(payload: UserPublicKeyAndRelays): void;
  unblockUser(pubkey: string): Promise<void>;
  getAllUsersBlocked(): Promise<UserRecord[] | undefined>;
  lastContactsUpdate(pubkey: string): Promise<number | undefined>;
  createList(payload: CreateListRecord): Promise<void>;
  updateList(id: string, payload: CreateListRecord): Promise<void>;
  deleteList(id: string): Promise<void>;
  getAllLists(): Promise<ProcessedListRecord[] | undefined>;
  getList(id: string): Promise<ProcessedListRecord | undefined>;
  getListsWithUser(pubkey: string): Promise<ListRecord[] | undefined>;
  addUserToList(id: string, pubkey: string): Promise<void>;
  removeUserFromList(id: string, pubkey: string): Promise<void>;
  requestInformation(
    payload: {
      source: "users" | "events" | "events:related";
      idsOrKeys: string[];
    },
    options: SubscriptionOptions
  ): Promise<void>;
}

export interface CreateListRecord {
  title: string;
  description?: string;
  tags?: string[];
  userPubkeys?: string[];
}

export interface ListRecord extends CreateListRecord {
  id: string;
}

export interface ProcessedListRecord extends ListRecord {
  users?: UserRecord[];
}

export type ProcessedEventKeys =
  | "reactions"
  | "replies"
  | "mentions"
  | "reposts"
  | "badgeAwards"
  | "zapReceipt";
