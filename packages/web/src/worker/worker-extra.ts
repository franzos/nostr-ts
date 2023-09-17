import {
  CLIENT_MESSAGE_TYPE,
  EventsRequest,
  FiltersBase,
  LightProcessedEvent,
  ProcessedEventWithEvents,
} from "@nostr-ts/common";

export const ONE_WEEK = 7 * 24 * 60 * 60;
export const ONE_DAY = 24 * 60 * 60;
export const ONE_HOUR = 60 * 60;
export const ONE_MINUTE = 60;
export const TEN_SECONDS = 10;
export const TEN_SECONDS_IN_MS = 10 * 1000;
export const ONE_SECOND = 1;
export const ONE_SECOND_IN_MS = 1000;

export type ReqRange = [number, number] | [undefined, undefined];

export function ProcessedToLightProcessedEvent(
  event: ProcessedEventWithEvents
): LightProcessedEvent {
  const reactionsCount = event.reactions.reduce((acc, r) => {
    const content = r?.content ? r.content : undefined;
    if (content && acc[content]) {
      acc[content] += 1;
    } else if (content) {
      acc[content] = 1;
    }
    return acc;
  }, {} as { [key: string]: number });

  const data: LightProcessedEvent = {
    event: event.event,
    user: event.user,
    eventRelayUrls: event.eventRelayUrls,
    repliesCount: event.replies.length,
    reactionsCount,
    repostsCount: event.reposts.length,
    badgeAwardsCount: event.badgeAwards.length,
    mentionsCount: 0,
    zapReceiptAmount: event.zapReceipts.reduce((acc, r) => {
      return acc + Number(r.amount);
    }, 0),
    zapReceiptCount: event.zapReceipts.length,
  };

  return data;
}

/**
 * Calculate subscription request range
 * - If since is not set, we default to 24h
 * - If until is not set, we default to now
 * @param filters
 * @returns
 */
export function calculateEventsRequestRange(
  filters: FiltersBase
): [number, number] {
  const since = filters.since || Math.round(Date.now() / 1000 - ONE_DAY);
  const until = filters.until || Math.round(Date.now() / 1000);

  if (since > until) {
    throw new Error("Invalid range");
  }

  return [since, until];
}

export interface StorageQueryParams {
  filters: FiltersBase;
  // Keep track of requests (first is usually undefined; second is 1)
  reqCount?: number;
  // prevInterval?: number;
  // Above limit; pick-up next round (will invoke memory)
  remainInRange?: number;
  // Means, we stick to the interval, and don't start from the last event
  prevInterval?: number;
  stickyInterval: boolean;
  direction?: "OLDER" | "NEWER";

  // No subscription
  isOffline?: boolean;
}

export interface StorageEventsQuery {
  token: string;
  query: StorageQueryParams;
}

export interface StorageQueryResult {
  token: string;
  events?: LightProcessedEvent[];
  next: StorageQueryParams;
}

export function relayEventsRequestFromQuery(
  req: StorageEventsQuery
): EventsRequest {
  const query = req.query;
  const { filters } = query;

  let intervalAdjusted;

  if (query.filters.until && query.filters.since) {
    // const prevInterval =
    //   query.direction === "OLDER"
    //     ? query.filters.until - query.filters.since
    //     : query.filters.since - query.filters.until;
    // If Interval is larger than 7 days, or smaller than -7 days, we default to 7
    // const interval = Math.min(Math.max(prevInterval, -ONE_WEEK), ONE_WEEK);
    // If it's smaller than 1 day, we increase to 3
    intervalAdjusted = ONE_WEEK;
  }

  // We cannot query into the future, so yeah

  // if direction is NEWER, we use the since value
  // if direction is OLDER, we use the until value
  return {
    type: CLIENT_MESSAGE_TYPE.REQ,
    filters: {
      ...filters,
      since: intervalAdjusted
        ? filters.until - intervalAdjusted
        : filters.since,
      until: filters.until,
    },
    options: {
      timeoutIn: TEN_SECONDS_IN_MS,
      view: req.token,
    },
  };
}
