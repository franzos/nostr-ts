import {
  NEvent,
  RELAY_MESSAGE_TYPE,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  WebSocketClientConfig,
  EventBase,
  NFilters,
  NEVENT_KIND,
  NUserBase,
  UserBase,
  Relay,
  ClientSubscription,
  Subscribe,
  WebSocketClientInfo,
} from "@nostr-ts/common";
import { NUser, RelayClient } from "@nostr-ts/web";
import { NEventWithUserBase } from "@nostr-ts/common";
import { IDBPDatabase, openDB } from "idb";
import { MAX_EVENTS } from "./defaults";
import { expose } from "comlink";

export interface NClientStoreBase {
  init(config?: { maxEvents?: number }): Promise<void>;
  connected: boolean;
  connect: (relays?: Relay[]) => void;
  disconnect: () => void;
  subscribe: (payload: Subscribe) => Promise<ClientSubscription[] | undefined>;
  subscriptions: () => Promise<ClientSubscription[]>;
  unsubscribe: (id: string) => void;
  unsubscribeAll: () => void;
  eventsMap?: Map<string, NEventWithUserBase>;
  maxEvents: number;
  getUser: (pubkey: string) => Promise<NUser | undefined>;
  addUser: (user: NUserBase) => Promise<void>;
  updateUser: (user: NUserBase) => Promise<void>;
  countUsers: () => Promise<number>;
  addEvent?: (payload: {
    data:
      | RelayAuth
      | RelayCount
      | RelayEose
      | RelayEvent
      | RelayNotice
      | RelayOK;
    meta: WebSocketClientConfig;
  }) => void;
  getEventById: (id: string) => void;
  followUser(pubkey: string): void;
  unfollowUser(pubkey: string): void;
  followingUser(pubkey: string): Promise<boolean>;
  // For reactive updates
  followingUserIds: string[];
  getAllUsersFollowing(): Promise<NUserBase[] | undefined>;
  updateUserFollowing(user: NUserBase): Promise<void>;
  getUserInformation(publicKeys: string[]): Promise<void>;
  hasSubscriptionForEventIds(
    eventIds: string[],
    kinds: NEVENT_KIND[]
  ): Promise<string[] | undefined>;
  getEventInformation(
    eventIds: string[],
    options?: {
      timeout?: number;
    }
  ): Promise<void>;
}

interface NClientDB {
  users: {
    key: string;
    value: UserBase;
    indexes: { pubkey: string };
  };
  following: {
    key: string;
    value: UserBase;
    indexes: { pubkey: string };
  };
}

function shuffle(array: string[]) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

/**
 *
 */
class EventsProcessingQueue {
  _priority: Promise<void>[];
  _background: Promise<void>[];
  _current: Promise<void>;

  constructor() {
    this._priority = [];
    this._background = [];
    this._current = Promise.resolve();
  }

  enqueuePriority(task: () => Promise<void>) {
    const taskPromise = this._current.then(() => task());
    this._priority.push(taskPromise);
    this._current = taskPromise.catch(() => {});
    return taskPromise;
  }

  enqueueBackground(task: () => Promise<void>) {
    const taskPromise = this._current.then(() => task());
    this._background.push(taskPromise);
    this._current = taskPromise.catch(() => {});
    return taskPromise;
  }

  clearPriority() {
    this._priority = [];
  }

  clearBackground() {
    this._background = [];
  }

  async process() {
    while (this._priority.length > 0 || this._background.length > 0) {
      const taskToRun = this._priority.shift() || this._background.shift();
      if (taskToRun) {
        await taskToRun;
      }
    }
    this._current = Promise.resolve();
  }

  clear() {
    this._priority = [];
    this._background = [];
    this._current = Promise.resolve();
  }
}

const queue = new EventsProcessingQueue();

export interface NClientStoreBaseWorker extends NClientStoreBase {
  checkedUsers: string[];
  checkedEvents: string[];

  sendEvent: (event: EventBase) => void;
  setMaxEvents: (max: number) => void;
  clearEvents: () => void;
  relays: () => WebSocketClientConfig[];
}

class WorkerClass implements NClientStoreBaseWorker {
  connected: boolean;
  db: IDBPDatabase<NClientDB> | null;
  client: RelayClient | null;
  eventsMap: Map<string, NEventWithUserBase> = new Map();
  maxEvents: number;
  checkedUsers: string[] = [];
  checkedEvents: string[] = [];
  followingUserIds: string[] = [];

  constructor(config?: { maxEvents?: number }) {
    this.connected = false;
    this.db = null;
    this.client = null;
    this.maxEvents = config?.maxEvents || MAX_EVENTS;
  }

  async init() {
    console.log(`WORKER: INIT DB`);
    this.db = await openDB<NClientDB>("nostr-client", 1, {
      upgrade(db) {
        db.createObjectStore("users", { keyPath: "pubkey" });
        // db.createObjectStore("subscriptions", { keyPath: "subscriptionId" });
        db.createObjectStore("following", { keyPath: "pubkey" });
      },
    });
    console.log(`WORKER: INIT DB DONE`);
  }

  connect(relays?: Relay[]) {
    this.client = new RelayClient(relays);
    console.log(this.client.getSubscriptions());
    this.client.listen(async (payload) => {
      await this.addEvent?.(payload);
    });
    ////
  }

  disconnect() {
    this.client?.unsubscribeAll();
    this.client?.disconnect();
    this.eventsMap.clear();
    this.connected = false;
  }

  relays() {
    return this.client?.relays
      ? this.client.relays.map((r) => {
          return {
            url: r.url,
            id: r.id,
          } as WebSocketClientInfo;
        })
      : [];
  }

  async subscriptions() {
    return this.client?.getSubscriptions() || [];
  }

  async subscribe(payload: Subscribe) {
    return this.client?.subscribe({
      ...payload,
      filters: new NFilters(payload.filters),
    });
  }

  unsubscribe(id: string) {
    return this.client?.unsubscribe(id);
  }

  unsubscribeAll() {
    return this.client?.unsubscribeAll();
  }

  setMaxEvents(max: number) {
    this.maxEvents = max;
  }

  async getUser(pubkey: string) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const user = await this.db.get("users", pubkey);
    if (user) {
      return new NUser(user);
    }
  }

  async addUser(user: NUserBase) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    await this.db.put("users", user);
  }

  async updateUser(user: NUserBase) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    await this.db.put("users", user);
  }

  async countUsers() {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    return await this.db.count("users");
  }

  async addEvent(payload: {
    data:
      | RelayAuth
      | RelayCount
      | RelayEose
      | RelayEvent
      | RelayNotice
      | RelayOK;
    meta: WebSocketClientConfig;
  }) {
    if (!payload.data) {
      return;
    }
    // logRelayMessage(payload.data);

    // Handle incoming messages of type EVENT
    if (payload.data[0] === RELAY_MESSAGE_TYPE.EVENT) {
      const kind = payload.data[2].kind;
      if (
        kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
        kind === NEVENT_KIND.LONG_FORM_CONTENT
      ) {
        queue.enqueuePriority(async () => {
          const event = payload.data[2] as EventBase;

          if (this.eventsMap.size >= this.maxEvents) {
            // console.log(
            //   `Events limit reached: ${this.eventsMap.size}/${this.maxEvents}`
            // );
            return;
          }

          // Check if event already exists
          const exists = event.id ? this.eventsMap.has(event.id) : false;

          if (!exists) {
            if (event.pubkey) {
              let newEvent;
              const user = await this.getUser(event.pubkey);
              if (user) {
                newEvent = {
                  event: new NEvent(event),
                  user: user,
                  eventRelayUrls: [payload.meta.url],
                };
              } else {
                newEvent = {
                  event: new NEvent(event),
                  eventRelayUrls: [payload.meta.url],
                };
              }

              this.eventsMap.set(newEvent.event.id, newEvent);
              postMessage({
                type: "new-event",
                data: newEvent,
              });
            }
          }
        });
      } else if (kind === NEVENT_KIND.METADATA) {
        const newUser = new NUserBase();
        newUser.fromEvent(payload.data[2]);

        const user = await this.getUser(newUser.pubkey);
        if (user) {
          await this.updateUser(newUser);
          await this.updateUserFollowing(user);
        } else {
          await this.addUser(newUser);
          await this.updateUserFollowing(newUser);
        }

        for (const event of this.eventsMap.values()) {
          if (event.user?.pubkey === newUser.pubkey) {
            event.user = newUser;
            postMessage({
              type: "update-event",
              data: event,
            });
          }
        }
      } else if (kind === NEVENT_KIND.REACTION) {
        // console.log(`Reaction event received`);
        queue.enqueueBackground(async () => {
          const ev = new NEvent(payload.data[2] as EventBase);

          const inResponse = ev.hasEventTags();
          if (!inResponse) {
            // TODO: Support users
            return;
          }

          for (const event of this.eventsMap.values()) {
            if (inResponse.find((tag) => tag.eventId === event.event.id)) {
              if (event.reactions) {
                event.reactions.push(ev);
              } else {
                event.reactions = [ev];
              }

              console.log(`Reaction event added to event ${event.event.id}`);
              postMessage({
                type: "update-event",
                data: event,
              });
              // it's safe to assume that there's only one matching event
              return;
            }
          }
        });
      } else if (kind === NEVENT_KIND.REPOST) {
        // console.log(`Repost event received`);
        queue.enqueueBackground(async () => {
          const ev = new NEvent(payload.data[2] as EventBase);

          const inResponse = ev.hasEventTags();
          if (!inResponse) {
            console.log(`No response found for repost event`);
            // TODO: Support users
            return;
          }

          for (const event of this.eventsMap.values()) {
            if (inResponse.find((tag) => tag.eventId === event.event.id)) {
              if (event.reposts) {
                event.reposts.push(ev);
              } else {
                event.reposts = [ev];
              }

              console.log(`Repost event found for ${event.event.id}`);
              postMessage({
                type: "update-event",
                data: event,
              });
              // it's safe to assume that there's only one matching event
              return;
            }
          }
        });
      }
    }
  }

  getEventById(id: string) {
    return this.eventsMap.get(id);
  }

  async sendEvent(event: EventBase) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    const ev = new NEvent(event);
    const result = this.client.sendEvent(ev);
    if (result) {
      if (
        event.kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
        event.kind === NEVENT_KIND.LONG_FORM_CONTENT ||
        event.kind === NEVENT_KIND.RECOMMEND_RELAY
      ) {
        this.eventsMap.set(ev.id, {
          event: ev,
          eventRelayUrls: result.map((r) => r.relay.url),
        });
      }
      return result;
    } else {
      throw new Error("Failed to send event");
    }
  }

  clearEvents() {
    console.log(`WORKER: CLEAR EVENTS`);
    queue.clearPriority();
    this.eventsMap.clear();
    this.checkedEvents = [];
    this.checkedUsers = [];
  }

  async followUser(pubkey: string) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const user = await this.db.get("users", pubkey);
    const following = await this.db.get("following", pubkey);
    if (user && !following) {
      this.db.add("following", user);
    } else if (!user && !following) {
      const newFollowing = new NUserBase({
        pubkey: pubkey,
      });
      await this.db.put("following", newFollowing);
      await this.getUserInformation([pubkey]);
    }
    this.followingUserIds.push(pubkey);
  }

  async unfollowUser(pubkey: string) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    await this.db.delete("following", pubkey);
    this.followingUserIds = this.followingUserIds.filter((id) => id !== pubkey);
  }

  async followingUser(pubkey: string): Promise<boolean> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const following = await this.db.get("following", pubkey);
    return !!following;
  }

  async getAllUsersFollowing(): Promise<NUserBase[] | undefined> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const users = await this.db.getAll("following");
    this.followingUserIds = users.map((user) => user.pubkey);
    return users;
  }

  async updateUserFollowing(user: NUserBase): Promise<void> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const following = await this.db.get("following", user.pubkey);
    if (following) {
      await this.db.put("following", user);
    }
  }

  async getUserInformation(publicKeys: string[]) {
    if (publicKeys.length === 0) {
      return;
    }

    const filteredPublicKeys = publicKeys.filter(
      (pubkey) => !this.checkedUsers.includes(pubkey)
    );

    if (filteredPublicKeys.length === 0) {
      return;
    }

    // if more than 20 publicKeys, randomize and select 20; otherwise use all
    const keys =
      filteredPublicKeys.length > 20
        ? shuffle(filteredPublicKeys).slice(0, 20)
        : filteredPublicKeys;

    if (keys.length === 0) {
      return;
    }

    console.log(`=> Getting information for ${keys.length} users`);
    const filters = new NFilters({
      kinds: [NEVENT_KIND.METADATA],
      authors: keys,
    });
    this.checkedUsers = [...this.checkedUsers, ...keys];
    const subscriptions = await this.subscribe({
      filters,
    });
    if (subscriptions) {
      setTimeout(() => {
        for (const subscription of subscriptions) {
          this.unsubscribe(subscription.subscriptionId);
        }
      }, 10000);
    }
  }

  async hasSubscriptionForEventIds(eventIds: string[], kinds?: NEVENT_KIND[]) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    const subscriptions = this.client?.getSubscriptions();
    if (!subscriptions) {
      return undefined;
    }

    const subIds = [];

    if (kinds) {
      for (const id of eventIds) {
        const subscription = subscriptions.find(
          (sub) =>
            sub.filters["#e"]?.includes(id) &&
            sub.filters.kinds?.some((kind) => kinds.includes(kind))
        );
        if (subscription) {
          subIds.push(subscription.subscriptionId);
        }
      }
    } else {
      for (const id of eventIds) {
        const subscription = subscriptions.find((sub) =>
          sub.filters["#e"]?.includes(id)
        );
        if (subscription) {
          subIds.push(subscription.subscriptionId);
        }
      }
    }

    return subIds.length > 0 ? subIds : undefined;
  }

  async getEventInformation(
    eventIds: string[],
    options: {
      timeout?: number;
    }
  ) {
    if (eventIds.length === 0) {
      return;
    }

    const timeout = options?.timeout || 120000;

    const filteredEventIds = eventIds.filter(
      (eventId) => !this.checkedEvents.includes(eventId)
    );

    if (filteredEventIds.length === 0) {
      return;
    }

    this.checkedEvents = [...this.checkedEvents, ...filteredEventIds];

    console.log(`=> Getting information for ${filteredEventIds.length} events`);

    const subscriptions: ClientSubscription[] = [];

    // for 25 each
    for (let i = 0; i < filteredEventIds.length; i += 25) {
      const ids = filteredEventIds.slice(i, i + 25);
      const filters = new NFilters({
        kinds: [NEVENT_KIND.REACTION, NEVENT_KIND.REPOST],
        "#e": ids,
      });

      const subs = await this.subscribe({
        filters,
      });
      if (subs) {
        subscriptions.push(...subs);
      }
    }

    if (subscriptions) {
      setTimeout(() => {
        for (const subscription of subscriptions) {
          this.unsubscribe(subscription.subscriptionId);
        }
      }, timeout);
    }
  }
}

const worker = new WorkerClass();
expose(worker);
