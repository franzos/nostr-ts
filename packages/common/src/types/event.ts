import { ExternalIdentityClaim } from "../classes/identity-claim";
import { NEVENT_KIND } from "./event-kind";
import { UserMetadata } from "./user-metadata";
import { EventReport } from "./report";
import { NEventContact } from "./event-contacts";
import { EventEventTag } from "./event-event-tag";
import { EventCoordinatesTag } from "./event-coordinates-tag";

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

export interface EventBaseSigned extends EventBase {
  id: string;
  pubkey: string;
  created_at: number;
  kind: NEVENT_KIND;
  content: string;
  sig: string;
}

export interface iNewShortTextNote {
  text: string;
  subject?: string;
}

export interface iNewLongFormContent {
  text: string;
  isDraft?: boolean;
  // d identifier to make it replaceable
  identifier?: string;
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
  mastodonUrl?: string;
}

export interface iNewRecommendRelay {
  relayUrl: string;
  nonce?: [number, number];
}

export interface iNewReport extends EventReport {}

export interface iNewUserZapRequest {
  /**
   * is a list of relays the recipient's wallet should publish its zap receipt
   */
  relayUrls: string[];

  /**
   * is the amount in millisats the sender intends to pay, formatted as a string.
   * This is recommended, but optional.
   */
  amount: number;
}

export interface iNewZAPRequest extends iNewUserZapRequest {
  /**
   * hex-encoded pubkey of the recipient.
   */
  recipientPubkey: string;

  /**
   * is an optional hex-encoded event id.
   * Clients MUST include this if zapping an event rather than a person.
   */
  eventId?: string;

  /**
   * the lnurl pay url of the recipient, encoded using bech32 with the prefix lnurl.
   * This is recommended, but optional.
   */
  lnurl: string;
}

export interface iNewZAPReceipt {
  /**
   * bolt11 tag containing the description hash bolt11 invoice.
   * - Get invoice from nuser.makeZapRequest(...)
   */
  bolt11: string;

  /**
   * JSON-encoded invoice description
   */
  description: string;

  /**
   * MAY contain a preimage tag to match against the payment hash of the bolt11 invoice. This isn't really a payment proof, there is no real way to prove that the invoice is real or has been paid.
   * You are trusting the author of the zap receipt for the legitimacy of the payment.
   */
  preimage?: string;

  /**
   * used to get
   * - createdAt
   * - recipientPubkey
   */
  zapRequest?: EventBase;
}

export interface iNewEventDeletion {
  text: string;
  events: EventBase[];

  /**
   * Use 'a' instead of 'e' tag
   */
  useEventCoordinatesTags?: boolean;
  /**
   * Use with useEventCoordinatesTags
   */
  relayUrl?: string;
}

export interface iNewAuthEvent {
  relayUrl: string;
  challenge: string;
}

export interface iNewEncryptedPrivateMessage {
  text: string;
  recipientPubkey: string;
}

export interface iNewContactList {
  contacts: NEventContact[];
}

/**
 * NIP-32: Label event (kind 1985)
 * https://github.com/nostr-protocol/nips/blob/master/32.md
 */
export interface iNewLabel {
  /**
   * Labels to apply. Each label has a value and a namespace.
   * The namespace becomes an "L" tag, the value+namespace becomes an "l" tag.
   */
  labels: Array<{ value: string; namespace: string }>;

  /**
   * Content for longer label descriptions (optional)
   */
  content?: string;

  // Target tags — at least one target is required

  /** Event IDs to label */
  eventTags?: EventEventTag[];
  /** Pubkeys to label */
  pubkeys?: Array<{ pubkey: string; relayUrl?: string }>;
  /** Addressable event coordinates to label */
  eventCoordinates?: EventCoordinatesTag[];
  /** URLs or relay URLs to label */
  urls?: string[];
  /** Topics to label */
  topics?: string[];
}
