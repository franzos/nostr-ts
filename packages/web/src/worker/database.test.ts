import "fake-indexeddb/auto";
import { Database } from "./database";
import { NEVENT_KIND, EventBaseSigned, ProcessedUserBase } from "@nostr-ts/common";

/**
 * Helper: create a minimal signed-looking event for storage.
 * The Database class stores raw event objects — it doesn't validate signatures.
 */
function makeEvent(overrides: Partial<EventBaseSigned> = {}): EventBaseSigned {
  return {
    id: overrides.id || "a1".repeat(32),
    pubkey: overrides.pubkey || "ab".repeat(32),
    created_at: overrides.created_at || Math.round(Date.now() / 1000),
    kind: overrides.kind ?? NEVENT_KIND.SHORT_TEXT_NOTE,
    tags: overrides.tags || [],
    content: overrides.content || "hello",
    sig: overrides.sig || "b2".repeat(64),
  };
}

function makeUser(pubkey: string): ProcessedUserBase {
  return {
    user: {
      pubkey,
    },
    relayUrls: ["wss://relay.example.com"],
  };
}

describe("User CRUD", () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.init();
    await db.deleteAll();
  });

  test("countUsers reflects stored users", async () => {
    expect(await db.countUsers()).toBe(0);

    await db.addUser(makeUser("aa".repeat(32)));
    expect(await db.countUsers()).toBe(1);

    await db.addUser(makeUser("bb".repeat(32)));
    expect(await db.countUsers()).toBe(2);
  });

  test("updateUser overwrites existing data", async () => {
    const pubkey = "cc".repeat(32);
    await db.addUser(makeUser(pubkey));

    const updated: ProcessedUserBase = {
      user: { pubkey },
      relayUrls: ["wss://other.relay"],
      isBlocked: true,
    };
    await db.updateUser(updated);

    const retrieved = await db.getUser(pubkey);
    expect(retrieved.isBlocked).toBe(true);
    expect(retrieved.relayUrls).toEqual(["wss://other.relay"]);
  });

  test("getUser returns undefined for nonexistent key", async () => {
    const result = await db.getUser("ff".repeat(32));
    expect(result).toBeUndefined();
  });
});

describe("Event storage", () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.init();
    await db.deleteAll();
  });

  test("saveEvent stores tags queryable via getRelatedEvents", async () => {
    const event = makeEvent({
      id: "a2".repeat(32),
      tags: [
        ["e", "referenced-event-id"],
        ["p", "mentioned-pubkey"],
        ["t", "nostr"],
      ],
    });
    await db.saveEvent(event);

    const related = await db.getRelatedEvents("referenced-event-id", [
      NEVENT_KIND.SHORT_TEXT_NOTE,
    ]);
    expect(related.length).toBe(1);
    expect(related[0].id).toBe("a2".repeat(32));
  });

  test("isPermanent controls expiresAt metadata", async () => {
    const permEvent = makeEvent({ id: "a3".repeat(32) });
    await db.saveEvent(permEvent, { isPermanent: true });

    const tempEvent = makeEvent({ id: "a4".repeat(32) });
    await db.saveEvent(tempEvent);

    const perm = await db.getEvent("a3".repeat(32)) as any;
    expect(perm.isPermanent).toBe(true);
    expect(perm.expiresAt).toBeUndefined();

    const temp = await db.getEvent("a4".repeat(32)) as any;
    expect(temp.isPermanent).toBe(false);
    expect(temp.expiresAt).toBeDefined();
    expect(temp.expiresAt).toBeGreaterThan(Date.now());
  });

  test("getEvent returns undefined for nonexistent id", async () => {
    const result = await db.getEvent("does-not-exist");
    expect(result).toBeUndefined();
  });

  test("duplicate saveEvent silently ignores ConstraintError", async () => {
    const event = makeEvent({ id: "a5".repeat(32) });
    await db.saveEvent(event);
    // Should not throw
    await db.saveEvent(event);

    const retrieved = await db.getEvent("a5".repeat(32));
    expect(retrieved).toBeTruthy();
  });
});

describe("Event expiration cleanup", () => {
  let db: Database;
  const realDateNow = Date.now;

  beforeEach(async () => {
    db = new Database();
    await db.init();
    await db.deleteAll();
  });

  afterEach(() => {
    Date.now = realDateNow;
  });

  test("expired events are removed, non-expired preserved", async () => {
    // Save an event that will already be expired by shifting Date.now into the past
    const pastMs = realDateNow() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
    Date.now = () => pastMs;
    await db.saveEvent(makeEvent({ id: "a6".repeat(32), content: "old" }));
    Date.now = realDateNow;

    // Save a fresh event at real time — its expiresAt will be ~48h from now
    await db.saveEvent(makeEvent({ id: "a7".repeat(32), content: "fresh" }));

    const deleted = await db.cleanupExpiredEvents();
    expect(deleted).toBe(1);

    expect(await db.getEvent("a6".repeat(32))).toBeUndefined();
    expect(await db.getEvent("a7".repeat(32))).toBeTruthy();
  });

  test("permanent events survive cleanup even if old", async () => {
    // Save a permanent event with Date.now shifted far into the past
    const pastMs = realDateNow() - 3 * 24 * 60 * 60 * 1000;
    Date.now = () => pastMs;
    await db.saveEvent(makeEvent({ id: "a8".repeat(32) }), { isPermanent: true });
    Date.now = realDateNow;

    // Also save a non-permanent expired event so we can confirm cleanup runs
    const slightPast = realDateNow() - 3 * 24 * 60 * 60 * 1000;
    Date.now = () => slightPast;
    await db.saveEvent(makeEvent({
      id: "a9".repeat(32),
      tags: [["t", "cleanup-test"]],
    }));
    Date.now = realDateNow;

    const deleted = await db.cleanupExpiredEvents();
    expect(deleted).toBe(1);

    // Permanent event survives
    expect(await db.getEvent("a8".repeat(32))).toBeTruthy();
    // Expired non-permanent event is gone
    expect(await db.getEvent("a9".repeat(32))).toBeUndefined();

    // Tags referencing deleted event should also be gone
    const related = await db.getRelatedEvents("a9".repeat(32), [
      NEVENT_KIND.SHORT_TEXT_NOTE,
    ]);
    expect(related.length).toBe(0);
  });
});

describe("Last request tracking", () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.init();
  });

  test("getLastRequest returns undefined when no record exists", async () => {
    const result = await db.getLastRequest("some-key");
    expect(result).toBeUndefined();
  });

  test("setLastRequest and getLastRequest round-trip", async () => {
    const ts = Math.round(Date.now() / 1000);
    await db.setLastRequest("general", ts);

    const result = await db.getLastRequest("general");
    expect(result).toBe(ts);
  });

  test("setLastRequest updates an existing record", async () => {
    const first = 1000;
    const second = 2000;

    await db.setLastRequest("user-abc", first);
    expect(await db.getLastRequest("user-abc")).toBe(first);

    await db.setLastRequest("user-abc", second);
    expect(await db.getLastRequest("user-abc")).toBe(second);
  });
});

describe("List CRUD", () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.init();
    await db.deleteAll();
    // deleteAll doesn't cover lists — clean them via the Database API
    const existing = await db.getAllLists();
    if (existing) {
      for (const list of existing) {
        await db.deleteList(list.id);
      }
    }
  });

  test("createList and getAllLists", async () => {
    await db.createList({
      title: "My List",
      description: "A test list",
      userPubkeys: [],
    });

    const lists = await db.getAllLists();
    expect(lists).toBeTruthy();
    expect(lists!.length).toBe(1);
    expect(lists![0].title).toBe("My List");
    expect(lists![0].id).toBeTruthy(); // nanoid is auto-generated
  });

  test("getList returns a single list by id", async () => {
    await db.createList({ title: "Find Me" });

    const all = await db.getAllLists();
    const id = all![0].id;

    const single = await db.getList(id);
    expect(single).toBeTruthy();
    expect(single!.title).toBe("Find Me");
  });

  test("deleteList removes a list", async () => {
    await db.createList({ title: "To Delete" });

    const all = await db.getAllLists();
    expect(all!.length).toBe(1);

    await db.deleteList(all![0].id);

    const afterDelete = await db.getAllLists();
    expect(afterDelete!.length).toBe(0);
  });

  test("getList populates users when userPubkeys are present", async () => {
    const pubkey = "dd".repeat(32);
    await db.addUser(makeUser(pubkey));

    await db.createList({
      title: "With Users",
      userPubkeys: [pubkey],
    });

    const all = await db.getAllLists();
    const list = await db.getList(all![0].id);

    expect(list!.users).toBeTruthy();
    expect(list!.users!.length).toBe(1);
    expect(list!.users![0].user.pubkey).toBe(pubkey);
  });
});

describe("deleteAll", () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database();
    await db.init();
    await db.deleteAll();
  });

  test("empties events and users", async () => {
    await db.addUser(makeUser("ee".repeat(32)));

    const event = makeEvent({
      id: "b1".repeat(32),
      tags: [["e", "some-ref"]],
    });
    await db.saveEvent(event);

    // Confirm data exists
    expect(await db.countUsers()).toBe(1);
    expect(await db.getEvent("b1".repeat(32))).toBeTruthy();

    await db.deleteAll();

    expect(await db.countUsers()).toBe(0);
    expect(await db.getEvent("b1".repeat(32))).toBeUndefined();

    // Tags referencing the event should also be gone
    const related = await db.getRelatedEvents("some-ref", [
      NEVENT_KIND.SHORT_TEXT_NOTE,
    ]);
    expect(related.length).toBe(0);
  });
});
