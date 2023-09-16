import { IDBPDatabase, openDB } from "idb";
import {
  EventBaseSigned,
  FiltersBase,
  NEVENT_KIND,
  NEvent,
  ProcessedEventWithEvents,
  ProcessedUserBase,
  UserRecord,
} from "@nostr-ts/common";
import { NClientDB, dbMigration } from "./database-migration";
import { ONE_DAY, ONE_WEEK } from "./worker-extra";
import { CreateListRecord, ListRecord, ProcessedListRecord } from "./lists";
import { nanoid } from "nanoid";
import { NUser } from "../classes";

function // TODO
sortAndTrim(
  data: { [key: string]: number },
  max = 10
): { [key: string]: number } {
  const sorted = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, max);
  return Object.fromEntries(sorted);
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

export class Database {
  db: IDBPDatabase<NClientDB> | null;

  async init() {
    this.db = await openDB<NClientDB>("nostros", 1, {
      upgrade(database, oldVersion, newVersion, transaction) {
        dbMigration(database, oldVersion, newVersion, transaction);
      },
    });
  }

  async deleteAll() {
    if (!this.db) throw new Error("DB not initialized");

    await this.db.clear("events");
    await this.db.clear("users");
    await this.db.clear("tags");
  }

  /**
   * USER HANDLING
   */

  async getUser(pubkey: string) {
    if (!this.db) throw new Error("DB not initialized");

    return this.db.get("users", pubkey);
  }

  async getUsersByParam(key: "isBlocked" | "following") {
    if (!this.db) throw new Error("DB not initialized");

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

  async addUser(user: ProcessedUserBase) {
    if (!this.db) throw new Error("DB not initialized");

    return this.db.put("users", user);
  }

  async updateUser(pubkey: string, user: ProcessedUserBase) {
    if (!this.db) throw new Error("DB not initialized");

    return this.db.put("users", {
      ...user,
      user: {
        ...user.user,
        pubkey,
      },
    });
  }

  async countUsers() {
    if (!this.db) throw new Error("DB not initialized");

    return this.db.count("users");
  }

  /**
   * EVENT HANDLINE
   */

  async getEvent(id: string) {
    if (!this.db) throw new Error("DB not initialized");

    return this.db.get("events", id);
  }

  async getEvents(
    filters: FiltersBase,
    memory?: {
      eventIds: string[];
    }
  ): Promise<[NEvent[], number]> {
    if (!this.db) throw new Error("DB not initialized");

    const {
      kinds,
      authors,
      since = Date.now() - ONE_DAY,
      until = Date.now(),
      limit = 20,
    } = filters;

    let events: NEvent[] = [];
    let total = 0;

    try {
      const transaction = this.db.transaction("events", "readonly");
      const store = transaction.objectStore("events");
      const index = store.index("created_at");

      console.log(
        `RANGE --- ${new Date(since).toLocaleString()} -> ${new Date(
          until
        ).toLocaleString()}`
      );

      // Open database cursor
      let cursor = await index.openCursor(
        IDBKeyRange.bound(since, until),
        "prev"
      );

      while (cursor) {
        const { id, kind, pubkey, created_at } = cursor.value;

        const isKindMatch = !kinds || kinds.includes(kind);

        // Check if the event author is in the filter list, if provided
        const isAuthorMatch = !authors || authors.includes(pubkey);

        // Check if the event ID is already in memory
        const isIdInMemory = memory && memory.eventIds.includes(id);

        if (isAuthorMatch && !isIdInMemory) {
          total++;

          // Only add to the events array if we haven't reached the limit
          if (events.length < limit && isKindMatch) {
            events.push(cursor.value);
          }
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
    if (!this.db) throw new Error("DB not initialized");

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

  async getRelatedEvents(id: string, kinds: NEVENT_KIND[]) {
    if (!this.db) throw new Error("DB not initialized");

    const transaction = this.db.transaction("tags", "readonly");
    const store = transaction.objectStore("tags");
    const index = store.index("typeAndValue");
    const allRelated = await index.getAll(["e", id]);
    const allEvents = await Promise.all(
      allRelated.map((r) => this.db?.get("events", r.eventId))
    );
    return allEvents
      .filter((e) => kinds.includes(e.kind))
      .map((e) => new NEvent(e));
  }

  async saveEvent(event: EventBaseSigned) {
    if (!this.db) throw new Error("DB not initialized");

    const result = await this.db.put("events", event);
    if (event.tags) {
      for (const tag of event.tags) {
        if (tag[0] === "e" || tag[0] === "p") {
          await this.db?.add("tags", {
            eventId: event.id,
            id: `${event.id.slice(0, 10)}-${tag[0]}-${tag[1].slice(0, 10)}}`,
            type: tag[0],
            value: tag[1],
          });
        }
      }
    }

    return result;
  }

  async createList(payload: CreateListRecord): Promise<void> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    await this.db.add("lists", {
      ...payload,
      id: nanoid(),
    });
  }

  async updateList(id: string, payload: CreateListRecord): Promise<void> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const record = await this.db.get("lists", id);
    await this.db.put("lists", Object.assign(record, payload));
  }

  async deleteList(id: string): Promise<void> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    await this.db.delete("lists", id);
  }

  async getAllLists(): Promise<ProcessedListRecord[] | undefined> {
    if (!this.db) {
      throw new Error("DB not initialized");
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
      throw new Error("DB not initialized");
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
      throw new Error("DB not initialized");
    }
    const transaction = this.db.transaction("lists", "readonly");
    const listStore = transaction.objectStore("lists");
    const userIndex = listStore.index("users");
    return userIndex.getAll(pubkey);
  }

  async addUserToList(id: string, pubkey: string): Promise<void> {
    if (!this.db) {
      throw new Error("DB not initialized");
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
      throw new Error("DB not initialized");
    }
    const list: ListRecord = await this.db.get("lists", id);
    if (list && list.userPubkeys) {
      list.userPubkeys = list.userPubkeys.filter((p) => p !== pubkey);
      await this.updateList(id, list);
    }
  }

  async getPopularRelated(since: number, until: number) {
    if (!this.db) throw new Error("DB not initialized");

    const transaction = this.db.transaction("events", "readonly");
    const store = transaction.objectStore("events");
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

    events = sortAndTrim(events);
    return events;
  }

  async calculatePopular(timeInSeconds?: number) {
    const since = (Date.now() - (timeInSeconds * 1000 || ONE_WEEK)) / 1000;
    const until = Date.now() / 1000;

    const maxRecords = 10000;
    const startTime = Date.now();

    let users: { [pubkey: string]: number } = {};
    let events: { [id: string]: number } = {};

    if (!this.db) throw new Error("DB not initialized");

    const popularRelated = await this.getPopularRelated(since, until);

    for (const id of Object.keys(popularRelated)) {
      const event = await this.getEvent(id);
      if (event) {
        const { pubkey } = event;
        users[pubkey] = (users[pubkey] || 0) + 1;
        events[id] = (events[id] || 0) + 1;
      }
    }

    // const transaction = this.db.transaction("events", "readonly");
    // const store = transaction.objectStore("events");
    // const index = store.index("created_at");

    // let cursor = await index.openCursor(
    //   IDBKeyRange.bound(since, until),
    //   "prev"
    // );
    // let recordCount = 0;

    // while (cursor) {
    //   const { pubkey, id } = cursor.value as {
    //     pubkey: string;
    //     id: string;
    //   }; // Assuming types
    //   recordCount++;

    //   users[pubkey] = (users[pubkey] || 0) + 1;
    //   events[id] = (events[id] || 0) + 1;

    //   if (recordCount > maxRecords) {
    //     break;
    //   }

    //   // if (recordCount % 100 === 0) {
    //   //   await new Promise((r) => setTimeout(r, 100));
    //   // }

    //   // Refactor this into a function if used often
    //   if (recordCount % 1000 === 0) {
    //     users = sortAndTrim(users);
    //     events = sortAndTrim(events);
    //   }

    //   cursor = await cursor.continue();
    // }

    users = sortAndTrim(users);
    events = sortAndTrim(events);

    const took = Date.now() - startTime;
    console.log(`=> WORKER: Took ${took}ms to calculate popular`);

    return { users, events };
  }
}
