import { IDBPDatabase, openDB } from "idb";
import {
  EventBaseSigned,
  FiltersBase,
  NEVENT_KIND,
  NEvent,
  NFilters,
  ProcessedUserBase,
  UserRecord,
} from "@nostr-ts/common";
import { NClientDB, dbMigration } from "./database-migration";
import { ONE_DAY } from "./worker-extra";
import { CreateListRecord, ListRecord, ProcessedListRecord } from "./lists";
import { nanoid } from "nanoid";
import { NUser } from "../classes";
import {
  DEFAULT_TAGS,
  eventMatchesFilters,
  isNotReply,
  sortAndTrimPopular,
} from "./database-helper";

export class Database {
  db: IDBPDatabase<NClientDB> | null;

  async init() {
    console.log(`=> DATABASE: Initializing database...`);
    this.db = await openDB<NClientDB>("nostros", 4, {
      upgrade(database, oldVersion, newVersion, transaction) {
        dbMigration(database, oldVersion, newVersion, transaction);
      },
    });
  }

  async deleteAll() {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    await this.db.clear("events");
    await this.db.clear("users");
    await this.db.clear("tags");
  }

  /**
   * USER HANDLING
   */

  async getUser(pubkey: string): Promise<UserRecord> {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    return this.db.get("users", pubkey);
  }

  async getUsersByParam(key: "isBlocked" | "following") {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    const tx = this.db.transaction("users", "readonly");
    const store = tx.objectStore("users");

    let cursor = await store.openCursor();
    const records: UserRecord[] = [];

    while (cursor) {
      if (cursor.value[key] === true) {
        records.push(cursor.value);
      }
      cursor = await cursor.continue();
    }

    return records.map((record) => {
      return {
        ...record,
        user: new NUser(record.user),
      };
    });
  }

  async addUser(data: ProcessedUserBase) {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    return this.db.put("users", data);
  }

  async updateUser(data: ProcessedUserBase) {
    if (!this.db) throw new Error("=> DATABASE: not ready");
    if (!data.user.pubkey) throw new Error("=> DATABASE: no pubkey provided");

    return this.db.put("users", {
      ...data,
    });
  }

  async countUsers() {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    return this.db.count("users");
  }

  /**
   * EVENT HANDLINE
   */

  async getEvent(id: string): Promise<EventBaseSigned> {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    return this.db.get("events", id);
  }

  async getEventsByPublicKeysAndKinds(
    filters: FiltersBase,
    memoryIds?: string[]
  ): Promise<[EventBaseSigned[], number]> {
    const tx = this.db?.transaction("events", "readonly");
    const store = tx?.objectStore("events");
    const index = store?.index("kindAndPubkey");

    const events: EventBaseSigned[] = [];
    let total = 0;

    for (const pubkey of filters.authors) {
      for (const kind of filters.kinds) {
        let cursor = await index?.openCursor([kind, pubkey], "prev");
        while (cursor) {
          const ev: EventBaseSigned = cursor.value;

          const isIdInMemory = memoryIds && memoryIds.includes(ev.id);
          const isWithinLimit = filters.limit
            ? events.length < filters.limit
            : true;
          const match = eventMatchesFilters(filters, ev);

          if (!isIdInMemory && isNotReply(ev) && match) {
            total++;
            if (isWithinLimit) {
              events.push(ev);
            }
          }

          if (total > 500) {
            break;
          }
          cursor = await cursor.continue();
        }
      }
    }

    return [events, total];
  }

  // TODO: The type here is unnecessary
  async getEventsByTypesAndValues(
    type: "e" | "p" | "t",
    values: string[],
    filters: FiltersBase,
    memoryIds?: string[]
  ): Promise<[EventBaseSigned[], number]> {
    const tx = this.db?.transaction("tags", "readonly");
    const store = tx?.objectStore("tags");
    const index = store?.index("typeAndValue");

    const eventIds = [];
    const events: EventBaseSigned[] = [];
    let total = 0;

    for (const value of values) {
      let cursor = await index?.openCursor([type, value], "prev");
      while (cursor) {
        const ev = cursor.value;

        const isInMemory = memoryIds && memoryIds.includes(ev.eventId);
        if (!isInMemory) {
          eventIds.push(ev.eventId);
        }

        total++;

        if (total > 500) {
          break;
        }
        cursor = await cursor.continue();
      }
    }

    for (const id of eventIds) {
      const event = await this.getEvent(id);
      if (event) {
        const isIdInMemory = memoryIds && memoryIds.includes(event.id);
        const isWithinLimit = filters.limit
          ? events.length < filters.limit
          : true;
        const match = eventMatchesFilters(filters, event);
        if (!isIdInMemory && match) {
          total++;
          if (isWithinLimit) {
            events.push(event);
          }
        }
      }
    }

    return [events, total];
  }

  async getEvents(
    filters: FiltersBase,
    memory?: {
      eventIds: string[];
    }
  ): Promise<[EventBaseSigned[], number]> {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    const {
      kinds,
      authors,
      "#e": eTags,
      "#p": pTags,
      "#t": tTags,
      since = Date.now() - ONE_DAY,
      until = Date.now(),
      limit = 20,
    } = filters;

    const inMemory = memory && memory.eventIds ? memory.eventIds : [];

    if (authors && authors.length > 0 && kinds && kinds.length > 0) {
      return this.getEventsByPublicKeysAndKinds(filters, inMemory);
    }

    // TODO
    if (tTags && tTags.length > 0) {
      return this.getEventsByTypesAndValues("t", tTags, filters, inMemory);
    }

    // TODO
    if (eTags && eTags.length > 0) {
      return this.getEventsByTypesAndValues("e", eTags, filters, inMemory);
    }

    // TODO
    if (pTags && pTags.length > 0) {
      return this.getEventsByTypesAndValues("p", pTags, filters, inMemory);
    }

    let events: EventBaseSigned[] = [];
    let total = 0;

    try {
      const tx = this.db.transaction("events", "readonly");
      const store = tx.objectStore("events");
      const index = store.index("created_at");

      console.log(
        `RANGE --- ${new Date(since * 1000).toLocaleString()} -> ${new Date(
          until * 1000
        ).toLocaleString()}`
      );

      // Open database cursor
      let cursor = await index.openCursor(
        IDBKeyRange.bound(since, until),
        "prev"
      );

      while (cursor) {
        const ev: EventBaseSigned = cursor.value;

        const isIdInMemory = inMemory.includes(ev.id);
        const isWithinLimit = filters.limit
          ? events.length < filters.limit
          : true;
        const match = eventMatchesFilters(filters, ev);

        if (!isIdInMemory && isNotReply(ev) && match) {
          total++;
          if (isWithinLimit) {
            events.push(ev);
          }
        }

        // total 1000; stop
        if (total >= 500) {
          break;
        }

        cursor = await cursor.continue();
      }
    } catch (err) {
      console.error("An error occurred:", err);
      throw err;
    }

    return [events, total];
  }

  async lastEventTimestamp(
    filters: FiltersBase,
    kind: NEVENT_KIND = NEVENT_KIND.SHORT_TEXT_NOTE
  ): Promise<number | undefined> {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    const hasAuthorFilter = filters.authors && filters.authors.length > 0;

    if (hasAuthorFilter) {
      const transaction = this.db.transaction("events", "readonly");
      const store = transaction.objectStore("events");
      const index = store.index("kindAndPubkey");
      const cursor = await index.openCursor(
        IDBKeyRange.only([kind, filters.authors[0]]),
        "prev"
      );
      if (!cursor) return undefined;
      return cursor.value.created_at;
    } else {
      const transaction = this.db.transaction("events", "readonly");
      const store = transaction.objectStore("events");
      const index = store.index("kind");
      const cursor = await index.openCursor(IDBKeyRange.only(kind), "prev");
      if (!cursor) return undefined;
      return cursor.value.created_at;
    }
  }

  async getRelatedEvents(
    id: string,
    kinds: NEVENT_KIND[]
  ): Promise<EventBaseSigned[]> {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    // Fetch all related event IDs
    const transactionForTags = this.db.transaction("tags", "readonly");
    const tagsStore = transactionForTags.objectStore("tags");
    const tagsIndex = tagsStore.index("typeAndValue");
    const allRelated = await tagsIndex.getAll(["e", id]);

    const relatedEventIds = allRelated.map((r) => r.eventId);

    // Fetch all events in a single transaction
    const transactionForEvents = this.db.transaction("events", "readonly");
    const eventsStore = transactionForEvents.objectStore("events");

    const allEvents: EventBaseSigned[] = [];

    for (const eventId of relatedEventIds) {
      const event = await eventsStore.get(eventId);
      if (event && kinds.includes(event.kind)) {
        allEvents.push(new NEvent(event));
      }
    }

    return allEvents;
  }

  async saveEvent(event: EventBaseSigned) {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    try {
      await this.db.add("events", event);
    } catch (err) {
      const error = err as DOMException;
      if (error.name !== "ConstraintError") {
        console.error("An error occurred:", error.message);
      }
    }

    if (event.tags) {
      const tags = event.tags.filter((tag) => DEFAULT_TAGS.includes(tag[0]));
      if (tags.length === 0) return;

      for (const tag of tags) {
        try {
          await this.db.add("tags", {
            eventId: event.id,
            id: `${event.id.slice(0, 10)}-${tag[0]}-${tag[1].slice(0, 10)}}`,
            type: tag[0],
            value: tag[1],
          });
        } catch (err) {
          const error = err as DOMException;
          if (error.name !== "ConstraintError") {
            console.error("An error occurred:", error.message);
          }
        }
      }
    }
    return;
  }

  /**
   * Will make sure it's actually the newest event of this type
   * - if newer, save and return id
   */
  async saveEventAndDeleteOlderOfType(
    event: EventBaseSigned
  ): Promise<IDBValidKey | undefined> {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    // Fetch all events of the same kind and public key
    const sameKind = await this.getEventsByPublicKeysAndKinds(
      new NFilters({
        authors: [event.pubkey],
        kinds: [event.kind],
        since: 0,
        until: Date.now(),
      })
    );

    const createdAt = event.created_at;

    // Separate events into older, newer, and keep only the newest among the new ones
    const older = sameKind[0].filter((record) => record.created_at < createdAt);
    const newer = sameKind[0].filter(
      (record) => record.created_at >= createdAt
    ); // Notice the change here
    const newest =
      newer.length > 0
        ? newer.reduce((acc, cur) =>
            cur.created_at >= acc.created_at ? cur : acc
          )
        : null;

    // Delete older events
    for (const record of older) {
      await this.db.delete("events", record.id);
    }

    // If newest exists and is the same or newer, return its ID
    if (newest && newest.created_at >= createdAt) {
      return newest.id; // Return the ID of the newest (or same) event
    } else {
      // Add the event only if there are no newer events
      return this.db.add("events", event); // Return the ID of the newly added event
    }
  }

  async deleteEventByPublicKey(pubkey: string) {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    const tx = this.db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    const index = store.index("pubkey");

    let cursor = await index.openCursor(pubkey);

    const eventIds: string[] = [];

    while (cursor) {
      const event = cursor.value;
      if (event.pubkey === pubkey) {
        eventIds.push(event.id);
        await store.delete(event.id);
      }
      cursor = await cursor.continue();
    }

    const txTags = this.db.transaction("tags", "readwrite");
    const storeTags = txTags.objectStore("tags");
    const indexTags = storeTags.index("value");

    for (const id of eventIds) {
      let cursor = await indexTags.openCursor(id);

      while (cursor) {
        const tag = cursor.value;
        if (tag.value === id) {
          await storeTags.delete(tag.id);
        }
        cursor = await cursor.continue();
      }
    }
  }

  async createList(payload: CreateListRecord): Promise<void> {
    if (!this.db) {
      throw new Error("=> DATABASE: not ready");
    }
    await this.db.add("lists", {
      ...payload,
      id: nanoid(),
    });
  }

  async updateList(id: string, payload: CreateListRecord): Promise<void> {
    if (!this.db) {
      throw new Error("=> DATABASE: not ready");
    }
    const record = await this.db.get("lists", id);
    await this.db.put("lists", Object.assign(record, payload));
  }

  async deleteList(id: string): Promise<void> {
    if (!this.db) {
      throw new Error("=> DATABASE: not ready");
    }
    await this.db.delete("lists", id);
  }

  async getAllLists(): Promise<ProcessedListRecord[] | undefined> {
    if (!this.db) {
      throw new Error("=> DATABASE: not ready");
    }

    const lists: ListRecord[] = await this.db.getAll("lists");

    // Use Promise.all to wait for all list processing to complete
    const processedLists = await Promise.all(
      lists.map(async (list) => {
        if (list.userPubkeys) {
          // Use Promise.all to wait for all users to be fetched
          const users = await Promise.all(
            list.userPubkeys.map(async (pubkey) => {
              const user = await this.getUser(pubkey);
              return user;
            })
          );

          return {
            ...list,
            users,
          } as ProcessedListRecord;
        } else {
          return list;
        }
      })
    );

    return processedLists;
  }

  async getList(id: string): Promise<ProcessedListRecord | undefined> {
    if (!this.db) {
      throw new Error("=> DATABASE: not ready");
    }
    const list: ListRecord = await this.db.get("lists", id);
    if (list.userPubkeys) {
      const users: UserRecord[] = [];
      for (const pubkey of list.userPubkeys) {
        const user = await this.getUser(pubkey);
        if (user) {
          users.push(user);
        }
      }
      return {
        ...list,
        users,
      };
    } else {
      return list;
    }
  }

  async getListsWithUser(pubkey: string): Promise<ListRecord[] | undefined> {
    if (!this.db) {
      throw new Error("=> DATABASE: not ready");
    }
    const tx = this.db.transaction("lists", "readonly");
    const listStore = tx.objectStore("lists");
    const userIndex = listStore.index("users");
    return userIndex.getAll(pubkey);
  }

  async addUserToList(id: string, pubkey: string): Promise<void> {
    if (!this.db) {
      throw new Error("=> DATABASE: not ready");
    }
    const list: ListRecord = await this.db.get("lists", id);
    if (list && list.userPubkeys) {
      if (!list.userPubkeys.includes(pubkey)) {
        list.userPubkeys.push(pubkey);
        await this.updateList(id, list);
      } else {
        throw new Error("User already in list");
      }
    } else {
      list.userPubkeys = [pubkey];
      await this.updateList(id, list);
    }
  }

  async removeUserFromList(id: string, pubkey: string): Promise<void> {
    if (!this.db) {
      throw new Error("=> DATABASE: not ready");
    }
    const list: ListRecord = await this.db.get("lists", id);
    if (list && list.userPubkeys) {
      list.userPubkeys = list.userPubkeys.filter((p) => p !== pubkey);
      await this.updateList(id, list);
    }
  }

  async getPopularRelated(since: number, until: number) {
    if (!this.db) throw new Error("=> DATABASE: not ready");

    const tx = this.db.transaction("events", "readonly");
    const store = tx.objectStore("events");
    const index = store.index("created_at");

    let cursor = await index.openCursor(
      IDBKeyRange.bound(since, until),
      "prev"
    );

    let recordCount = 0;
    let maxRecords = 10000;
    let events: { [id: string]: number } = {};

    while (cursor) {
      recordCount++;
      const { id, tags } = cursor.value as {
        id: string;
        tags: string[][];
      };

      const eTag = tags.find((t) => t[0] === "e");
      if (eTag) {
        events[eTag[1]] = (events[eTag[1]] || 0) + 1;
      }

      if (recordCount > maxRecords) {
        break;
      }

      cursor = await cursor.continue();
    }

    events = sortAndTrimPopular(events, 50);
    return events;
  }

  async calculatePopular(timeInSeconds?: number) {
    const since = Math.round(
      Date.now() / 1000 - (timeInSeconds || ONE_DAY * 3)
    );
    const until = Math.round(Date.now() / 1000);

    const startTime = Date.now();

    let users: { [pubkey: string]: number } = {};
    let events: { [id: string]: number } = {};

    if (!this.db) throw new Error("=> DATABASE: not ready");

    const popularRelated = await this.getPopularRelated(since, until);

    const tx = this.db.transaction("events", "readonly");
    const store = tx.objectStore("events");

    for (const id of Object.keys(popularRelated)) {
      const event = await store.get(id);
      if (event) {
        const { pubkey } = event;
        users[pubkey] = (users[pubkey] || 0) + 1;
        events[id] = (events[id] || 0) + 1;
      }
    }

    users = sortAndTrimPopular(users);
    events = sortAndTrimPopular(events);

    const took = Date.now() - startTime;
    console.log(`=> WORKER: Took ${took}ms to calculate popular`);

    return { users, events };
  }
}
