import { EventBase } from "../types";

/**
 *
 * Tag may be either
 * - [p, <public key>]
 * - [p, <public key>, relayUrl]
 */
export function eventHasPublicKeyTags(
  event: EventBase
): [string][] | [string, string][] | undefined {
  const pubkeyTags = event.tags.filter((tag) => tag[0] === "p");
  if (pubkeyTags.length === 0) {
    return;
  }
  const tags = [];
  for (const tag of pubkeyTags) {
    if (tag.length === 2) {
      tags.push([tag[1]]);
    } else if (tag.length === 3) {
      tags.push([tag[1], tag[2]]);
    }
  }
  return tags;
}
