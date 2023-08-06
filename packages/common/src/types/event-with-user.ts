import { NEvent } from "../classes";
import { EventBase } from "./event";
import { UserBase } from "./user";

export interface EventBaseWithUserBase {
  user?: UserBase;
  event: EventBase;
}

export interface NEventWithUserBase extends EventBaseWithUserBase {
  user?: UserBase;
  event: NEvent;
}
