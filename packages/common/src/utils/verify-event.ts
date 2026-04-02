import { schnorr } from "@noble/curves/secp256k1.js";
import { hexToBytes } from "@noble/curves/utils.js";
import { EventBase } from "../types";
import { hashEvent } from "./hash-event";

export function verifyEvent(event: EventBase): boolean {
  try {
    const content = hashEvent(event);
    const valid = schnorr.verify(
      hexToBytes(event.sig),
      hexToBytes(content),
      hexToBytes(event.pubkey)
    );
    return valid;
  } catch (e) {
    console.error(e);
    return false;
  }
}
