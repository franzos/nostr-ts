import { EventBase } from "src/types";

export function eventHasTags(event: EventBase) {
  const tags = event.tags ? event.tags.filter((tag) => tag[0] === "t") : [];
  return tags.length > 0 ? tags.map((t) => t[1]) : undefined;
}
