import { NEvent } from "../classes";
import { EventBase } from "./event";
import { UserBase } from "./user";

export interface EventBaseWithUserBase {
  user?: UserBase;
  event: EventBase;
  // 7
  reactions?: NEvent[];
  reactionsCount?: number;
  // 6
  reposts?: NEvent[];
  repostsCount?: number;
  // 8
  badgeAwards?: NEvent[];
  badgeAwardsCount?: number;
}

export interface NEventWithUserBase extends EventBaseWithUserBase {
  user?: UserBase;
  event: NEvent;
}
