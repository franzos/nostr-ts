import { NEvent } from "../classes/event";
import { NUserBase } from "../classes/user";
import { UserBase } from "./user";

export interface ProcessedUserBase {
  user?: UserBase;
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
export interface ProcessedEvent extends ProcessedEventBase {
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
  replies?: ProcessedEventBase[];

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
