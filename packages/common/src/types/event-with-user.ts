import { NEvent } from "../classes/event";
import { NUserBase } from "../classes/user";
import { UserBase } from "./user";

export interface UserPublicKeyAndRelays {
  pubkey: string;
  relayUrls: string[];
}

export interface ProcessedUserBase {
  user?: UserBase;
  relayUrls?: string[];
  /**
   * User is blocked
   */
  isBlocked?: boolean;
  /**
   * Unix time in seconds
   * - undefined = not muted
   * - 0 = muted forever
   */
  isMutedUntil?: number | undefined;
  /**
   * True if we're following the user
   * - undefined / false = not following
   */
  following?: boolean;
  /**
   * Tags
   */
  tags?: string[];
}

export interface UserRecord extends ProcessedUserBase {
  user: NUserBase;
  relayUrls: string[];
}

/**
 * Processed-side event properties
 * - user: Author of the event
 * - event: The event
 */
export interface ProcessedEventBase {
  user?: UserBase;
  event: NEvent;
}

export interface ProcessedEventWithReactionsAndReplies
  extends ProcessedEventBase {
  reactions?: ProcessedEventBase[];
  replies?: ProcessedEventWithReactionsAndReplies[];
}

/**
 * Processed-side event properties
 * - user: Author of the event
 * - event: The event
 * - eventRelayUrls: The relayUrl(s) the event was received from
 * - reactions: Reactions to the event
 * - reposts: Reposts of the event
 * - badgeAwards: Badge awards for the event
 * - mentions: Mentions of the event
 * - replies: Replies to the event
 * - zapReceipt: Lightning receipts for the event
 */
export interface ProcessedEvent extends ProcessedEventWithReactionsAndReplies {
  eventRelayUrls: string[];

  /**
   * Kind 7
   */
  reactions?: ProcessedEventBase[];

  /**
   * Kind 6
   */
  reposts?: ProcessedEventBase[];

  /**
   * Kind 8
   */
  badgeAwards?: ProcessedEventBase[];

  /**
   * Kind 1, 2, ..
   */
  replies?: ProcessedEventWithReactionsAndReplies[];

  /**
   * from event content
   */
  mentions?: NUserBase[];

  /**
   * Kind 9735
   */
  zapReceipt?: ProcessedEventBase[];
}

export interface idOrKey {
  source: "events" | "events:related" | "users";
  idOrKey: string;
}

export interface idOrKeyWithrelayUrls {
  source: "events" | "events:related" | "users";
  idOrKey: string;
  relayUrls: string[];
}

export interface RelaysWithIdsOrKeys {
  source: "events" | "events:related" | "users";
  relayUrl: string;
  idsOrKeys: string[];
}
