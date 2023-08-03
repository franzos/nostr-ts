import { EventBase } from "../types";

/**
 * Check array of tags if any are NIP-40
 * @returns expiration time or undefined
 */
export function eventHasExpiration(event: EventBase): number | undefined {
  const expirationTags = event.tags.filter((tag) => tag[0] === "expiration");
  if (expirationTags.length === 0) {
    return;
  }
  return parseInt(expirationTags[0][1]);
}
