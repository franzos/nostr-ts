import { NNIP } from "src/types/nips";
import { EventBase, NEVENT_KIND, UserMetadata } from "../types";
import {
  hash,
  sign,
  serializeEvent,
  isValidProviderName,
  isValidWebSocketUrl,
  createUserMetadataString,
  eventHasExpiration,
  eventHasNonce,
  eventHasSubject,
  subjectIsRespone,
  makeSubjectResponse,
  eventHasContentWarning,
} from "../utils";
import {
  eventHasExternalIdentityClaim,
  ExternalIdentityClaim,
} from "./identity-claim";

export class NEvent implements EventBase {
  /**
   * Hex string of event hash
   */
  id: string;
  pubkey: string;
  /**
   * Unix timestamp in seconds
   */
  created_at: number;
  kind: NEVENT_KIND | number;
  tags: string[][] | undefined;
  content: string;
  sig: string;

  constructor(data: EventBase) {
    this.id = data.id ? data.id : "";
    this.pubkey = data.pubkey ? data.pubkey : "";
    this.created_at = data.created_at
      ? data.created_at
      : Math.floor(Date.now() / 1000);
    this.kind = data.kind != null ? data.kind : NEVENT_KIND.SHORT_TEXT_NOTE;
    this.tags = data.tags && data.tags.length > 0 ? data.tags : [];
    this.content = data.content;
    this.sig = data.sig ? data.sig : "";
  }

  /**
   * 1. Sign the event (event.sig)
   * 2. Generate the event ID (event.id)
   * @param privateKey
   */
  public signAndGenerateId(keyPair: { priv: string; pub: string }) {
    this.pubkey = keyPair.pub;
    const serial = serializeEvent(this.toJson());
    this.id = hash(serial);
    this.sig = sign(this.id, keyPair.priv);
  }

  public toJson() {
    return JSON.parse(JSON.stringify(this));
  }

  public addTag(val: string[]) {
    if (!this.tags) {
      this.tags = [];
    }
    this.tags.push(val);
  }

  public removeTag(val: string[]) {
    if (!this.tags) {
      return;
    }
    this.tags = this.tags.filter((t) => t[0] !== val[0] && t[1] !== val[1]);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   * @param eventId
   * @param relayUrl
   */
  public addEventTag(eventId: string, relayUrl?: string) {
    const tag = ["e", eventId];
    if (relayUrl) {
      tag[1] = `${tag[1]}, ${relayUrl}`;
    }
    this.addTag(tag);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   * https://github.com/nostr-protocol/nips/blob/master/01.md
   * @param pubkey
   * @param relayUrl
   */
  public addPublicKeyTag(pubkey: string, relayUrl?: string) {
    const tag = ["p", pubkey];
    if (relayUrl) {
      tag[1] = `${tag[1]}, ${relayUrl}`;
    }
    this.addTag(tag);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   * https://github.com/nostr-protocol/nips/blob/master/40.md
   * @param expiration UNIX timestamp in seconds
   */
  public addExpirationTag(expiration: number) {
    if (this.hasExpirationTag()) {
      throw new Error("Event already has an expiration.");
    }
    this.addTag(["expiration", expiration.toString()]);
  }

  /**
   * Check if event has expiration tag
   */
  public hasExpirationTag() {
    return eventHasExpiration(this);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   * https://github.com/nostr-protocol/nips/blob/master/14.md
   * @param subject
   */
  public addSubjectTag(subject: string) {
    if (this.kind !== NEVENT_KIND.SHORT_TEXT_NOTE) {
      throw new Error(`Event kind ${this.kind} should not have a subject.`);
    }
    if (this.hasSubjectTag()) {
      throw new Error("Event already has a subject.");
    }
    this.addTag(["subject", subject]);
  }

  /**
   * Check if event has a subject
   * This is primarily for events of kind 1
   */
  public hasSubjectTag() {
    if (this.kind !== NEVENT_KIND.SHORT_TEXT_NOTE) {
      console.log(`Event kind ${this.kind} should not have a subject.`);
    }
    return eventHasSubject(this);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   * https://github.com/nostr-protocol/nips/blob/master/13.md
   */
  public addNonceTag(nonce: number[]) {
    if (this.hasNonceTag()) {
      throw new Error("Event already has a nonce.");
    }
    this.addTag(["nonce", nonce.toString()]);
  }

  /**
   * Check if event has a nonce
   */
  public hasNonceTag() {
    return eventHasNonce(this);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   * https://github.com/nostr-protocol/nips/blob/master/36.md
   */
  public addContentWarningTag(reason?: string) {
    if (this.hasContentWarningTag()) {
      throw new Error("Event already has a content warning.");
    }
    this.addTag(["content-warning", reason ? reason : ""]);
  }

  /**
   * Check if event has a content warning
   */
  public hasContentWarningTag() {
    return eventHasContentWarning(this);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   * https://github.com/nostr-protocol/nips/blob/master/39.md
   * @param claim
   */
  public addExternalIdentityClaimTag(claim: ExternalIdentityClaim) {
    this.addTag(claim.toTag());
  }

  /**
   * Check if event has external identity claim
   */
  public hasExternalIdentityClaimTag() {
    return eventHasExternalIdentityClaim(this);
  }

  public determineRequiredNIP(): NNIP[] {
    const nips = [];
    if (this.hasNonceTag()) {
      nips.push(NNIP.NIP_13);
    }
    if (this.hasExpirationTag()) {
      nips.push(NNIP.NIP_40);
    }
    if (this.hasExternalIdentityClaimTag()) {
      nips.push(NNIP.NIP_39);
    }

    return nips;
  }

  /**
   * Real basic check to make sure the event is signed and ready to go.
   */
  public isReadyToPublish(): {
    isReady: boolean;
    reason?: string;
  } {
    if (this.id === "") {
      return {
        isReady: false,
        reason: "Event has no ID.",
      };
    }
    if (this.pubkey === "") {
      return {
        isReady: false,
        reason: "Event has no pubkey.",
      };
    }
    if (this.content === "") {
      return {
        isReady: false,
        reason: "Event has no content.",
      };
    }
    if (this.sig === "") {
      return {
        isReady: false,
        reason: "Event has no signature.",
      };
    }
  }
}

/**
 * Generate a short text note
 */
export function NewShortTextNote(text: string, subject?: string) {
  const newEvent = new NEvent({
    content: text,
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
  });
  if (subject) {
    newEvent.addSubjectTag(subject);
  }
  return newEvent;
}

/**
 * Generate a response to a short text note
 * - Subjects are considered
 *
 * https://github.com/nostr-protocol/nips/blob/master/14.md
 */
export function NewShortTextNoteResponse(
  text: string,
  respondingToEvent: EventBase,
  relayUrl?: string
): NEvent {
  const newEvent = new NEvent({
    content: text,
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
  });

  // Append subject
  const inResponseToEvent = new NEvent(respondingToEvent);
  if (inResponseToEvent.kind !== NEVENT_KIND.SHORT_TEXT_NOTE) {
    throw new Error("Event you are responding to be SHORT_TEXT_NOTE");
  }
  const subject = inResponseToEvent.hasSubjectTag();
  if (subject) {
    const isResponse = subjectIsRespone(subject);
    if (isResponse) {
      newEvent.addSubjectTag(subject);
    } else {
      newEvent.addSubjectTag(makeSubjectResponse(subject));
    }
  } else {
    console.log("Event you are responding to does not have a subject.");
  }

  // Append tags
  newEvent.addEventTag(inResponseToEvent.id, relayUrl);
  newEvent.addPublicKeyTag(inResponseToEvent.pubkey, relayUrl);

  return newEvent;
}

/**
 * Reaction
 *
 * > A reaction with content set to - SHOULD be interpreted as a "dislike" or "downvote".
 * > It SHOULD NOT be counted as a "like", and MAY be displayed as a downvote or dislike on a post.
 *
 * https://github.com/nostr-protocol/nips/blob/master/25.md#reactions
 * @param reaction either '+' or '-'
 * @param event event to react to
 * @returns
 */
export function NewReaction(
  reaction: "+" | "-",
  event: {
    id: string;
    pubkey: string;
  }
) {
  return new NEvent({
    content: reaction,
    kind: NEVENT_KIND.REACTION,
    tags: [
      ["e", event.id],
      ["p", event.pubkey],
    ],
  });
}

// TODO: Support custom reactions https://github.com/nostr-protocol/nips/blob/master/25.md#custom-emoji-reaction

/**
 * Repost of notes (kind 1)
 *
 * Basically like a RE-TWEET
 *
 * @param relay relay URL where to find the event
 * @param event event to repost
 * @returns
 */
export function NewQuoteRepost(relay: string, event: EventBase) {
  return new NEvent({
    content: JSON.stringify({
      ...event,
      relay: relay,
    }),
    kind: NEVENT_KIND.REPOST,
    tags: [
      ["e", event.id],
      ["p", event.pubkey],
    ],
  });
}

/**
 * Repost of any event except notes (1)
 * @param relay relay URL where to find the event
 * @param event event to repost
 * @returns
 */
export function NewGenericRepost(relay: string, event: EventBase) {
  return new NEvent({
    content: JSON.stringify({
      ...event,
      relay,
    }),
    kind: NEVENT_KIND.GENERIC_REPOST,
    tags: [
      ["e", event.id],
      ["p", event.pubkey],
      ["k", event.kind.toString()],
    ],
  });
}

/**
 * Update user profile
 *
 * Basic Event Kinds
 * https://github.com/nostr-protocol/nips/blob/master/01.md#basic-event-kinds
 *
 * External Identities in Profiles
 * https://github.com/nostr-protocol/nips/blob/master/39.md
 */
export function NewUpdateUserMetadata(options: {
  claims?: ExternalIdentityClaim[];
  userMetadata?: UserMetadata;
}) {
  const newEvent = new NEvent({
    content: createUserMetadataString(options.userMetadata),
    kind: NEVENT_KIND.METADATA,
    tags: [],
  });
  if (options.claims) {
    for (const claim of options.claims) {
      const isValid = isValidProviderName(claim.identity);
      if (isValid) {
        const tag = claim.toTag();
        if (tag) {
          newEvent.addTag(tag);
        }
      } else {
        console.log("Invalid provider name", claim.identity);
      }
    }
  }
  return newEvent;
}

/**
 * Recomment server / relay
 *
 * Basic Event Kinds
 * https://github.com/nostr-protocol/nips/blob/master/01.md#basic-event-kinds
 * @param server
 * @returns NewEvent
 */
export function NewRecommendRelay(options: {
  server: string;
  nonce?: string[];
}) {
  if (!isValidWebSocketUrl(options.server)) {
    throw new Error("Invalid server URL");
  }
  const newEvent = new NEvent({
    content: options.server,
    kind: NEVENT_KIND.RECOMMEND_RELAY,
  });
  if (options.nonce) {
    newEvent.addTag(["nonce", ...options.nonce]);
  }
}
