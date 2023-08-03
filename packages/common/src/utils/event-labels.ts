import { EventBase } from "../types";

/**
 * Check array of tags if any are NIP-32
 * https://github.com/nostr-protocol/nips/blob/master/32.md
 *
 * @returns label tags or undefined
 */
export function eventHasLabels(event: EventBase):
  | {
      labelTags: string[][];
      labelNamespace: string[][];
    }
  | undefined {
  const labelTags = event.tags.filter((tag) => tag[0] === "l");
  const labelNamespace = event.tags.filter((tag) => tag[0] === "L");
  if (labelTags.length === 0 && labelNamespace.length === 0) {
    return;
  }
  return {
    labelTags,
    labelNamespace,
  };
}
