import { NEvent } from "../classes/event";
import { NUserBase } from "../classes/user";
import { UserBase } from "./user";

export interface EventWithUser {
  user?: UserBase;
  event: NEvent;
}

export interface EventBaseWithUserBase {
  user?: UserBase;
  event: NEvent;
  eventRelayUrls: string[];
  // 7
  reactions?: EventWithUser[];
  // 6
  reposts?: EventWithUser[];
  // 8
  badgeAwards?: NEvent[];

  // Mentions and replies
  mentions?: NUserBase[];

  // Mentions and replies
  replies?: EventWithUser[];

  // TODO: Implement
  // In Response to
  // inResponseTo?: EventWithUser[];

  lightningReceipts?: EventWithUser[];
}

export interface NEventWithUserBase extends EventBaseWithUserBase {
  user?: UserBase;
  event: NEvent;
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
