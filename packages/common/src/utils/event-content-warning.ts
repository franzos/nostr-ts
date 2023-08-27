import { EventBase } from "../types";

/**
 * Get event content warning reason (may be "") or undefined
 * Spec: https://github.com/nostr-protocol/nips/blob/master/36.md
 *
 * @returns reason for content warning or undefined
 */
export function eventHasContentWarning(event: EventBase): string | undefined {
  let hasContentWarning = false;
  let contentWarningReason = "";

  for (const tag of event.tags) {
    // Support warning for ["L", "content-warning"] and ["l", "reason", "content-warning"] formats
    const warning = tag.find((t) => t === "content-warning");
    if (warning) {
      hasContentWarning = true;
      // Support ["content-warning", "reason"] format
      if (tag.length === 2 && tag[0] === "content-warning") {
        contentWarningReason = tag[1];
      }

      // Support ["l", "reason", "content-warning"] format
      if (tag.length === 3 && tag[2] === "content-warning" && tag[0] === "l") {
        contentWarningReason = tag[1];
      }
    }
  }

  return hasContentWarning ? contentWarningReason : undefined;
}
