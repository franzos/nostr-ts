import {
  CLIENT_MESSAGE_TYPE,
  EventsRequest,
  FiltersBase,
  LightProcessedEvent,
  ProcessedEventWithEvents,
  PublishingQueueItem,
  WebSocketEvent,
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
  /**
   * Track how many requests we've made against these filters
   * set automatically by the worker
   *
   * starts with 0
   */
  reqCount?: number;
  /**
   * Essentially pagination
   * as long as there's more results, we stay in the given time range
   */
  remainInRange?: number;
  /**
   * Related to stickyInterval
   * set automatically by the worker
   */
  prevInterval?: number;
  /**
   * If true, we don't adjust the interval based on the last event
   */
  stickyInterval: boolean;
  /**
   * Whether to go forward, or backward in time
   *
   * defaults to NEWER
   */
  direction?: "OLDER" | "NEWER";
  /**
   * Stream events to frontend
   * do not save to DB
   *
   * defaults to false
   */
  isLive?: boolean;

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

  let intervalAdjusted: number | undefined;

  if (query.filters.until && query.filters.since) {
    intervalAdjusted = ONE_DAY * 3;
  }
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
      timeoutIn: ONE_MINUTE * 1000,
      view: req.token,
      isLive: query.isLive,
    },
  };
}

export type SystemStatus = "online" | "offline" | "loading";

export interface WorkerEvent {
  data: {
    type:
      | "event:notify"
      | "event:new"
      | "event:update"
      | "relay:message"
      | "event:queue:new"
      | "event:queue:update"
      | "status:change"
      | "following:update"
      | "RAW";
    view: string;
    data:
      | LightProcessedEvent
      | WebSocketEvent
      | PublishingQueueItem
      | SystemStatus
      | string[];
  };
}

export interface WorkerEventNew {
  type: "event:new";
  view: string;
  data: LightProcessedEvent;
}

export interface WorkerEventUpdate {
  type: "event:update";
  view: string;
  data: LightProcessedEvent;
}

export interface WorkerEventStatusChange {
  type: "status:change";
  data: SystemStatus;
}

export interface WorkerEventFollowingUpdate {
  type: "following:update";
  data: string[];
}
