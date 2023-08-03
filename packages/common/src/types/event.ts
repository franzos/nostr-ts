import { NEVENT_KIND } from "./event-kind";

export interface EventBase {
  id?: string;
  pubkey?: string;
  /**
   * Unix timestamp in seconds
   */
  created_at?: number;
  kind?: NEVENT_KIND;
  tags?: string[][];
  content?: string;
  sig?: string;
}
