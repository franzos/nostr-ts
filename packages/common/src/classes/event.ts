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
  iNewZAPRequest,
  iNewZAPReceipt,
  iNewEventDeletion,
  EventCoordinatesTag,
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
  makeLnurlZapRequestUrl,
  eventHasPublicKeyTags,
  eventHasEventCoordinatesTags,
  eventHasRelaysTag,
  makeZapReceiptDescription,
  eventHasIdentifierTags,
  makeEventIdentifierTag,
  makeEventLnurlTag,
  eventHasLnurlTags,
  makeEventAmountTag,
  eventHasAmountTags,
  makeEventCoordinatesTag,
  countLeadingZeroes,
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

  public generateId() {
    if (this.pubkey === "") {
      throw new Error("Cannot generate event ID without a public key");
    }
    const serial = serializeEvent(this.ToObj());
    this.id = hash(serial);
  }

  public sign(keyPair: { privateKey: string; publicKey: string }) {
    this.pubkey = keyPair.publicKey;
    this.sig = sign(this.id, keyPair.privateKey);
  }

  /**
   * 1. Sign the event (event.sig)
   * 2. Generate the event ID (event.id)
   * @param privateKey
   */
  public signAndGenerateId(keyPair: { privateKey: string; publicKey: string }) {
    this.sign(keyPair);
    this.generateId();
  }

  public ToObj(): any {
    const cleanObject = {};
    for (const [key, value] of Object.entries(this)) {
      if (value !== undefined) {
        cleanObject[key] = value;
      }
    }
    return cleanObject;
  }

  public toURI() {
    return encodeURI(JSON.stringify(this.ToObj()));
  }

  /**
   *
   * @param difficulty bits required for proof of work
   */
  public proofOfWork(targetDifficulty: number) {
    let adjustmentValue = 0;

    while (true) {
      this.replaceNonceTag([targetDifficulty, adjustmentValue]);
      this.generateId();
      const leadingZeroes = countLeadingZeroes(this.id);

      if (leadingZeroes >= targetDifficulty) {
        console.log("Proof of work complete");
        break;
      }

      adjustmentValue++;
    }
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
   * Use this for form elements, otherwise it's too laggy
   * @param content
   * @returns
   */
  public setContentWithoutChecks(content: string) {
    this.content = content;
    return this;
  }

  /**
   * Extract all (if any) information from the event content
   * @returns
   */
  public extractContent(): NEventContent | undefined {
    return extractEventContent(this.content, this.kind);
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

  public hasEventTags():
    | {
        eventId: string;
        relayUrl?: string;
      }[]
    | undefined {
    const tags = this.tags.filter((tag) => tag[0] === "e");
    if (tags.length === 0) {
      return;
    }

    return tags.map((tag) => {
      const parts = tag[1].split(",");
      const eventId = parts[0].trim();
      const relayUrl = parts[1] ? parts[1].trim() : undefined;
      return {
        eventId,
        relayUrl,
      };
    });
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

  public hasPublicKeyTags(): [string][] | [string, string][] | undefined {
    return eventHasPublicKeyTags(this);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   */
  public addRelaysTag(relays: string[]) {
    const relayTags = this.tags.filter((tag) => tag[0] === "relays");
    if (relayTags.length === 0) {
      this.tags.push(["relays", ...relays]);
    } else {
      for (const tag of relayTags) {
        tag.splice(1, 0, ...relays);
      }
    }
  }

  public hasRelaysTag(): string[] | undefined {
    return eventHasRelaysTag(this);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   */
  public addEventCoordinatesTag(opts: EventCoordinatesTag) {
    this.addTag(makeEventCoordinatesTag(opts));
  }

  public hasEventCoordinatesTags(): EventCoordinatesTag[] | undefined {
    return eventHasEventCoordinatesTags(this);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   */
  public addIdentifierTag(identifier: string) {
    this.addTag(makeEventIdentifierTag(identifier));
  }

  public hasIdentifierTags() {
    return eventHasIdentifierTags(this);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   */
  public addLnurlTag(lnurl: string) {
    this.addTag(makeEventLnurlTag(lnurl));
  }

  public hasLnurlTags() {
    return eventHasLnurlTags(this);
  }

  /**
   * Standard tag
   * https://github.com/nostr-protocol/nips/blob/master/README.md#standardized-tags
   *
   * @param amount millisats
   */
  public addAmountTag(amount: string) {
    this.addTag(makeEventAmountTag(amount));
  }

  public hasAmountTags() {
    return eventHasAmountTags(this);
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
    if (nonce.length !== 2) {
      throw new Error(
        "Nonce must be an array of 2 numbers: [miningResult, difficulty]"
      );
    }
    const miningResult = nonce[0].toString();
    const difficulty = nonce[1].toString();

    this.addTag(["nonce", miningResult, difficulty]);
  }

  /**
   * Check if event has a nonce
   */
  public hasNonceTag() {
    return eventHasNonce(this);
  }

  /**
   * For easy replacement during proof of work
   * @param nonce
   */
  public replaceNonceTag(nonce: number[]) {
    const hasTag = this.hasNonceTag();
    if (hasTag) {
      this.tags = this.tags.filter((tag) => tag[0] !== "nonce");
    }
    this.addNonceTag(nonce);
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

  public newZapReceipt(opts: iNewZAPReceipt) {
    if (this.kind !== NEVENT_KIND.ZAP_REQUEST) {
      throw new Error(
        `Event kind ${this.kind} should not have a zap receipt. Expected ${NEVENT_KIND.ZAP_REQUEST}.`
      );
    }
    return NewZapReceipt({
      bolt11: opts.bolt11,
      description: opts.description,
      preimage: opts.preimage,
      zapRequest: this,
    });
  }

  public determineRequiredNIP(): NNIP[] {
    const nips = [];

    // TODO: Seems this is not usually published
    // if (this.hasNonceTag()) {
    //   nips.push(NNIP.NIP_13);
    // }

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
    if (this.sig === "") {
      return {
        isReady: false,
        reason: "Event has no signature.",
      };
    }
    const contentReport = isValidEventContent(this.content, this.kind);
    if (!contentReport.isValid) {
      return {
        isReady: false,
        reason: contentReport.error,
      };
    }

    return {
      isReady: true,
    };
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
      ...opts.inResponseTo,
      relay: opts.relayUrl,
    }),
    kind: NEVENT_KIND.REPOST,
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

  if (opts.mastodonUrl) {
    nEv.addTag(["mostr", opts.mastodonUrl]);
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

/**
 * Zap request
 *
 * A zap request is an event of kind 9734 that is not published to relays,
 * but is instead sent to a recipient's lnurl pay callback url.
 * This event's content MAY be an optional message to send along with the payment.
 *
 * https://github.com/nostr-protocol/nips/blob/master/57.md
 * @param opts
 * @returns
 */
export function NewZapRequest(opts: iNewZAPRequest) {
  const nEv = new NEvent({
    content: "",
    kind: NEVENT_KIND.ZAP_REQUEST,
  });

  nEv.addRelaysTag(opts.relayUrls);
  nEv.addAmountTag(opts.amount.toString());
  nEv.addLnurlTag(opts.lnurl);
  nEv.addPublicKeyTag(opts.recipientPubkey);

  if (opts.eventId) {
    nEv.addEventTag(opts.eventId);
  }
  return nEv;
}

/**
 * Signed Zap request
 *
 * This does exactly what NewZapRequest does, but also takes care of signing and returns a zap request url
 * @param opts
 * @param callbackUrl
 * @param keypair
 * @returns
 */
export function NewSignedZapRequest(
  opts: iNewZAPRequest,
  /**
   * The callback received from the recipients lnurl pay endpoint
   */
  callbackUrl: string,
  keypair: {
    privateKey: string;
    publicKey: string;
  }
) {
  const nEv = NewZapRequest(opts);
  nEv.signAndGenerateId(keypair);

  const nEvString = nEv.toURI();

  return {
    event: nEv,
    eventUri: nEvString,
    invoiceUrl: makeLnurlZapRequestUrl({
      callback: callbackUrl,
      amount: opts.amount,
      event: nEvString,
      lnurl: opts.lnurl,
    }),
  };
}

/**
 * Zap receipt
 *
 * A zap receipt is created by a lightning node when an invoice generated by a zap request is paid.
 * Zap receipts are only created when the invoice description (committed to the description hash) contains a zap request note.
 *
 * https://github.com/nostr-protocol/nips/blob/master/57.md
 * @param opts
 * @returns
 */
export function NewZapReceipt(opts: iNewZAPReceipt) {
  const pTag = opts.zapRequest.tags.find((t) => t[0] === "p");
  const eTag = opts.zapRequest.tags.find((t) => t[0] === "e");

  const description = makeZapReceiptDescription(opts.zapRequest);

  const nEv = new NEvent({
    content: "",
    kind: NEVENT_KIND.ZAP_RECEIPT,
    tags: [pTag, ["bolt11", opts.bolt11], ["description", description]],
    created_at: opts.zapRequest.created_at,
  });

  if (eTag) {
    nEv.addEventTag(eTag[1]);
  }

  if (opts.preimage) {
    nEv.addTag(["preimage", opts.preimage]);
  }

  return nEv;
}

export function NewEventDeletion(opts: iNewEventDeletion) {
  const nEv = new NEvent({
    content: "",
    kind: NEVENT_KIND.EVENT_DELETION,
    tags: [],
  });

  if (opts.useEventCoordinatesTags) {
    for (const ev of opts.events) {
      const identifiers = eventHasIdentifierTags(ev);
      if (!identifiers) {
        throw new Error(
          "Event does not have identifier tags (you set useEventCoordinatesTags = true)"
        );
      }

      for (const identifier of identifiers) {
        nEv.addEventCoordinatesTag({
          kind: ev.kind,
          pubkey: ev.pubkey,
          identifier,
        });
      }
    }
  } else {
    for (const ev of opts.events) {
      nEv.addEventTag(ev.id);
    }
  }

  if (nEv.tags.length === 0) {
    throw new Error("No tags added to event deletion");
  }

  return nEv;
}
