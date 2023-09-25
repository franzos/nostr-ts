import { schnorr } from "@noble/curves/secp256k1";
import { EventBase } from "../types";
import { hashEvent } from "./hash-event";

export function verifyEvent(event: EventBase): boolean {
  try {
    const content = hashEvent(event);
    const valid = schnorr.verify(event.sig, content, event.pubkey);
    return valid;
  } catch (e) {
    console.error(e);
    return false;
  }
}
