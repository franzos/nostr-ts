import { EventBase, ZapTag } from "../types";

/**
 * Check if event has zap tags
 * https://github.com/nostr-protocol/nips/blob/master/57.md#appendix-g-zap-tag-on-other-events
 */
export function eventHasZapTags(event: EventBase): ZapTag[] | undefined {
  if (!event.tags) {
    return undefined;
  }
  const zapTags: ZapTag[] = [];
  for (const tag of event.tags) {
    if (tag[0] === "zap") {
      zapTags.push({
        receiverPubKey: tag[1],
        relayUrlForUserMeta: tag[2],
        weight: parseInt(tag[3], 10),
      });
    }
  }
  if (zapTags.length === 0) {
    return undefined;
  }
  return zapTags;
}

/**
 * Generate a new zap tag
 */
export function createEventZapTag(opts: ZapTag) {
  return [
    "zap",
    opts.receiverPubKey,
    opts.relayUrlForUserMeta,
    opts.weight.toString(),
  ];
}
