import { EventBase } from "../types";

export function eventHasPublicKeyTags(event: EventBase): string[] | undefined {
  const pubkeyTags = event.tags.filter((tag) => tag[0] === "p");
  if (pubkeyTags.length === 0) {
    return;
  }
  const keys = [];
  for (const tag of pubkeyTags) {
    keys.push(tag[1]);
  }
  return keys;
}
