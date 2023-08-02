import { EVENT_KIND } from "./event-kind";

export interface Event {
  id?: string;
  pubkey?: string;
  /**
   * Unix timestamp in seconds
   */
  created_at?: number;
  kind?: EVENT_KIND;
  tags?: string[][];
  content?: string;
  sig?: string;
}
