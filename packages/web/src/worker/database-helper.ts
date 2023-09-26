import {
  EventBaseSigned,
  FiltersBase,
  NEVENT_KIND,
  NEvent,
  ProcessedEventWithEvents,
  eventHasTags,
} from "@nostr-ts/common";

/**
 * If no tags are provided, match all events
 */
export function hasTagsMatch(filterTags?: string[], eventTags?: string[]) {
  if (!filterTags || filterTags.length === 0) {
    return true;
  }

  if (!eventTags || eventTags.length === 0) {
    return false;
  }

  return filterTags.some((tag) => eventTags.includes(tag));
}

export const DEFAULT_TAGS = ["e", "p", "t"];

export function sortAndTrimPopular(
  data: { [key: string]: number },
  max = 10
): { [key: string]: number } {
  const sorted = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, max);
  return Object.fromEntries(sorted);
}

export function mergePopular(
  firstObj: { [key: string]: number },
  secondObj: { [key: string]: number }
): { [key: string]: number } {
  const merged = { ...firstObj };
  for (const [key, value] of Object.entries(secondObj)) {
    merged[key] = (merged[key] || 0) + value;
  }
  return merged;
}

export function NewProcessedEventFromDB(
  event: EventBaseSigned
): ProcessedEventWithEvents {
  return {
    event: event,
    user: undefined,
    eventRelayUrls: undefined,

    reactions: [],
    reposts: [],
    badgeAwards: [],
    mentions: [],
    replies: [],
    zapReceipts: [],
  };
}

export function isNotReply(event: EventBaseSigned) {
  if (
    event.kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
    event.kind === NEVENT_KIND.LONG_FORM_CONTENT
  ) {
    // TODO: We need to be able to select these specifically
    const hasTags = new NEvent(event).hasEventTags();
    const hasRootOrReply = hasTags
      ? hasTags.find((tag) => tag.marker === "root" || tag.marker === "reply")
      : undefined;
    if (hasRootOrReply) {
      return false;
    }
  }
  return true;
}

export function eventMatchesFilters(
  filters: FiltersBase,
  curserValue: EventBaseSigned
) {
  const kindsMatch = filters.kinds && filters.kinds.includes(curserValue.kind);

  if (!kindsMatch) {
    return false;
  }

  const matchingOrNoAuthor =
    !filters.authors || filters.authors.includes(curserValue.pubkey);

  if (!matchingOrNoAuthor) {
    return false;
  }

  const hasTags = eventHasTags(curserValue);
  const tagsMatch = hasTagsMatch(filters["#t"], hasTags);

  if (!tagsMatch) {
    return false;
  }

  const isWithinTimeRange = true;
  if (filters.since && filters.until) {
    const isWithinTimeRange =
      curserValue.created_at >= filters.since &&
      curserValue.created_at <= filters.until;
  }

  if (!isWithinTimeRange) {
    return false;
  }

  return true;
}
