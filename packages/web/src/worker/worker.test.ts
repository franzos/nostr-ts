import {
  NEVENT_KIND,
  NEvent,
  NFilters,
  RELAY_MESSAGE_TYPE,
  generateClientKeys,
} from "@nostr-ts/common";
import { NWorker } from "./worker";

import "fake-indexeddb/auto";
import { ONE_DAY, ONE_HOUR, ONE_MINUTE } from "./worker-extra";

indexedDB.deleteDatabase("nostrop");

const keypair = generateClientKeys();

const date = Math.round(Date.now() / 1000 - 5 * ONE_DAY);

const events: NEvent[] = [];
for (let i = 1; i <= 5; i++) {
  for (let j = 1; j <= 6; j++) {
    const event = new NEvent({
      kind: NEVENT_KIND.SHORT_TEXT_NOTE,
      content: `Test ${i}-${j}`,
      created_at: Math.round(date + i * ONE_DAY + j * ONE_HOUR),
    });
    event.signAndGenerateId(keypair);
    events.push(event);
  }
}

describe("Paginate by day, over days - sticky interval", () => {
  const worker = new NWorker({
    saveAllEvents: true,
  });

  let firstRes;
  let secondRes;
  let thirdRes;

  beforeAll(async () => {
    await worker.init();
    await worker.db.deleteAll();

    // Simulate incoming events
    for (const event of events) {
      await worker.processEvent({
        data: [RELAY_MESSAGE_TYPE.EVENT, "test", event.ToObj()],
        meta: {
          url: "wss://test.com",
          read: true,
          write: true,
        },
      });
    }
    // sleep 2s
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }, 10000);

  test("Expect first page with 6 results", async () => {
    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      // 24h
      since: Math.round(date + ONE_DAY),
      until: Math.round(date + 2 * ONE_DAY),
      limit: 6,
    });

    firstRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: {
        filters: reqFilter,
        stickyInterval: true,
        isOffline: true,
      },
    });

    expect(firstRes.events.length).toBe(6);
    expect(firstRes.next.filters.since).toBe(reqFilter.since + ONE_DAY);
  });

  test("Expect second page with 6 results", async () => {
    secondRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: firstRes.next,
    });

    expect(secondRes.next.filters.since).toBe(
      firstRes.next.filters.since + ONE_DAY
    );
    expect(secondRes.events.length).toBe(6);
  });

  test("Expect third page with 6 results", async () => {
    expect(secondRes.next.filters.since).toBe(
      firstRes.next.filters.since + ONE_DAY
    );
    thirdRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: secondRes.next,
    });
    expect(thirdRes.next.filters.since).toBeGreaterThan(
      secondRes.next.filters.since
    );
    expect(thirdRes.events.length).toBe(6);
  }, 10000);
});

describe("Paginate by hour, over days - sticky interval", () => {
  const worker = new NWorker({
    saveAllEvents: true,
  });

  const eventIds = [];

  let firstRes;
  let secondRes;
  let thirdRes;

  beforeAll(async () => {
    await worker.init();
    await worker.db.deleteAll();

    // Simulate incoming events
    for (const event of events) {
      await worker.processEvent({
        data: [RELAY_MESSAGE_TYPE.EVENT, "test", event.ToObj()],
        meta: {
          url: "wss://test.com",
          read: true,
          write: true,
        },
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test("First hour", async () => {
    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      since: Math.round(date + ONE_DAY),
      until: Math.round(date + ONE_DAY + ONE_HOUR),
      limit: 1,
    });

    firstRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: {
        filters: reqFilter,
        stickyInterval: true,
        isOffline: true,
      },
    });

    expect(firstRes.events.length).toBe(1);
    expect(firstRes.next.filters.since).toBeGreaterThan(reqFilter.since);
    firstRes.events.map((e) => eventIds.push(e.id));
  });

  test("Second hour", async () => {
    secondRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: firstRes.next,
    });

    expect(secondRes.events.length).toBe(1);
    expect(eventIds.includes(secondRes.events[0].id)).toBeFalsy();
    firstRes.events.map((e) => eventIds.push(e.id));
  });

  test("Thirds hour", async () => {
    thirdRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: secondRes.next,
    });
    expect(secondRes.events.length).toBe(1);
    expect(eventIds.includes(secondRes.events[0].id)).toBeFalsy();
    thirdRes.events.map((e) => eventIds.push(e.id));
  }, 10000);
});

describe("Paginate by day, over limit", () => {
  const worker = new NWorker({
    saveAllEvents: true,
  });

  let firstRes;
  let secondRes;
  let thirdRes;
  let forthRes;
  let fifthRes;
  let sixthRes;
  let seventhRes;

  test("Expect first page with 1 results", async () => {
    await worker.init();
    await worker.db.deleteAll();

    // Simulate incoming events
    for (const event of events) {
      await worker.processEvent({
        data: [RELAY_MESSAGE_TYPE.EVENT, "test", event.ToObj()],
        meta: {
          url: "wss://test.com",
          read: true,
          write: true,
        },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      since: Math.round(date + ONE_DAY),
      until: Math.round(date + 2 * ONE_DAY),
      limit: 1,
    });

    firstRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: {
        filters: reqFilter,
        stickyInterval: true,
        isOffline: true,
      },
    });

    expect(firstRes.events.length).toBe(1);
    expect(firstRes.next.filters.since).toBe(reqFilter.since);
  });

  test("Expect second page with 1 results", async () => {
    secondRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: firstRes.next,
    });

    expect(secondRes.next.filters.since).toBe(firstRes.next.filters.since);
    expect(secondRes.events.length).toBe(1);
  });

  test("Expect third page with 1 result", async () => {
    thirdRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: secondRes.next,
    });

    expect(thirdRes.next.filters.since).toBe(secondRes.next.filters.since);
    expect(thirdRes.events.length).toBe(1);
  });

  test("Expect forth page with 1 result", async () => {
    forthRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: thirdRes.next,
    });

    expect(forthRes.next.filters.since).toBe(thirdRes.next.filters.since);
    expect(forthRes.events.length).toBe(1);
  });

  test("Expect fifth page with 1 result", async () => {
    fifthRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: forthRes.next,
    });

    expect(fifthRes.next.filters.since).toBe(forthRes.next.filters.since);
    expect(fifthRes.events.length).toBe(1);
  });

  test("Expect sixth page with 1 result (next day)", async () => {
    sixthRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: fifthRes.next,
    });

    expect(sixthRes.next.filters.since).toBe(
      fifthRes.next.filters.since + ONE_DAY
    );
    expect(sixthRes.events.length).toBe(1);
  });
});

describe("Retry the first request, if no results", () => {
  const worker = new NWorker({
    saveAllEvents: true,
  });

  let firstRes;
  let secondRes;

  beforeAll(async () => {
    await worker.init();
    await worker.db.deleteAll();
  });

  test("Expect first page with 0 results and same filters", async () => {
    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      since: Math.round(date + ONE_DAY),
      until: Math.round(date + 2 * ONE_DAY),
    });

    firstRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: {
        filters: reqFilter,
        stickyInterval: true,
        isOffline: true,
      },
    });

    expect(firstRes.events.length).toBe(0);
    expect(firstRes.next.filters.since).toBe(reqFilter.since);
    expect(firstRes.next.filters.until).toBe(reqFilter.until);
  });

  test("Expect first page, 2nd try, with 6 result", async () => {
    for (const event of events) {
      await worker.processEvent({
        data: [RELAY_MESSAGE_TYPE.EVENT, "test", event.ToObj()],
        meta: {
          url: "wss://test.com",
          read: true,
          write: true,
        },
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    secondRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: firstRes.next,
    });

    expect(secondRes.events.length).toBe(6);
    expect(secondRes.next.filters.since).toBe(
      firstRes.next.filters.since + ONE_DAY
    );
  });
});

describe("Inverse request; expect older results next", () => {
  const worker = new NWorker({
    saveAllEvents: true,
  });

  let firstRes;
  let secondRes;

  beforeAll(async () => {
    await worker.init();
    await worker.db.deleteAll();

    // Simulate incoming events
    for (const event of events) {
      await worker.processEvent({
        data: [RELAY_MESSAGE_TYPE.EVENT, "test", event.ToObj()],
        meta: {
          url: "wss://test.com",
          read: true,
          write: true,
        },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test("First page", async () => {
    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      since: Math.round(date + 3 * ONE_DAY),
      until: Math.round(date + 4 * ONE_DAY),
    });

    firstRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: {
        filters: reqFilter,
        stickyInterval: true,
        isOffline: true,
        direction: "OLDER",
      },
    });

    expect(firstRes.events.length).toBe(6);
    expect(firstRes.next.filters.since).toBe(reqFilter.since - ONE_DAY);
    expect(firstRes.next.filters.until).toBe(reqFilter.until - ONE_DAY);
  });

  test("Expect first page, 2nd try, with 6 result", async () => {
    secondRes = await worker._getEventsQueryProcessor({
      token: "test",
      query: firstRes.next,
    });

    expect(secondRes.events.length).toBe(6);
    expect(secondRes.next.filters.since).toBe(
      firstRes.next.filters.since - ONE_DAY
    );
  });
});

/**
 * UPDATES
 */

describe("Event updates", () => {
  const secondKeypair = generateClientKeys();
  const thirdKeypair = generateClientKeys();

  const eventsDate = Math.round(Date.now() / 1000);

  const noteEvent = new NEvent({
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
    content: `Test`,
    created_at: eventsDate,
  });

  noteEvent.signAndGenerateId(keypair);

  const reactionEvent = new NEvent({
    kind: NEVENT_KIND.REACTION,
    content: `+`,
    created_at: eventsDate,
    tags: [
      ["e", noteEvent.id],
      ["p", noteEvent.pubkey],
    ],
  });

  reactionEvent.signAndGenerateId(secondKeypair);

  const secondReactionEvent = new NEvent({
    kind: NEVENT_KIND.REACTION,
    content: `+`,
    created_at: eventsDate,
    tags: [
      ["e", noteEvent.id],
      ["p", noteEvent.pubkey],
    ],
  });

  secondReactionEvent.signAndGenerateId(thirdKeypair);

  const worker = new NWorker({
    saveAllEvents: true,
  });

  beforeAll(async () => {
    await worker.init();
    await worker.db.deleteAll();

    for (const event of [noteEvent, reactionEvent]) {
      await worker.processEvent({
        data: [RELAY_MESSAGE_TYPE.EVENT, "test", event.ToObj()],
        meta: {
          url: "wss://test.com",
          read: true,
          write: true,
        },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test("Expect note event with reaction", async () => {
    const reqFilter = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      // 24h
      since: Math.round(eventsDate - ONE_DAY),
      until: eventsDate + ONE_MINUTE,
    });

    const result = await worker.getEvents({
      token: "test",
      query: {
        filters: reqFilter,
        stickyInterval: true,
        isOffline: true,
        attachRelations: true,
      },
    });

    expect(result.events.length).toBe(1);
    expect(Object.keys(result.events[0].reactionsCount).length).toBe(1);
  });

  test("Expect subscription response to update in-memory event", async () => {
    for (const event of [secondReactionEvent]) {
      await worker.processEvent({
        data: [RELAY_MESSAGE_TYPE.EVENT, "test", event.ToObj()],
        meta: {
          url: "wss://test.com",
          read: true,
          write: true,
        },
      });
    }

    expect(worker.eventsInMemory.length).toBe(1);
    expect(worker.eventsInMemory[0].reactions.length).toBe(2);
  });
});

describe("Get popular related", () => {
  const secondKeypair = generateClientKeys();
  const thirdKeypair = generateClientKeys();

  const noteEvent = new NEvent({
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
    content: `Test`,
    created_at: Math.round(Date.now() / 1000),
  });

  noteEvent.signAndGenerateId(keypair);

  const reactionEvent = new NEvent({
    kind: NEVENT_KIND.REACTION,
    content: `+`,
    created_at: Math.round(Date.now() / 1000),
    tags: [
      ["e", noteEvent.id],
      ["p", noteEvent.pubkey],
    ],
  });

  reactionEvent.signAndGenerateId(secondKeypair);

  const worker = new NWorker({
    saveAllEvents: true,
  });

  beforeAll(async () => {
    await worker.init();
    await worker.db.deleteAll();

    // Simulate incoming events
    for (const event of [noteEvent, reactionEvent]) {
      await worker.processEvent({
        data: [RELAY_MESSAGE_TYPE.EVENT, "test", event.ToObj()],
        meta: {
          url: "wss://test.com",
          read: true,
          write: true,
        },
      });
    }
  });

  test("Expect first page with 6 results", async () => {
    await worker.calculatePopular({
      isOffline: true,
    });

    const result = await worker.getPopularUsers();

    console.log(result);
  });
});

describe("Get tagged", () => {
  const noteEvent = new NEvent({
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
    content: `Test`,
    created_at: Math.round(Date.now() / 1000),
    tags: [["t", "test"]],
  });

  noteEvent.signAndGenerateId(keypair);

  const noteEventTwo = new NEvent({
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
    content: `Test`,
    created_at: Math.round(Date.now() / 1000),
    tags: [["t", "another"]],
  });

  noteEventTwo.signAndGenerateId(keypair);

  const worker = new NWorker({
    saveAllEvents: true,
  });

  beforeAll(async () => {
    await worker.init();
    await worker.db.deleteAll();

    // Simulate incoming events
    for (const event of [noteEvent, noteEventTwo]) {
      await worker.processEvent({
        data: [RELAY_MESSAGE_TYPE.EVENT, "test", event.ToObj()],
        meta: {
          url: "wss://test.com",
          read: true,
          write: true,
        },
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test("Expect one tagged event", async () => {
    const filters = new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      ["#t"]: ["test"],
      limit: 1,
    });

    const events = await worker.getEvents({
      token: "test",
      query: {
        filters,
        stickyInterval: true,
        isOffline: true,
      },
    });

    expect(events.events.length).toBe(1);
  });
});
