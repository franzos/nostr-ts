import { NEvent } from "../classes";
import { EventBase } from "./event";
import { UserBase } from "./user";

export interface EventBaseWithUserBase {
  user?: UserBase;
  event: EventBase;
  eventRelayIds: string[];
  // 7
  reactions?: NEvent[];
  reactionsCount?: number;
  // 6
  reposts?: NEvent[];
  repostsCount?: number;
  // 8
  badgeAwards?: NEvent[];
  badgeAwardsCount?: number;

  mentions?: UserBase[];
}

export interface NEventWithUserBase extends EventBaseWithUserBase {
  user?: UserBase;
  event: NEvent;
}

export interface idOrKey {
  source: "events" | "users";
  idOrKey: string;
}

export interface idOrKeyWithRelayIds {
  source: "events" | "users";
  idOrKey: string;
  relayIds: string[];
}

export interface RelaysWithIdsOrKeys {
  source: "events" | "users";
  relayId: string;
  idsOrKeys: string[];
}
