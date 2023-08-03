import { ExternalIdentityClaim } from "src/classes";
import { NEVENT_KIND } from "./event-kind";
import { UserMetadata } from "./user-metadata";
import { Report } from "./report";

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

export interface iNewShortTextNote {
  text: string;
  subject?: string;
}

interface inResponse {
  /**
   * The event that this is in response to
   */
  inResponseTo: EventBase;
  /**
   * The relay the event originates from
   */
  relayUrl?: string;
}

export interface iNewShortTextNoteResponse extends inResponse {
  text: string;
}

export interface iNewReaction extends inResponse {
  /**
   * Should be '+' or '-'
   */
  text: string;
}

export interface iNewQuoteRepost extends inResponse {}

export interface iNewGenericRepost extends iNewQuoteRepost {}

export interface iNewUpdateUserMetadata {
  claims?: ExternalIdentityClaim[];
  userMetadata?: UserMetadata;
}

export interface iNewRecommendRelay {
  relayUrl: string;
  nonce?: [number, number];
}

export interface iNewReport extends Report {}
