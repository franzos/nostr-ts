import {
  NEvent,
  RELAY_MESSAGE_TYPE,
  NEventWithUserBase,
  EventBase,
  NFilters,
  NEVENT_KIND,
  NUserBase,
  Relay,
  ClientSubscription,
  Subscribe,
  WebSocketEvent,
} from "@nostr-ts/common";
import { NUser, RelayClient } from "@nostr-ts/web";
import { IDBPDatabase, openDB } from "idb";
import { MAX_EVENTS } from "../defaults";
import { expose } from "comlink";
import { IncomingEventsQueue } from "./incoming-queue";
import { NClientDB, NClientWorker } from "./worker-types";
import { PublishingEventsQueueItem } from "./publishing-qeue";

const incomingQueue = new IncomingEventsQueue();

class WorkerClass implements NClientWorker {
  connected: boolean;
  db: IDBPDatabase<NClientDB> | null;
  client: RelayClient | null;
  eventsMap: Map<string, NEventWithUserBase> = new Map();
  maxEvents: number;
  checkedUsers: string[] = [];
  checkedEvents: string[] = [];

  eventsPublishingQueue: PublishingEventsQueueItem[] = [];

  followingUserIds: string[] = [];

  constructor(config?: { maxEvents?: number }) {
    this.connected = false;
    this.db = null;
    this.client = null;
    this.maxEvents = config?.maxEvents || MAX_EVENTS;
  }

  async init() {
    this.db = await openDB<NClientDB>("nostr-client", 1, {
      upgrade(db) {
        db.createObjectStore("users", { keyPath: "pubkey" });
        // db.createObjectStore("subscriptions", { keyPath: "subscriptionId" });
        db.createObjectStore("following", { keyPath: "pubkey" });
      },
    });
  }

  async connect(
    relays?: Relay[],
    options?: {
      autoLoadInfo?: boolean;
    }
  ) {
    this.client = new RelayClient(relays);
    if (options?.autoLoadInfo !== false) {
      await this.client.getRelayInformation();
    }
    this.client.listen(async (payload) => {
      await this.addEvent?.(payload);
    });
  }

  disconnect() {
    this.client?.unsubscribeAll();
    this.client?.disconnect();
    this.eventsMap.clear();
    this.connected = false;
  }

  getRelays() {
    return this.client?.relays
      ? this.client.relays.map((r) => {
          return r.getInfo("withInfo");
        })
      : [];
  }

  async getSubscriptions() {
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

  async addEvent(payload: WebSocketEvent) {
    if (!payload.data) {
      return;
    }
    // logRelayMessage(payload.data);

    const payLoadKind = payload.data[0];

    if (
      payLoadKind === RELAY_MESSAGE_TYPE.AUTH ||
      payLoadKind === RELAY_MESSAGE_TYPE.OK ||
      payLoadKind === RELAY_MESSAGE_TYPE.NOTICE ||
      payLoadKind === RELAY_MESSAGE_TYPE.COUNT ||
      payLoadKind === RELAY_MESSAGE_TYPE.EOSE
    ) {
      postMessage({
        type: "relay:message",
        data: payload,
      });

      if (payLoadKind === RELAY_MESSAGE_TYPE.OK) {
        const eventId = payload.data[1];
        const status = payload.data[2];
        const message = payload.data[3];
        const queueItem = this.eventsPublishingQueue.find(
          (item) => item.event.id === eventId
        );
        if (queueItem) {
          const relayId = payload.meta.id;
          for (const r of queueItem.relays) {
            if (r.id === relayId) {
              r.accepted = status;
              r.error = status === false ? message : undefined;
            }
          }
          postMessage({
            type: "event:queue:update",
            data: queueItem,
          });
        }
      }

      return;
    }

    // Handle incoming messages of type EVENT
    if (payLoadKind === RELAY_MESSAGE_TYPE.EVENT) {
      const kind = payload.data[2].kind;
      if (
        kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
        kind === NEVENT_KIND.LONG_FORM_CONTENT
      ) {
        incomingQueue.enqueuePriority(async () => {
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
                type: "event:new",
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
              type: "event:update",
              data: event,
            });
          }
        }
      } else if (kind === NEVENT_KIND.REACTION) {
        // console.log(`Reaction event received`);
        incomingQueue.enqueueBackground(async () => {
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
                type: "event:update",
                data: event,
              });
              // it's safe to assume that there's only one matching event
              return;
            }
          }
        });
      } else if (kind === NEVENT_KIND.REPOST) {
        // console.log(`Repost event received`);
        incomingQueue.enqueueBackground(async () => {
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
                type: "event:update",
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

  /**
   *
   * - Adds event to queue after sending
   * @param event
   * @returns
   */
  async sendEvent(event: EventBase, relayIds?: string[]) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    const ev = new NEvent(event);
    const result = this.client.sendEvent(ev, relayIds);
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
        postMessage({
          type: "event:new",
          data: {
            event: ev,
            eventRelayUrls: result.map((r) => r.relay.url),
          },
        });
      }

      const queueItem = {
        event: ev,
        send: true,
        relays: result.map((r) => {
          return {
            id: r.relay.id as string,
            send: true,
          };
        }),
      };
      this.eventsPublishingQueue.push(queueItem);
      postMessage({
        type: "event:queue:update",
        data: queueItem,
      });
      return result;
    } else {
      throw new Error("Failed to send event");
    }
  }

  clearEvents() {
    console.log(`WORKER: CLEAR EVENTS`);
    incomingQueue.clearPriority();
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
      await this.requestInformation("users", [pubkey]);
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

  async requestInformation(
    source: "events" | "users",
    idsOrKeys: string[],
    options?: {
      timeout?: number;
    }
  ) {
    if (idsOrKeys.length === 0) {
      return;
    }

    const timeout = options?.timeout || 10000;
    let filtered: string[] = [];

    if (source === "events") {
      filtered = idsOrKeys.filter((id) => !this.checkedEvents.includes(id));
      if (filtered.length === 0) {
        return;
      }
      this.checkedEvents = [...this.checkedEvents, ...filtered];
    } else if (source === "users") {
      filtered = idsOrKeys.filter(
        (pubkey) => !this.checkedUsers.includes(pubkey)
      );
      if (filtered.length === 0) {
        return;
      }
      this.checkedUsers = [...this.checkedUsers, ...filtered];
    }

    console.log(`=> Getting information for ${filtered.length} ${source}`);

    const subscriptions: ClientSubscription[] = [];

    // for 25 each
    for (let i = 0; i < filtered.length; i += 25) {
      const keys = filtered.slice(i, i + 25);
      let filters: NFilters;
      if (source === "events") {
        filters = new NFilters({
          kinds: [NEVENT_KIND.REACTION, NEVENT_KIND.REPOST],
          "#e": filtered,
        });
      } else if (source === "users") {
        filters = new NFilters({
          kinds: [NEVENT_KIND.METADATA],
          authors: keys,
        });
      } else {
        throw new Error("Invalid source");
      }
      const subs = await this.subscribe({ filters });
      if (subs) {
        subscriptions.push(...subs);
      }
    }

    if (subscriptions.length === 0) {
      setTimeout(() => {
        for (const subscription of subscriptions) {
          this.unsubscribe(subscription.subscriptionId);
        }
      }, timeout);
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
}

const worker = new WorkerClass();
expose(worker);
