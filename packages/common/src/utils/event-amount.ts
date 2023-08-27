import { EventBase } from "../types";

/**
 * Get event amount(s) or undefined
 * Spec: https://github.com/nostr-protocol/nips/blob/master/57.md
 *
 * @param event
 * @returns
 */
export function eventHasAmountTags(event: EventBase): string[] {
  const tags = event.tags.filter((tag) => tag[0] === "amount");
  if (tags.length === 0) {
    return;
  }
  const amounts = [];
  for (const tag of tags) {
    if (tag.length === 2) {
      amounts.push(tag[1]);
    }
  }
  return amounts && amounts.length > 0 ? amounts : undefined;
}

/**
 * Create amount tag
 * Spec: https://github.com/nostr-protocol/nips/blob/master/57.md
 *
 * @param amount millisatoshis
 */
export function makeEventAmountTag(amount: string): string[] {
  return ["amount", amount];
}
