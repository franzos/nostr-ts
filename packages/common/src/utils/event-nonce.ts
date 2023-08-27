import { NEvent } from "../classes/event";
import { EventBase } from "../types/event";

/**
 * Check array of tags if any nonce tags are present
 * https://github.com/nostr-protocol/nips/blob/master/13.md
 */
export function eventHasNonce(event: EventBase): [number, number] | undefined {
  const nonceTags = event.tags.filter((tag) => tag[0] === "nonce");
  if (nonceTags.length === 0) {
    return;
  }
  return [parseInt(nonceTags[0][1]), parseInt(nonceTags[0][2])];
}

/**
 * Add nonce tag to event
 */
export function eventAddNonceTag(event: NEvent, nonce: number[]) {
  if (event.hasNonceTag()) {
    throw new Error("Event already has a nonce.");
  }
  if (nonce.length !== 2) {
    throw new Error(
      "Nonce must be an array of 2 numbers: [miningResult, difficulty]"
    );
  }
  const miningResult = nonce[0].toString();
  const difficulty = nonce[1].toString();

  event.addTag(["nonce", miningResult, difficulty]);

  return event;
}

/**
 * Replace nonce tag on event
 */
export function eventReplaceNonceTag(event: NEvent, nonce: number[]) {
  event.tags = event.tags.filter((tag) => tag[0] !== "nonce");
  event.addNonceTag(nonce);
  return event;
}
