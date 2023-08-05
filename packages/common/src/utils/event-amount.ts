import { EventBase } from "../types";

export function eventHasAmountTags(event: EventBase) {
  const tags = event.tags.filter((tag) => tag[0] === "amount");
  if (tags.length === 0) {
    return;
  }
  const amounts = [];
  for (const tag of tags) {
    if (tag.length > 0) {
      amounts.push(tag[1]);
    }
  }
  return amounts && amounts.length > 0 ? amounts : undefined;
}

export function makeEventAmountTag(amount: string) {
  return ["amount", amount];
}
