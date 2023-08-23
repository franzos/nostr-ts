import {
  NEvent,
  RELAY_MESSAGE_TYPE,
  NEventWithUserBase,
  EventBase,
  NFilters,
  NEVENT_KIND,
  NUserBase,
  Relay,
  WebSocketEvent,
  PublishingQueueItem,
  SubscriptionRequest,
  CountRequest,
  PublishingRequest,
  RelaySubscription,
  SubscriptionOptions,
  CLIENT_MESSAGE_TYPE,
  RelaysWithIdsOrKeys,
} from "@nostr-ts/common";
import { NUser, RelayClient } from "@nostr-ts/web";
import { IDBPDatabase, openDB } from "idb";
import { MAX_EVENTS } from "../defaults";
import { expose } from "comlink";
import { IncomingEventsQueue } from "./incoming-queue";
import { NClientDB, NClientWorker } from "./worker-types";
import { UpdateUserRecord } from "./base-types";

const incomingQueue = new IncomingEventsQueue();

class WorkerClass implements NClientWorker {
  connected: boolean;
  db: IDBPDatabase<NClientDB> | null;
  client: RelayClient | null;
  eventsMap: Map<string, NEventWithUserBase> = new Map();
  maxEvents: number;
  checkedUsers: string[] = [];
  checkedEvents: string[] = [];

  eventsPublishingQueue: PublishingQueueItem[] = [];

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
        db.createObjectStore("users", { keyPath: "user.pubkey" });
        // db.createObjectStore("subscriptions", { keyPath: "subscriptionId" });
        db.createObjectStore("following", { keyPath: "user.pubkey" });
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
      await this.processEvent(payload);
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

  updateRelay(
    id: string,
    options: {
      isEnabled?: boolean;
      read?: boolean;
      write?: boolean;
    }
  ) {
    for (const relay of this.client?.relays || []) {
      if (relay.id === id) {
        if (typeof options.isEnabled !== "undefined") {
          relay.isEnabled = options.isEnabled;
        }
        if (typeof options.read !== "undefined") {
          relay.read = options.read;
        }
        if (typeof options.write !== "undefined") {
          relay.write = options.write;
        }
        break;
      }
    }
  }

  getSubscriptions() {
    return this.client?.getSubscriptions() || [];
  }

  /**
   * - Update client subscription
   * - Post message to main thread
   * @param payload
   */
  updateSubscription(payload: RelaySubscription) {
    this.client?.updateSubscription(payload);
    postMessage({
      type: "subscription:update",
      data: payload,
    });
  }

  async subscribe(payload: SubscriptionRequest) {
    return this.client?.subscribe(payload);
  }

  unsubscribe(ids: string[]) {
    return this.client?.unsubscribe(ids);
  }

  unsubscribeAll() {
    console.log(`WORKER: UNSUBSCRIBE ALL`);
    return this.client?.unsubscribeAll();
  }

  /**
   * - Add event to map
   * - Post message to main thread
   */
  addEvent(payload: NEventWithUserBase) {
    this.eventsMap.set(payload.event.id, payload);
    postMessage({
      type: "event:new",
      data: payload,
    });
  }

  /**
   * - Update event on map
   * - Post message to main thread
   */
  updateEvent(payload: NEventWithUserBase) {
    this.eventsMap.set(payload.event.id, payload);
    postMessage({
      type: "event:update",
      data: payload,
    });
  }

  setMaxEvents(max: number) {
    this.maxEvents = max;
  }

  /**
   * Add new items to worker queue
   * - Does not post message to main thread
   */
  addQueueItems(payload: PublishingQueueItem[]) {
    this.eventsPublishingQueue.push(...payload);
  }

  /**
   * - Update queue item
   * - Post message to main thread
   */
  updateQueueItem(payload: PublishingQueueItem) {
    const index = this.eventsPublishingQueue.findIndex(
      (item) => item.event.id === payload.event.id
    );
    if (index !== -1) {
      this.eventsPublishingQueue[index] = payload;
      postMessage({
        type: "event:queue:update",
        data: payload,
      });
    }
  }

  private relayIdsToUrls(relayIds: string[]): string[] {
    return this.getRelays()
      .filter((r) => relayIds.includes(r.id))
      .map((r) => r.url);
  }

  private relayUrlsToIds(relayUrls: string[]): string[] {
    return this.getRelays()
      .filter((r) => relayUrls.includes(r.url))
      .map((r) => r.id);
  }

  async getUser(pubkey: string) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const data = await this.db.get("users", pubkey);
    const relayIds = data ? this.relayUrlsToIds(data.relayUrls) : [];
    return data
      ? {
          user: new NUser(data.user),
          relayIds,
        }
      : undefined;
  }

  async addUser(payload: UpdateUserRecord) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const { user } = payload;
    const relayUrls = payload.relayIds
      ? this.relayIdsToUrls(payload.relayIds)
      : [];
    await this.db.put("users", {
      user,
      relayUrls,
    });
  }
  async updateUser(payload: UpdateUserRecord) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const record = await this.db.get("users", payload.user.pubkey);
    const relayUrls = payload.relayIds
      ? this.relayIdsToUrls(payload.relayIds)
      : record.relayUrls;
    await this.db.put("users", {
      user: payload.user,
      relayUrls,
    });
  }

  async countUsers() {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    return await this.db.count("users");
  }

  count(payload: CountRequest) {
    return this.client?.count(payload);
  }

  async processEvent(payload: WebSocketEvent) {
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
      /**
       * Mark event as published
       */
      incomingQueue.enqueueBackground(async () => {
        if (payLoadKind === RELAY_MESSAGE_TYPE.OK) {
          const eventId = payload.data[1];
          const status = payload.data[2];
          const message = payload.data[3];

          const itemIsQueued = this.eventsPublishingQueue.find(
            (item) => item.event.id === eventId
          );
          if (itemIsQueued) {
            this.updateQueueItem({
              ...itemIsQueued,
              accepted: status,
              error: status === false ? message : undefined,
            });

            postMessage({
              type: "relay:message",
              data: payload,
            });
          }

          return;
        } else if (payLoadKind === RELAY_MESSAGE_TYPE.EOSE) {
          const subscription = this.client?.getSubscriptions();
          const itemIsSubscription = subscription?.find(
            (item) => item.id === payload.data[1]
          );
          if (itemIsSubscription) {
            this.updateSubscription({
              ...itemIsSubscription,
              eose: true,
            });
          }

          postMessage({
            type: "relay:message",
            data: payload,
          });

          return;
        } else if (payLoadKind === RELAY_MESSAGE_TYPE.COUNT) {
          const subscription = this.client?.getSubscriptions();
          const itemIsSubscription = subscription?.find(
            (item) => item.id === payload.data[1]
          );
          if (itemIsSubscription) {
            this.updateSubscription({
              ...itemIsSubscription,
              result: JSON.stringify(payload.data[2]),
            });
          }

          return;
        } else if (payLoadKind === RELAY_MESSAGE_TYPE.NOTICE) {
          const subscription = this.client?.getSubscriptions();
          const itemIsSubscription = subscription?.find(
            (item) => item.id === payload.data[1]
          );
          if (itemIsSubscription) {
            this.updateSubscription({
              ...itemIsSubscription,
              result: payload.data[1],
            });
          }

          postMessage({
            type: "relay:message",
            data: payload,
          });

          return;
        }
      });
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
            return;
          }

          // Check if event already exists
          const exists = event.id ? this.eventsMap.has(event.id) : false;

          if (!exists) {
            if (event.pubkey) {
              const newEvent: NEventWithUserBase = {
                event: new NEvent(event),
                eventRelayIds: [payload.meta.id as string],
              };

              const data = await this.getUser(event.pubkey);
              if (data) {
                newEvent.user = data.user;
              }

              const mentions = newEvent.event.hasMentions();
              if (mentions) {
                for (const mention of mentions) {
                  const user = await this.getUser(mention);
                  if (user) {
                    if (newEvent.mentions) {
                      newEvent.mentions.push(user.user);
                    } else {
                      newEvent.mentions = [user.user];
                    }
                  }
                }
              }

              this.addEvent(newEvent);
            }
          }
        });
      } else if (kind === NEVENT_KIND.METADATA) {
        // Handle user metadata
        incomingQueue.enqueueBackground(async () => {
          const newUser = new NUserBase();
          const payloadUser = payload.data[2] as EventBase;
          newUser.fromEvent(payloadUser);

          const user = await this.getUser(newUser.pubkey);
          if (user) {
            await this.updateUser({
              user: newUser,
              relayIds: [payload.meta.id as string],
            });
            await this.updateUserFollowing({
              user: newUser,
              relayIds: [payload.meta.id as string],
            });
          } else {
            await this.addUser({
              user: newUser,
              relayIds: [payload.meta.id as string],
            });
            await this.updateUserFollowing({
              user: newUser,
              relayIds: [payload.meta.id as string],
            });
          }

          for (const item of this.eventsMap.values()) {
            if (item.event.pubkey === newUser.pubkey) {
              item.user = newUser;
              this.updateEvent(item);
            }
          }
        });
      } else if (kind === NEVENT_KIND.REACTION) {
        // Handle reaction
        incomingQueue.enqueuePriority(async () => {
          const ev = new NEvent(payload.data[2] as EventBase);

          const inResponse = ev.hasEventTags();
          if (!inResponse) {
            // TODO: Support users
            return;
          }

          const eventIds = inResponse
            .filter((tag) => tag.eventId)
            .map((tag) => tag.eventId);

          for (const id of eventIds) {
            const event = this.eventsMap.get(id);
            if (event) {
              if (event.reactions && event.reactions.length) {
                event.reactions.push(ev);
              } else {
                event.reactions = [ev];
              }
              console.log(`Reaction event added to event ${event.event.id}`);
              this.updateEvent(event);
            }
          }
        });
      } else if (kind === NEVENT_KIND.REPOST) {
        incomingQueue.enqueueBackground(async () => {
          const ev = new NEvent(payload.data[2] as EventBase);

          const inResponse = ev.hasEventTags();
          if (!inResponse) {
            console.log(`No response found for repost event`);
            // TODO: Support users
            return;
          }

          const eventIds = inResponse
            .filter((tag) => tag.eventId)
            .map((tag) => tag.eventId);

          for (const id of eventIds) {
            const event = this.eventsMap.get(id);
            if (event) {
              if (event.reposts) {
                event.reposts.push(ev);
              } else {
                event.reposts = [ev];
              }
              console.log(`Repost event added to event ${event.event.id}`);
              this.updateEvent(event);
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
  async sendEvent(payload: PublishingRequest) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    const result = this.client.sendEvent(payload);
    if (result) {
      const kind = payload.event.kind;
      const queued = [
        NEVENT_KIND.SHORT_TEXT_NOTE,
        NEVENT_KIND.LONG_FORM_CONTENT,
        NEVENT_KIND.RECOMMEND_RELAY,
      ];
      if (queued.includes(kind)) {
        // Set event
        this.addEvent({
          event: payload.event,
          eventRelayIds: result.map((r) => r.relayId),
        });
        // Set queue item
      }

      // TODO: This is bad
      this.addQueueItems(result);

      for (const item of result) {
        this.updateQueueItem({
          ...item,
        });
      }
      return result;
    } else {
      throw new Error("Failed to send event");
    }
  }

  sendQueueItems(payload: PublishingQueueItem[]) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }
    this.addQueueItems(payload);
    const result = this.client.sendQueueItems(payload);
    if (result) {
      for (const item of result) {
        this.updateQueueItem({
          ...item,
        });
      }
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

  async followUser({
    pubkey,
    relayIds,
  }: {
    pubkey: string;
    relayIds: string[];
  }) {
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
      await this.db.put("following", {
        user: newFollowing,
        relayIds,
      });
      for (const relayId of relayIds) {
        await this.requestInformation(
          {
            source: "users",
            idsOrKeys: [pubkey],
            relayId,
          },
          {
            timeout: 10000,
            timeoutAt: Date.now() + 10000,
          }
        );
      }
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

  async getAllUsersFollowing(): Promise<
    | {
        user: NUserBase;
        relayIds: string[];
      }[]
    | undefined
  > {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const users = await this.db.getAll("following");
    this.followingUserIds = users.map((user) => user.pubkey);
    return users;
  }

  async updateUserFollowing(payload: {
    user: NUserBase;
    relayIds?: string[];
  }): Promise<void> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const following = await this.db.get("following", payload.user.pubkey);
    if (following) {
      await this.db.put("following", {
        user: payload.user,
        relayIds: payload.relayIds ? payload.relayIds : following.relayIds,
      });
    }
  }

  async requestInformation(
    payload: RelaysWithIdsOrKeys,
    options: SubscriptionOptions
  ) {
    if (payload.idsOrKeys.length === 0) {
      return;
    }

    const timeout = options?.timeout || 10000;
    let filtered: string[] = [];

    if (payload.source === "events") {
      filtered = payload.idsOrKeys.filter(
        (id) => !this.checkedEvents.includes(id)
      );
      if (filtered.length === 0) {
        return;
      }
      this.checkedEvents = [...this.checkedEvents, ...filtered];
    } else if (payload.source === "users") {
      filtered = payload.idsOrKeys.filter(
        (pubkey) => !this.checkedUsers.includes(pubkey)
      );
      if (filtered.length === 0) {
        return;
      }
      this.checkedUsers = [...this.checkedUsers, ...filtered];
    }

    console.log(
      `=> Getting information for ${filtered.length} ${payload.source}`
    );

    const subscriptions: RelaySubscription[] = [];

    // for 25 each
    for (let i = 0; i < filtered.length; i += 25) {
      const keys = filtered.slice(i, i + 25);
      let filters: NFilters;
      if (payload.source === "events") {
        filters = new NFilters({
          kinds: [NEVENT_KIND.REACTION, NEVENT_KIND.REPOST],
          "#e": filtered,
        });
      } else if (payload.source === "users") {
        filters = new NFilters({
          kinds: [NEVENT_KIND.METADATA],
          authors: keys,
        });
      } else {
        throw new Error("Invalid source");
      }
      const subs = await this.subscribe({
        type: CLIENT_MESSAGE_TYPE.REQ,
        filters,
        relayIds: [payload.relayId],
        options,
      });
      if (subs) {
        subscriptions.push(...subs);
      }
    }

    if (subscriptions.length > 0) {
      setTimeout(() => {
        this.unsubscribe(subscriptions.map((sub) => sub.id));
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
          subIds.push(subscription.id);
        }
      }
    } else {
      for (const id of eventIds) {
        const subscription = subscriptions.find((sub) =>
          sub.filters["#e"]?.includes(id)
        );
        if (subscription) {
          subIds.push(subscription.id);
        }
      }
    }

    return subIds.length > 0 ? subIds : undefined;
  }
}

const worker = new WorkerClass();
expose(worker);
