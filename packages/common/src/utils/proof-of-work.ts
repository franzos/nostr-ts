import { countLeadingZeroes } from "./count-leading-zeroes";
import { hash } from "./hash-event";
import { EventBase } from "../types";

/**
 * Optimized for speed
 */
export function proofOfWork(event: EventBase, bits: number) {
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

    adjustmentValue++;
  }
}
