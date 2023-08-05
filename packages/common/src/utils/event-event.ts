import { EventBase, EventEventTag } from "../types";

/**
 * ["e", <relay-url>]
 * ["e", <event-id>, <relay-url>]
 * ['e', 'eventId', 'relayUrl', 'marker']
 * @param event
 */
export function eventHasEventTags(
  event: EventBase
): EventEventTag[] | undefined {
  const tags = event.tags.filter((tag) => tag[0] === "e");
  if (tags.length === 0) return undefined;
  const evTags: EventEventTag[] = [];
  for (const tag of tags) {
    if (tag.length === 2) {
      evTags.push({
        eventId: tag[1],
      });
    } else if (tag.length === 3) {
      evTags.push({
        eventId: tag[1],
        relayUrl: tag[2],
      });
    } else if (tag.length === 4) {
      evTags.push({
        eventId: tag[1],
        relayUrl: tag[2],
        marker: tag[3] as "reply" | "root" | "mention",
      });
    }
  }
  return evTags && evTags.length > 0 ? evTags : undefined;
}
