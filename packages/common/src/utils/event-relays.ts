import { EventBase } from "../types";

export interface EventRelayTag {
  url: string;
  read?: boolean;
  write?: boolean;
}

/**
 * Get event relay tags or undefined
 * usually used on kind:10002
 *
 * Spec: https://github.com/nostr-protocol/nips/blob/master/65.md#relay-list-metadata
 */
export function eventHasRelaysTag(
  event: EventBase
): EventRelayTag[] | undefined {
  const relayTags = event.tags.filter((tag) => tag[0] === "relays");
  if (relayTags.length === 0) return;

  const tags: EventRelayTag[] = [];
  for (const tag of relayTags) {
    if (tag.length === 2) {
      tags.push({
        url: tag[1],
        read: true,
        write: true,
      });
    } else if (tag.length === 3) {
      tags.push({
        url: tag[1],
        read: tag[2] === "read",
        write: tag[2] === "write",
      });
    }
  }
  return tags.length > 0 ? tags : undefined;
}
