import { CLIENT_MESSAGE_TYPE, NEVENT_KIND, NFilters } from "@nostr-ts/common";
import {
  ONE_DAY,
  StorageEventsQuery,
  TEN_SECONDS_IN_MS,
  calculateEventsRequestRange,
  relayEventsRequestFromQuery,
} from "./worker-extra";

const date = Math.round(Date.now() / 1000);

describe("Relay events request", () => {
  test("From query for older", () => {
    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      // 24h
      since: Math.round(date - ONE_DAY),
      until: date,
    });

    const query: StorageEventsQuery = {
      token: "test",
      query: {
        filters: reqFilter,
        stickyInterval: true,
        direction: "OLDER",
      },
    };

    const req = relayEventsRequestFromQuery(query);

    expect(req).toEqual({
      type: CLIENT_MESSAGE_TYPE.REQ,
      filters: {
        ...reqFilter,
        since: Math.round(date - 3 * ONE_DAY),
        until: date,
      },
      options: {
        timeoutIn: TEN_SECONDS_IN_MS,
        view: "test",
      },
    });
  });
  test("From query for newer", () => {
    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      // 24h
      since: Math.round(date - ONE_DAY),
      until: date,
    });

    const query: StorageEventsQuery = {
      token: "test",
      query: {
        filters: reqFilter,
        stickyInterval: true,
        direction: "NEWER",
      },
    };

    const req = relayEventsRequestFromQuery(query);

    expect(req).toEqual({
      type: CLIENT_MESSAGE_TYPE.REQ,
      filters: {
        ...reqFilter,
        since: Math.round(date - 3 * ONE_DAY),
        until: date,
      },
      options: {
        timeoutIn: TEN_SECONDS_IN_MS,
        view: "test",
      },
    });
  });
  test("From query defaults", () => {
    const reqFilter = new NFilters({
      kinds: [
        NEVENT_KIND.SHORT_TEXT_NOTE,
        NEVENT_KIND.LONG_FORM_CONTENT,
        NEVENT_KIND.REPOST,
      ],
    });

    const query: StorageEventsQuery = {
      token: "test",
      query: {
        filters: reqFilter,
        stickyInterval: true,
      },
    };

    // Generated request range
    const reqRange = calculateEventsRequestRange(query.query.filters);
    expect(reqRange[0]).toBeGreaterThanOrEqual(Math.round(date - ONE_DAY));
    expect(reqRange[1]).toBeGreaterThanOrEqual(date);

    // Generated subscription request
    const req = relayEventsRequestFromQuery(query);

    expect(req).toEqual({
      type: CLIENT_MESSAGE_TYPE.REQ,
      filters: {
        ...reqFilter,
        since: undefined,
        until: undefined,
      },
      options: {
        timeoutIn: TEN_SECONDS_IN_MS,
        view: "test",
      },
    });
  });
});
