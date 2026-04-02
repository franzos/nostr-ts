import { schnorr } from "@noble/curves/secp256k1.js";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";
import { EventBase } from "../types";
import { hashEvent } from "./hash-event";

export function sign(eventHash: string, privateKey: string) {
  if (eventHash.length !== 64) throw new Error("Invalid event hash");
  const sig = schnorr.sign(hexToBytes(eventHash), hexToBytes(privateKey));
  return bytesToHex(sig);
}

/**
 * Sign event and return signature as hex string
 * @param event
 * @param privateKey
 * @returns
 */
export function signEvent(event: EventBase, privateKey: string) {
  const serial = hashEvent(event);
  return sign(serial, privateKey);
}
