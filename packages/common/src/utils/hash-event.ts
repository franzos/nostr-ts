import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/curves/abstract/utils";
import { serializeEvent } from "./serialize-event";
import { EventBase } from "../types";
import { Utf8Encoder } from "./utf8-coder";

/**
 * Hash a string and return hex string
 * Use this if your event has already been serialized
 * @param content
 * @returns
 */
export function hash(serializedEvent: string) {
  const hash = sha256(Utf8Encoder.encode(serializedEvent));
  return bytesToHex(hash);
}

/**
 * Hash an event and return hex string
 * To obtain the event.id, we sha256 the serialized event.
 * The serialization is done over the UTF-8 JSON-serialized string (with no white space or line breaks)
 * @param event
 * @returns event ID
 */
export function hashEvent(event: EventBase) {
  return hash(serializeEvent(event));
}
