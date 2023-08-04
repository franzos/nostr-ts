import { NNIP } from "../types/nips";
import {
  EventBase,
  NEVENT_KIND,
  iNewGenericRepost,
  iNewQuoteRepost,
  iNewReaction,
  iNewRecommendRelay,
  iNewReport,
  iNewShortTextNote,
  iNewShortTextNoteResponse,
  iNewUpdateUserMetadata,
  Report,
  NEventContent,
  iNewLongFormContent,
} from "../types";
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
  eventHasReport,
  generateReportTags,
  createEventContent,
  extractEventContent,
  isValidEventContent,
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

  /**
   * Mention one or more users in the event content
   * this will merge the mentions with any existing content
   */
  public mentionUsers(publicKeys: string[]) {
    const extracted = this.extractContent();
    if (!extracted) {
      this.content = createEventContent({
        message: this.content,
        publicKeys,
      });
    } else {
      throw new Error("Already has motified content");
    }
  }

  /**
   * Check if any user has been mentioned in the event content
   * @returns
   */
  public hasMentions(): string[] | undefined {
    const extracted = this.extractContent();
    if (
      !extracted ||
      !extracted.publicKeys ||
      extracted.publicKeys.length < 1
    ) {
      return;
    }
    return extracted.publicKeys;
  }

  /**
   * Extract all (if any) information from the event content
   * @returns
   */
  public extractContent(): NEventContent | undefined {
    return extractEventContent(this.content);
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
   * https://github.com/nostr-protocol/nips/blob/master/18.md
   */
  public addKindTag(kind: NEVENT_KIND) {
    this.addTag(["k", kind.toString()]);
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

  /**
   * Standard tag
   * @param report
   */
  public addReportTags(report: Report) {
    if (this.kind !== NEVENT_KIND.REPORTING) {
      throw new Error(
        `Event kind ${this.kind} should not have a report. Expected ${NEVENT_KIND.REPORTING}.`
      );
    }
    if (this.hasReportTags()) {
      throw new Error("Event already has report tags.");
    }
    const tags = generateReportTags(report);
    tags.forEach((t) => this.addTag(t));
  }

  public hasReportTags() {
    return eventHasReport(this);
  }

  public determineRequiredNIP(): NNIP[] {
    const nips = [];
    if (this.hasNonceTag()) {
      nips.push(NNIP.NIP_13);
    }
    if (this.hasExternalIdentityClaimTag()) {
      nips.push(NNIP.NIP_39);
    }
    if (this.hasExpirationTag()) {
      nips.push(NNIP.NIP_40);
    }
    // It doesn't seem any relay specifically supports this
    // if (this.hasReportTags()) {
    //   nips.push(NNIP.NIP_56);
    // }

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
    if (!isValidEventContent(this.content)) {
      return {
        isReady: false,
        reason: "Event has invalid content.",
      };
    }
    if (this.sig === "") {
      return {
        isReady: false,
        reason: "Event has no signature.",
      };
    }
  }

  public isReadyToPublishOrThrow() {
    const check = this.isReadyToPublish();
    if (!check.isReady) {
      throw new Error(check.reason);
    }
  }
}

/**
 * Generate a short text note
 */
export function NewShortTextNote(opts: iNewShortTextNote) {
  const newEvent = new NEvent({
    content: opts.text,
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
  });
  if (opts.subject) {
    newEvent.addSubjectTag(opts.subject);
  }
  return newEvent;
}

/**
 * Generate a long form content
 * Basically a longer short text note
 *
 * https://github.com/nostr-protocol/nips/blob/master/23.md
 * @param opts
 * @returns
 */
export function NewLongFormContent(opts: iNewLongFormContent) {
  const newEvent = new NEvent({
    content: opts.text,
    kind: opts.isDraft
      ? NEVENT_KIND.DRAFT_LONG_FORM_CONTENT
      : NEVENT_KIND.LONG_FORM_CONTENT,
  });
  if (opts.identifier) {
    newEvent.addEventTag(opts.identifier);
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
  opts: iNewShortTextNoteResponse
): NEvent {
  const newEvent = new NEvent({
    content: opts.text,
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
  });

  // Append subject
  const inResponseToEvent = new NEvent(opts.inResponseTo);
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
  newEvent.addEventTag(inResponseToEvent.id, opts.relayUrl);
  newEvent.addPublicKeyTag(inResponseToEvent.pubkey, opts.relayUrl);

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
export function NewReaction(opts: iNewReaction) {
  if (opts.text !== "+" && opts.text !== "-") {
    throw new Error("Reaction must be either '+' or '-'");
  }
  const nEv = new NEvent({
    content: opts.text,
    kind: NEVENT_KIND.REACTION,
    tags: [],
  });

  nEv.addEventTag(opts.inResponseTo.id, opts.relayUrl);
  nEv.addPublicKeyTag(opts.inResponseTo.pubkey, opts.relayUrl);

  return nEv;
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
export function NewQuoteRepost(opts: iNewQuoteRepost) {
  const nEv = new NEvent({
    content: JSON.stringify({
      ...event,
      relay: opts.relayUrl,
    }),
    kind: NEVENT_KIND.REPOST,
    tags: [
      // ["e", opts.inResponseTo.id],
      // ["p", opts.inResponseTo.pubkey],
    ],
  });

  nEv.addEventTag(opts.inResponseTo.id, opts.relayUrl);
  nEv.addPublicKeyTag(opts.inResponseTo.pubkey, opts.relayUrl);

  return nEv;
}

/**
 * Repost of any event except notes (1)
 * @param relay relay URL where to find the event
 * @param event event to repost
 * @returns
 */
export function NewGenericRepost(opts: iNewGenericRepost) {
  const nEv = new NEvent({
    content: JSON.stringify({
      ...opts.inResponseTo,
      relay: opts.relayUrl,
    }),
    kind: NEVENT_KIND.GENERIC_REPOST,
    // tags: [
    //   ["e", opts.inResponseTo.id],
    //   ["p", opts.inResponseTo.pubkey],
    //   ["k", opts.inResponseTo.kind.toString()],
    // ],
  });

  nEv.addEventTag(opts.inResponseTo.id, opts.relayUrl);
  nEv.addPublicKeyTag(opts.inResponseTo.pubkey, opts.relayUrl);
  nEv.addKindTag(opts.inResponseTo.kind);

  return nEv;
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
export function NewUpdateUserMetadata(opts: iNewUpdateUserMetadata) {
  const nEv = new NEvent({
    content: createUserMetadataString(opts.userMetadata),
    kind: NEVENT_KIND.METADATA,
    tags: [],
  });
  if (opts.claims) {
    for (const claim of opts.claims) {
      const isValid = isValidProviderName(claim.identity);
      if (isValid) {
        nEv.addExternalIdentityClaimTag(claim);
      } else {
        console.log("Invalid provider name", claim.identity);
      }
    }
  }

  return nEv;
}

/**
 * Recomment server / relay
 *
 * Basic Event Kinds
 * https://github.com/nostr-protocol/nips/blob/master/01.md#basic-event-kinds
 * @param server
 * @returns NewEvent
 */
export function NewRecommendRelay(opts: iNewRecommendRelay) {
  if (!isValidWebSocketUrl(opts.relayUrl)) {
    throw new Error("Invalid server URL");
  }
  const nEv = new NEvent({
    content: opts.relayUrl,
    kind: NEVENT_KIND.RECOMMEND_RELAY,
  });
  if (opts.nonce) {
    nEv.addNonceTag(opts.nonce);
  }

  return nEv;
}

export function NewReport(opts: iNewReport) {
  const nEv = new NEvent({
    content: opts.content || "",
    kind: NEVENT_KIND.REPORTING,
  });
  nEv.addReportTags(opts);
  return nEv;
}
