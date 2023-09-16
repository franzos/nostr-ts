import { CLIENT_MESSAGE_TYPE, NEVENT_KIND, NFilters } from "@nostr-ts/common";
import {
  ONE_DAY,
  StorageEventsQuery,
  TEN_SECONDS,
  relayEventsRequestFromQuery,
} from "./worker-extra";

const date = Date.now();

describe("Relay events request", () => {
  test("From query for older", () => {
    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      // 24h
      since: date - ONE_DAY,
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
        since: date - 3 * ONE_DAY,
        until: undefined,
      },
      options: {
        timeoutIn: TEN_SECONDS,
        view: "test",
      },
    });
  });
  test("From query for newer", () => {
    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      // 24h
      since: date - ONE_DAY,
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
        since: date - 3 * ONE_DAY,
        until: undefined,
      },
      options: {
        timeoutIn: TEN_SECONDS,
        view: "test",
      },
    });
  });
});
