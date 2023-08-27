import { EventBase } from "../types/event";
import { EventEventTag } from "../types/event-event-tag";

/**
 * Get marked event "e" tags (PREFERRED)
 *
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

/**
 * Get positional event "e" tags (DEPRECATED)
 */
export function eventHasPositionalEventTags(event: EventBase) {
  const tags = event.tags.filter((tag) => tag[0] === "e");
  if (tags.length === 0) return undefined;
  const evTags: EventEventTag[] = [];

  for (let i = 0; i < tags.length; i++) {
    if (i === 0) {
      evTags.push({
        eventId: tags[i][1],
        relayUrl: "",
        marker: "root",
      });
    }

    if (tags.length === 2) {
      if (i === 1) {
        evTags.push({
          eventId: tags[i][1],
          relayUrl: "",
          marker: "reply",
        });
      }
    } else if (tags.length > 2) {
      if (i === 1) {
        evTags.push({
          eventId: tags[i][1],
          relayUrl: "",
          marker: "mention",
        });
      } else if (i > 1) {
        evTags.push({
          eventId: tags[i][1],
          relayUrl: "",
          marker: "reply",
        });
      }
    }
  }

  return evTags && evTags.length > 0 ? evTags : undefined;
}

/**
 * Positional "e" tags (DEPRECATED)
 * Basically checks whether the event is using the deprecated format
 *
 * This is a boolean check that doesn't return the tags
 * I use this primarily to differentiate between the formats
 */
export function eventHasPositionalEventTag(event: EventBase): boolean {
  if (!event.tags || event.tags.length === 0) return false;
  const tags = event.tags.filter((tag) => tag[0] === "e" && tag.length > 2);
  // If none have been found,
  if (tags.length === 0) return true;
  return false;
}
