import { NEVENT_KIND } from "./event-kind";

export interface EventCoordinatesTag {
  kind: NEVENT_KIND;
  pubkey: string;
  identifier: string;
  relay?: string;
}
