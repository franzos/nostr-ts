import { EventBase } from "../types";

export function eventHasRelaysTag(event: EventBase): string[] | undefined {
  const relayTags = event.tags.filter((tag) => tag[0] === "relays");
  if (relayTags.length === 0) {
    return;
  }
  const relays = [];
  for (const tag of relayTags) {
    const tagParts = tag.splice(1);
    relays.push(tagParts);
  }
  return relays;
}
