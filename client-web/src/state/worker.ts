import {
  NEvent,
  RELAY_MESSAGE_TYPE,
  ProcessedEvent,
  EventBase,
  NFilters,
  NEVENT_KIND,
  NUserBase,
  Relay,
  WebSocketEvent,
  PublishingQueueItem,
  CountRequest,
  PublishingRequest,
  RelaySubscription,
  SubscriptionOptions,
  CLIENT_MESSAGE_TYPE,
  RelaysWithIdsOrKeys,
  AuthRequest,
  EventsRequest,
  CloseRequest,
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
  eventsMap: Map<string, ProcessedEvent> = new Map();
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
    url: string,
    options: {
      isEnabled?: boolean;
      read?: boolean;
      write?: boolean;
    }
  ) {
    for (const relay of this.client?.relays || []) {
      if (relay.url === url) {
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

  async subscribe(
    payload: CountRequest | AuthRequest | EventsRequest | CloseRequest
  ) {
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
  addEvent(payload: ProcessedEvent) {
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
  updateEvent(payload: ProcessedEvent) {
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
  async getUser(pubkey: string) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const data = await this.db.get("users", pubkey);
    return data
      ? {
          user: new NUser(data.user),
          relayUrls: data.relayUrls,
        }
      : undefined;
  }

  async addUser(payload: UpdateUserRecord) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const { user } = payload;
    await this.db.put("users", {
      user,
      relayUrls: payload.relayUrls,
    });
  }
  async updateUser(payload: UpdateUserRecord) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const record = await this.db.get("users", payload.user.pubkey);
    await this.db.put("users", {
      user: payload.user ? payload.user : record.user,
      relayUrls: payload.relayUrls ? payload.relayUrls : record.relayUrls,
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

  async processEvent(payload: WebSocketEvent, count: number = 0) {
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
          // TODO: This doesn't cover events that are replies to other events; needs rewrite
          // maybe a level? 0, 1, 2 and then do the rest durin the render step
          const exists = event.id ? this.eventsMap.has(event.id) : false;

          // TODO: It's probably better to check hasEventTags first to ensure replies are assigned
          // if (exists) {
          //   return;
          // }

          if (!event.pubkey) {
            return;
          }

          const newEvent: ProcessedEvent = {
            event: new NEvent(event),
            eventRelayUrls: [payload.meta.url as string],
          };

          const data = await this.getUser(event.pubkey);
          if (data) {
            newEvent.user = data.user;
          }

          const mentions = newEvent.event.hasMentions();
          if (mentions) {
            mentions.map(async (mention) => {
              const user = await this.getUser(mention);
              if (user) {
                if (newEvent.mentions) {
                  newEvent.mentions.push(user.user);
                } else {
                  newEvent.mentions = [user.user];
                }
              } else {
                if (newEvent.mentions) {
                  newEvent.mentions.push(new NUserBase({ pubkey: mention }));
                } else {
                  newEvent.mentions = [new NUserBase({ pubkey: mention })];
                }
              }
            });
          }

          // Check if event is a response to another event
          const eventTags = newEvent.event.hasEventTags();
          if (eventTags) {
            const rootTag = eventTags.find((tag) => tag.marker === "root");
            // let replyTag = eventTags.find((tag) => tag.marker === "reply");

            if (rootTag) {
              const eventId = rootTag.eventId;

              const origEvent = this.eventsMap.get(eventId);
              if (origEvent) {
                if (origEvent.replies) {
                  const exist = origEvent.replies.find(
                    (reply) => reply.event.id === newEvent.event.id
                  );
                  if (!exist) {
                    origEvent.replies.push({
                      ...newEvent,
                    });
                  }
                } else {
                  origEvent.replies = [
                    {
                      ...newEvent,
                    },
                  ];
                }
                this.updateEvent(origEvent);
                console.log(`Reply event added to event ${origEvent.event.id}`);
                return;
              }
              for (const ev of this.eventsMap.values()) {
                if (ev.replies) {
                  const exist = ev.replies.find(
                    (reply) => reply.event.id === newEvent.event.id
                  );
                  if (!exist) {
                    ev.replies.push({
                      ...newEvent,
                    });
                    this.updateEvent(ev);
                    console.log(`Reply event added to event ${ev.event.id}`);
                    return;
                  }
                }
              }
              // If we cannot find the root event, skip the reply for now
              if (count < 3) {
                setTimeout(() => {
                  this.processEvent(payload, count + 1);
                }, 1000);
              }
              return;
            }
          }

          if (exists) {
            return;
          }

          this.addEvent(newEvent);
        });
      } else if (kind === NEVENT_KIND.ZAP_RECEIPT) {
        incomingQueue.enqueueBackground(async () => {
          const event = payload.data[2] as EventBase;

          if (!event.pubkey) {
            return;
          }

          const ev = new NEvent(event);
          const user = await this.getUser(ev.pubkey);
          const tags = ev.hasEventTags();
          const hasRootTag = tags?.find((tag) => tag.marker === "root");
          if (hasRootTag) {
            const rootEvent = this.eventsMap.get(hasRootTag.eventId);
            if (rootEvent) {
              if (rootEvent.zapReceipt) {
                rootEvent.zapReceipt.push({
                  event: ev,
                  user: user?.user,
                });
              } else {
                rootEvent.zapReceipt = [
                  {
                    event: ev,
                    user: user?.user,
                  },
                ];
              }
              this.updateEvent(rootEvent);
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
              relayUrls: [payload.meta.url as string],
            });
            await this.updateUserFollowing({
              user: newUser,
              relayUrls: [payload.meta.url as string],
            });
          } else {
            await this.addUser({
              user: newUser,
              relayUrls: [payload.meta.url as string],
            });
            await this.updateUserFollowing({
              user: newUser,
              relayUrls: [payload.meta.url as string],
            });
          }

          for (const item of this.eventsMap.values()) {
            let changed = false;
            if (item.event.pubkey === newUser.pubkey) {
              item.user = newUser;
              changed = true;
            }
            if (item.reactions) {
              item.reactions.map((reaction) => {
                if (reaction.event.pubkey === newUser.pubkey) {
                  reaction.user = newUser;
                  changed = true;
                }
              });
            }
            if (item.replies) {
              item.replies.map((reply) => {
                if (reply.event.pubkey === newUser.pubkey) {
                  reply.user = newUser;
                  changed = true;
                }
              });
            }
            if (item.mentions) {
              item.mentions.map((mention) => {
                if (mention.pubkey === newUser.pubkey) {
                  mention = newUser;
                  changed = true;
                }
              });
            }

            if (changed) {
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
          const data = await this.getUser(ev.pubkey);

          const eventIds = inResponse
            .filter((tag) => tag.eventId)
            .map((tag) => tag.eventId);

          for (const id of eventIds) {
            const event = this.eventsMap.get(id);
            if (event) {
              if (event.reactions && event.reactions.length) {
                event.reactions.push({
                  event: ev,
                  user: data?.user,
                });
              } else {
                event.reactions = [
                  {
                    event: ev,
                    user: data?.user,
                  },
                ];
              }
              console.log(`Reaction event added to L1 event ${event.event.id}`);
              this.updateEvent(event);
              return;
            }
          }

          for (const event of this.eventsMap.values()) {
            if (event.replies) {
              for (const eventId of eventIds) {
                const reply = event.replies.find(
                  (reply) => reply.event.id === eventId
                );
                if (reply) {
                  if (reply.reactions) {
                    reply.reactions.push({
                      event: ev,
                      user: data?.user,
                    });
                  } else {
                    reply.reactions = [
                      {
                        event: ev,
                        user: data?.user,
                      },
                    ];
                  }
                  console.log(
                    `Reaction event added to L2 event ${event.event.id}`
                  );
                  this.updateEvent(event);
                  return;
                }
              }
            }
          }
          return;
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
          const data = await this.getUser(ev.pubkey);

          const eventIds = inResponse
            .filter((tag) => tag.eventId)
            .map((tag) => tag.eventId);

          eventIds.map((id) => {
            const event = this.eventsMap.get(id);
            if (event) {
              if (event.reposts) {
                event.reposts.push({
                  event: ev,
                  user: data?.user,
                });
              } else {
                event.reposts = [
                  {
                    event: ev,
                    user: data?.user,
                  },
                ];
              }
              console.log(`Repost event added to event ${event.event.id}`);
              this.updateEvent(event);
              return;
            }
          });
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
        // TODO: Not sure if we should set it directly, or wait for the relay to send it back
        // this.addEvent({
        //   event: payload.event,
        //   eventRelayUrls: result.map((r) => r.relayUrl),
        // });
        // Set queue item
      }

      // TODO: This is bad
      this.addQueueItems(result);

      result.map((item) => {
        this.updateQueueItem({
          ...item,
        });
      });
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
      result.map((item) => {
        this.updateQueueItem({
          ...item,
        });
      });
      return result;
    } else {
      throw new Error("Failed to send event");
    }
  }

  clearEvents() {
    incomingQueue.clearPriority();
    this.eventsMap.clear();
    this.checkedEvents = [];
    this.checkedUsers = [];
  }

  async followUser({
    pubkey,
    relayUrls,
  }: {
    pubkey: string;
    relayUrls: string[];
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
        relayUrls,
      });
      relayUrls.map((relayUrl) => {
        this.requestInformation(
          {
            source: "users",
            idsOrKeys: [pubkey],
            relayUrl,
          },
          {
            timeoutIn: 10000,
          }
        );
      });
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
        relayUrls: string[];
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
    relayUrls?: string[];
  }): Promise<void> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const following = await this.db.get("following", payload.user.pubkey);
    if (following) {
      await this.db.put("following", {
        user: payload.user,
        relayUrls: payload.relayUrls ? payload.relayUrls : following.relayUrls,
      });
    }
  }

  async setViewSubscription(view: string, filters: NFilters) {
    const subs = this.getSubscriptions();
    const subIds = [];
    for (const sub of subs) {
      if (sub.options && sub.options.view) {
        subIds.push(sub.id);
      }
    }
    if (subIds.length > 0) {
      this.unsubscribe(subIds);
    }

    const relays = this.getRelays();

    await this.subscribe({
      type: CLIENT_MESSAGE_TYPE.REQ,
      filters: {
        ...filters,
        limit: filters.limit
          ? Math.round(filters.limit / relays.length)
          : undefined,
      },
      options: {
        view,
        timeoutIn: 15000,
      },
    });

    // TODO: This is not accurate
    setTimeout(async () => {
      await this.processActiveEvents(view);
    }, 1500);
    setTimeout(async () => {
      await this.processActiveEvents(view);
    }, 6000);
    setTimeout(async () => {
      await this.processActiveEvents(view);
    }, 12000);
  }

  removeViewSubscription(view: string) {
    const subs = this.getSubscriptions();
    const subIds = [];
    for (const sub of subs) {
      if (sub.options && sub.options.view === view) {
        subIds.push(sub.id);
      }
    }
    if (subIds.length > 0) {
      this.unsubscribe(subIds);
    }
  }

  async processActiveEvents(view: string) {
    const eventUserPubkeys: {
      pubkey: string;
      relayUrls: string[];
    }[] = [];

    // const eventIds: {
    //   id: string;
    //   relayUrls: string[];
    // }[] = [];

    const relEventIds: {
      id: string;
      relayUrls: string[];
    }[] = [];

    for (const entry of this.eventsMap.entries()) {
      const ev = entry[1];
      // TODO: Check if user is stale
      if (ev.event?.pubkey && !ev.user?.pubkey) {
        eventUserPubkeys.push({
          pubkey: ev.event.pubkey,
          relayUrls: ev.eventRelayUrls,
        });
      }
      // if (!ev.inResponseTo) {
      //   const tags = eventHasEventTags(ev.event);
      //   if (tags) {
      //     for (const tag of tags) {
      //       if (tag.marker === "root") {
      //         eventIds.push({
      //           id: tag.eventId,
      //           relayUrls: tag.relayUrl ? [tag.relayUrl] : ev.eventRelayUrls,
      //         });
      //       }
      //     }
      //   }
      // }
      if (!ev.reactions) {
        relEventIds.push({
          id: ev.event.id,
          relayUrls: ev.eventRelayUrls,
        });
      } else {
        ev.reactions.map((reaction) => {
          if (!reaction.user?.data) {
            eventUserPubkeys.push({
              pubkey: reaction.event.pubkey,
              relayUrls: ev.eventRelayUrls,
            });
          }
        });
      }
      if (ev.replies) {
        ev.replies.map((reply) => {
          if (!reply.user?.data) {
            eventUserPubkeys.push({
              pubkey: reply.event.pubkey,
              relayUrls: ev.eventRelayUrls,
            });
          }
          if (!reply.reactions) {
            relEventIds.push({
              id: reply.event.id,
              relayUrls: ev.eventRelayUrls,
            });
          }
        });
      }
      if (ev.mentions) {
        ev.mentions.map((mention) => {
          if (!mention.data) {
            eventUserPubkeys.push({
              pubkey: mention.pubkey,
              relayUrls: ev.eventRelayUrls,
            });
          }
        });
      }
    }

    const relayUrlToPubkeysMap: Record<string, Set<string>> = {};

    eventUserPubkeys.map((ev) => {
      for (const relayUrl of ev.relayUrls) {
        if (!relayUrlToPubkeysMap[relayUrl]) {
          relayUrlToPubkeysMap[relayUrl] = new Set();
        }
        relayUrlToPubkeysMap[relayUrl].add(ev.pubkey);
      }
    });

    const reqUsers: RelaysWithIdsOrKeys[] = Object.entries(
      relayUrlToPubkeysMap
    ).map(([relayUrl, pubkeysSet]) => {
      return {
        source: "users",
        relayUrl,
        idsOrKeys: [...pubkeysSet],
      };
    });

    // This map will keep track of relayUrls and their associated eventIds.
    const relayUrlToRelEventIdsMap: Record<string, Set<string>> = {};

    relEventIds.map((ev) => {
      for (const relayUrl of ev.relayUrls) {
        if (!relayUrlToRelEventIdsMap[relayUrl]) {
          relayUrlToRelEventIdsMap[relayUrl] = new Set();
        }
        relayUrlToRelEventIdsMap[relayUrl].add(ev.id);
      }
    });

    const reqRelEvents: RelaysWithIdsOrKeys[] = Object.entries(
      relayUrlToRelEventIdsMap
    ).map(([relayUrl, eventIdsSet]) => {
      return {
        source: "events:related",
        relayUrl,
        idsOrKeys: [...eventIdsSet],
      };
    });

    const infoRequestPromises = [];
    [...reqUsers, ...reqRelEvents].map((item) => {
      infoRequestPromises.push(
        this.requestInformation(item, {
          timeoutIn: 60000,
          view,
        })
      );
    });
  }

  async requestInformation(
    payload: RelaysWithIdsOrKeys,
    options: SubscriptionOptions
  ) {
    if (payload.idsOrKeys.length === 0) {
      return;
    }

    let filtered: string[] = [];

    if (payload.source === "events" || payload.source === "events:related") {
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
          kinds: [
            NEVENT_KIND.SHORT_TEXT_NOTE,
            NEVENT_KIND.LONG_FORM_CONTENT,
            NEVENT_KIND.REACTION,
            NEVENT_KIND.REPOST,
            NEVENT_KIND.ZAP_RECEIPT,
          ],
          ids: keys,
        });
      } else if (payload.source === "events:related") {
        filters = new NFilters({
          kinds: [
            NEVENT_KIND.SHORT_TEXT_NOTE,
            NEVENT_KIND.REACTION,
            NEVENT_KIND.REPOST,
          ],
          "#e": keys,
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
        relayUrls: [payload.relayUrl],
        options,
      });
      if (subs) {
        subscriptions.push(...subs);
      }
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

    const subIds: string[] = [];

    if (kinds) {
      eventIds.map((id) => {
        const subscription = subscriptions.find(
          (sub) =>
            sub.filters &&
            sub.filters["#e"]?.includes(id) &&
            sub.filters.kinds?.some((kind) => kinds.includes(kind))
        );
        if (subscription) {
          subIds.push(subscription.id);
        }
      });
    } else {
      eventIds.map((id) => {
        const subscription = subscriptions.find(
          (sub) => sub.filters && sub.filters["#e"]?.includes(id)
        );
        if (subscription) {
          subIds.push(subscription.id);
        }
      });
    }

    return subIds.length > 0 ? subIds : undefined;
  }
}

const worker = new WorkerClass();
expose(worker);
