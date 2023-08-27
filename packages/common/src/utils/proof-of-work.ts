import { hash } from "./hash-event";
import { EventBase } from "../types";

/**
 * Count leading zeroes in a hex string
 * Copied from https://github.com/nostr-protocol/nips/blob/master/13.md#validating
 * All credits go to the author
 * @param hex
 * @returns
 */
function countLeadingZeroes(hex: string) {
  let count = 0;

  for (let i = 0; i < hex.length; i++) {
    const nibble = parseInt(hex[i], 16);
    if (nibble === 0) {
      count += 4;
    } else {
      count += Math.clz32(nibble) - 28;
      break;
    }
  }

  return count;
}

/**
 * Add proof of work to event
 * Importing: Anything above ~15-20 bits might take a while to compute
 */
export function proofOfWork(
  event: EventBase,
  bits: number,
  limitRounds?: number
) {
  let adjustmentValue = 0;
  const bitsString = bits.toString();
  while (true) {
    const nonceIndex = event.tags.findIndex((t) => t[0] === "nonce");
    if (nonceIndex !== -1) {
      event.tags[nonceIndex][1] = adjustmentValue.toString();
    } else {
      event.tags.push(["nonce", adjustmentValue.toString(), bitsString]);
    }

    const serial = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content,
    ]);
    event.id = hash(serial);

    const leadingZeroes = countLeadingZeroes(event.id);

    if (leadingZeroes >= bits) {
      console.log("Proof of work complete");
      event.tags = event.tags.filter((t) => t[0] !== "nonce");
      event.tags.push(["nonce", adjustmentValue.toString(), bitsString]);
      return event;
    }

    if (limitRounds && adjustmentValue >= limitRounds) {
      return undefined;
    }

    adjustmentValue++;
  }
}
