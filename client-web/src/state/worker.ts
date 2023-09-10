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
  UserRecord,
  ProcessedUserBase,
  UserPublicKeyAndRelays,
  LightProcessedEvent,
} from "@nostr-ts/common";
import { IDBPDatabase, openDB } from "idb";
import { MAX_EVENTS } from "../defaults";
import { expose } from "comlink";
import { IncomingEventsQueue } from "./incoming-queue";
import { NClientDB, NClientWorker } from "./worker-types";
import { NUser, RelayClient } from "@nostr-ts/web";
import {
  ListRecord,
  ProcessedEventKeys,
  ProcessedListRecord,
  WorkerEvent,
} from "./base-types";
import { nanoid } from "nanoid";

const incomingQueue = new IncomingEventsQueue();

function processedToLightProcessedEvent(
  event: ProcessedEvent
): LightProcessedEvent {
  return {
    event: event.event,
    user: event.user,
    eventRelayUrls: event.eventRelayUrls,
    reactionsCount:
      event && event.reactions
        ? event.reactions.reduce((acc, r) => {
            const content = r.event?.content ? r.event.content : undefined;
            if (content && acc[content]) {
              acc[content] += 1;
            } else if (content) {
              acc[content] = 1;
            }
            return acc;
          }, {} as { [key: string]: number })
        : {},
    repostsCount: event.reposts?.length || 0,
    badgeAwardsCount: event.badgeAwards?.length || 0,
    repliesCount: event.replies?.length || 0,
    mentionsCount: event.mentions?.length || 0,
    zapReceiptCount: event.zapReceipt?.length || 0,
    zapReceiptAmount: 0,
  };
}

class WorkerClass implements NClientWorker {
  connected: boolean;
  db: IDBPDatabase<NClientDB> | null;
  client: RelayClient | null;
  events: ProcessedEvent[];
  maxEvents: number;
  checkedUsers: string[] = [];
  checkedEvents: string[] = [];

  eventsPublishingQueue: PublishingQueueItem[] = [];

  followingUserIds: string[] = [];

  constructor(config?: { maxEvents?: number }) {
    this.connected = false;
    this.db = null;
    this.client = null;
    this.events = [];
    this.maxEvents = config?.maxEvents || MAX_EVENTS;
  }

  async init() {
    this.db = await openDB<NClientDB>("nostr-client", 3, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          // Initial version
          if (!db.objectStoreNames.contains("users")) {
            db.createObjectStore("users", { keyPath: "user.pubkey" });
          }
          if (!db.objectStoreNames.contains("following")) {
            db.createObjectStore("following", { keyPath: "user.pubkey" });
          }
        }

        if (oldVersion < 2) {
          if (db.objectStoreNames.contains("following")) {
            db.deleteObjectStore("following");
          }
        }

        if (oldVersion < 3) {
          // Make sure "lists" exists before trying to create an index on it.
          if (!db.objectStoreNames.contains("lists")) {
            db.createObjectStore("lists", { keyPath: "id" });
            const listStore = transaction.objectStore("lists");
            listStore.createIndex("users", "userPubkeys", { multiEntry: true });
          }
        }
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
    this.events = [];
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
    this.events.push(payload);
    this.events.sort((a, b) => {
      return b.event.created_at - a.event.created_at;
    });
    // postMessage({
    //   type: "event:new",
    //   data: payload,
    // });
  }

  /**
   * - Update event on map
   * - Post message to main thread
   */
  updateEvent(payload: ProcessedEvent, view?: string) {
    this.events.map((event) => {
      if (event.event.id === payload.event.id) {
        const workerEvent: WorkerEvent = {
          data: {
            type: "event:update",
            view: view || "",
            data: processedToLightProcessedEvent(payload),
          },
        };
        postMessage(workerEvent.data);
        return;
      }
      return;
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
    this.eventsPublishingQueue = this.eventsPublishingQueue.map((item) => {
      if (item.event.id === payload.event.id) {
        return payload;
      }
      return item;
    });
  }

  getQueueItems() {
    return this.eventsPublishingQueue;
  }

  async getUser(pubkey: string): Promise<UserRecord | undefined> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const data = await this.db.get("users", pubkey);
    return data
      ? {
          ...data,
          user: new NUser(data.user),
        }
      : undefined;
  }

  async addUser(payload: ProcessedUserBase) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const { user } = payload;
    await this.db.put("users", {
      user,
      relayUrls: payload.relayUrls,
    });
  }
  async updateUser(pubkey: string, payload: ProcessedUserBase) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const record = await this.db.get("users", pubkey);
    await this.db.put("users", Object.assign(record, payload));
  }

  async countUsers() {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    return await this.db.count("users");
  }

  count(pubkey: string) {
    return this.client?.count({
      type: CLIENT_MESSAGE_TYPE.COUNT,
      filters: new NFilters({
        kinds: [3],
        "#p": [pubkey],
      }),
      options: {
        timeoutIn: 10000,
      },
    });
  }

  countEvents() {
    return this.events.length;
  }

  async getEvent(id: string, view?: string) {
    const event = this.events.find((e) => e.event.id === id);
    if (event) {
      return processedToLightProcessedEvent(event);
    } else {
      await this.subscribe({
        type: CLIENT_MESSAGE_TYPE.REQ,
        filters: new NFilters({
          ids: [id],
        }),
        options: {
          timeoutIn: 10000,
          view,
        },
      });
    }
  }

  getEvents(params: { view: string; limit?: number; offset?: number }) {
    const limit = params.limit || this.events.length;
    const offset = params.offset || 0;
    this.events.slice(offset, offset + limit).map((event) => {
      const workerEvent: WorkerEvent = {
        data: {
          type: "event:new",
          view: params.view,
          data: processedToLightProcessedEvent(event),
        },
      };
      postMessage(workerEvent.data);
    });
    this.processSelectedEvents(
      params.view,
      this.events.slice(offset, offset + limit)
    );
  }

  async processEvent(payload: WebSocketEvent, count: number = 0) {
    if (!payload.data) {
      return;
    }

    const payLoadKind = payload.data[0];

    /**
     * Determine if related to subscription and view
     */

    let subscription: RelaySubscription | undefined = undefined;
    let associatedWithView: string | undefined = undefined;

    if (
      payLoadKind === RELAY_MESSAGE_TYPE.COUNT ||
      payLoadKind === RELAY_MESSAGE_TYPE.EOSE ||
      payLoadKind === RELAY_MESSAGE_TYPE.EVENT
    ) {
      subscription = this.client?.getSubscription(payload.data[1] as string);
      associatedWithView = subscription?.options?.view;
    }

    /**
     * Process Messages
     */

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
          if (subscription) {
            this.updateSubscription({
              ...subscription,
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

    /**
     * Handle events
     */

    if (payLoadKind === RELAY_MESSAGE_TYPE.EVENT) {
      const kind = payload.data[2].kind;
      if (
        kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
        kind === NEVENT_KIND.LONG_FORM_CONTENT
      ) {
        incomingQueue.enqueuePriority(async () => {
          const event = payload.data[2] as EventBase;

          if (this.events.length >= this.maxEvents * 2) {
            return;
          }

          // Check if event already exists
          // TODO: This doesn't cover events that are replies to other events; needs rewrite
          // maybe a level? 0, 1, 2 and then do the rest durin the render step
          const exists = event.id
            ? this.events.find((e) => e.event.id === event.id)
            : undefined;

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

          const userRecord = await this.getUser(event.pubkey);
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
            newEvent.user = userRecord.user;
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

            // Check if event with root tag exists
            if (rootTag) {
              const eventId = rootTag.eventId;

              const origEvent = this.events.find((e) => e.event.id === eventId);
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

                this.updateEvent(origEvent, associatedWithView);
                console.log(`Reply event added to event ${origEvent.event.id}`);
                return;
              }

              // Loop over all events; maybe reply of reply
              this.events.map((ev) => {
                if (ev.replies) {
                  const exist = ev.replies.find(
                    (reply) => reply.event.id === newEvent.event.id
                  );
                  if (!exist) {
                    ev.replies.push({
                      ...newEvent,
                    });
                    this.updateEvent(
                      {
                        ...ev,
                        replies: [
                          ...ev.replies,
                          {
                            ...newEvent,
                          },
                        ],
                      },
                      associatedWithView
                    );
                    console.log(`Reply event added to event ${ev.event.id}`);
                    return;
                  }
                }
              });
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
          const userRecord = await this.getUser(ev.pubkey);
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
          }
          const tags = ev.hasEventTags();
          const hasRootTag = tags?.find((tag) => tag.marker === "root");
          if (hasRootTag) {
            const rootEvent = this.events.find(
              (e) => e.event.id === hasRootTag.eventId
            );
            if (rootEvent) {
              const data = {
                eventRelayUrls: [payload.meta.url as string],
                event: ev,
                user: userRecord
                  ? userRecord?.user
                  : {
                      pubkey: ev.pubkey,
                    },
              };
              if (rootEvent.zapReceipt) {
                rootEvent.zapReceipt.push(data);
              } else {
                rootEvent.zapReceipt = [data];
              }

              this.updateEvent(rootEvent, associatedWithView);
            }
          }
        });
      } else if (kind === NEVENT_KIND.METADATA) {
        // Handle user metadata
        incomingQueue.enqueueBackground(async () => {
          const newUser = new NUserBase();
          const payloadUser = payload.data[2] as EventBase;
          newUser.fromEvent(payloadUser);

          const userRecord = await this.getUser(newUser.pubkey);
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
            await this.updateUser(newUser.pubkey, {
              user: newUser,
              relayUrls: [payload.meta.url as string],
            });
          } else {
            await this.addUser({
              user: newUser,
              relayUrls: [payload.meta.url as string],
            });
          }

          this.events.map((item) => {
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
              this.updateEvent(item, associatedWithView);
            }
          });
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
          const userRecord = await this.getUser(ev.pubkey);
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
          }

          const eventIds = inResponse
            .filter((tag) => tag.eventId)
            .map((tag) => tag.eventId);

          for (const id of eventIds) {
            const event = this.events.find((e) => e.event.id === id);
            if (event) {
              const data = {
                eventRelayUrls: [payload.meta.url as string],
                event: ev,
                user: userRecord
                  ? userRecord?.user
                  : {
                      pubkey: ev.pubkey,
                    },
              };
              if (event.reactions && event.reactions.length) {
                event.reactions.push(data);
              } else {
                event.reactions = [data];
              }
              this.updateEvent(event, associatedWithView);
              return;
            }
          }

          this.events.map((event) => {
            if (event.replies) {
              for (const eventId of eventIds) {
                const reply = event.replies.find(
                  (reply) => reply.event.id === eventId
                );
                if (reply) {
                  const data = {
                    eventRelayUrls: [payload.meta.url as string],
                    event: ev,
                    user: userRecord
                      ? userRecord.user
                      : {
                          pubkey: ev.pubkey,
                        },
                  };
                  if (reply.reactions) {
                    reply.reactions.push(data);
                  } else {
                    reply.reactions = [data];
                  }
                  this.updateEvent(event, associatedWithView);
                  return;
                }
              }
            }
          });

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
          const userRecord = await this.getUser(ev.pubkey);
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
          }

          const eventIds = inResponse
            .filter((tag) => tag.eventId)
            .map((tag) => tag.eventId);

          eventIds.map((id) => {
            const event = this.events.find((e) => e.event.id === id);
            if (event) {
              const data = {
                eventRelayUrls: [payload.meta.url as string],
                event: ev,
                user: userRecord
                  ? userRecord.user
                  : {
                      pubkey: ev.pubkey,
                    },
              };
              if (event.reposts) {
                event.reposts.push(data);
              } else {
                event.reposts = [data];
              }
              console.log(`Repost event added to event ${event.event.id}`);
              this.updateEvent(event, associatedWithView);
              return;
            }
          });
        });
      }
    }
  }

  getEventById(
    id: string,
    key?: ProcessedEventKeys
  ): Partial<LightProcessedEvent> | undefined {
    const event = this.events.find((e) => e.event.id === id);
    if (event) {
      if (key && event[key]) {
        if (key === "replies") {
          const ev = processedToLightProcessedEvent(event);
          return {
            ...ev,
            replies: event.replies
              ? event.replies.map((reply) => {
                  return processedToLightProcessedEvent(reply);
                })
              : undefined,
          } as Partial<LightProcessedEvent>;
        }
        return {
          eventRelayUrls: event.eventRelayUrls,
          [key]: event[key],
        } as Partial<LightProcessedEvent>;
      }
      return processedToLightProcessedEvent(event);
    }
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
    this.events = [];
    this.checkedEvents = [];
    this.checkedUsers = [];
  }

  async followUser({ pubkey, relayUrls }: UserPublicKeyAndRelays) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const user = await this.db.get("users", pubkey);
    if (user) {
      await this.updateUser(pubkey, {
        following: true,
      });
    } else {
      await this.addUser({
        user: new NUserBase({
          pubkey: pubkey,
        }),
        relayUrls,
        following: true,
      });
    }

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

    this.followingUserIds.push(pubkey);
  }

  async unfollowUser(pubkey: string) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    await this.updateUser(pubkey, {
      following: false,
    });
    this.followingUserIds = this.followingUserIds.filter((id) => id !== pubkey);
  }

  async followingUser(pubkey: string): Promise<boolean> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const user = await this.db.get("users", pubkey);
    return !!user.following;
  }

  async getAllUsersFollowing(): Promise<UserRecord[] | undefined> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }

    const tx = this.db.transaction("users", "readonly");
    const store = tx.objectStore("users");

    let cursor = await store.openCursor();
    const records: UserRecord[] = [];

    while (cursor) {
      if (cursor.value.following === true) {
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

  async blockUser(payload: UserPublicKeyAndRelays) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    const user = await this.db.get("users", payload.pubkey);
    if (user) {
      await this.updateUser(payload.pubkey, {
        isBlocked: true,
      });
    } else {
      await this.addUser({
        user: new NUserBase({
          pubkey: payload.pubkey,
        }),
        relayUrls: payload.relayUrls,
        isBlocked: true,
      });
    }
    this.events = this.events.filter(
      (event) => event.event.pubkey !== payload.pubkey
    );
  }

  async unblockUser(pubkey: string) {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    await this.updateUser(pubkey, {
      isBlocked: false,
    });
  }

  async getAllUsersBlocked(): Promise<UserRecord[] | undefined> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }

    const tx = this.db.transaction("users", "readonly");
    const store = tx.objectStore("users");

    let cursor = await store.openCursor();
    const records: UserRecord[] = [];

    while (cursor) {
      if (cursor.value.isBlocked === true) {
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

  async createList(payload: ListRecord): Promise<void> {
    if (!this.db) {
      throw new Error("DB not initialized");
    }
    await this.db.add("lists", {
      ...payload,
      id: nanoid(),
    });
  }

  async updateList(id: string, payload: ListRecord): Promise<void> {
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
      list.userPubkeys.map(async (pubkey) => {
        const user = await this.getUser(pubkey);
        if (user) {
          users.push(user);
        }
      });
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
    const userIndex = listStore.index("userPubkeys");
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

  currentViewSubscription = {
    view: "",
    limit: 0,
    offset: 0,
  };

  async setViewSubscription(
    view: string,
    filters: NFilters,
    options: {
      reset?: boolean;
      limit: number;
      offset: number;
    }
  ) {
    const subs = this.getSubscriptions();
    subs.map((sub) => {
      if (sub.options && sub.options.view === view) {
        this.unsubscribe([sub.id]);
      }
    });

    if (options && options.reset) {
      /**
       * Cleanup previous subscription
       */
      incomingQueue.clearPriority();
      this.clearEvents();
    }

    const relaysCount = this.getRelays().length;

    await this.subscribe({
      type: CLIENT_MESSAGE_TYPE.REQ,
      filters: {
        ...filters,
        limit: filters.limit
          ? Math.round(filters.limit / Math.round(relaysCount * 0.25))
          : undefined,
      },
      options: {
        view,
        timeoutIn: 15000,
      },
    });

    // TODO: This is not accurate
    setTimeout(async () => {
      await this.processActiveEvents(view, {
        limit: options?.limit,
        offset: options?.offset,
      });
    }, 1500);

    return {
      viewChanged: true,
    };
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

  processSelectedEvents(view: string, events: ProcessedEvent[]) {
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

    events.map((ev) => {
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
    });

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
    [...reqUsers].map((item) => {
      infoRequestPromises.push(
        this.requestInformation(item, {
          timeoutIn: 10000,
          view,
        })
      );
    });
    [...reqRelEvents].map((item) => {
      infoRequestPromises.push(
        this.requestInformation(item, {
          timeoutIn: 10000,
          view,
        })
      );
    });
  }

  async processActiveEvents(
    view: string,
    options: {
      limit: number;
      offset: number;
    }
  ) {
    const limit = options.limit;
    const offset = options.offset;

    this.processSelectedEvents(view, this.events.slice(offset, offset + limit));
  }

  async requestInformation(
    payload: RelaysWithIdsOrKeys,
    options: SubscriptionOptions
  ) {
    if (payload.idsOrKeys.length === 0) {
      return;
    }

    // let filtered: string[] = [];

    // if (payload.source === "events" || payload.source === "events:related") {
    //   filtered = payload.idsOrKeys.filter(
    //     (id) => !this.checkedEvents.includes(id)
    //   );
    //   if (filtered.length === 0) {
    //     return;
    //   }
    //   this.checkedEvents = [...this.checkedEvents, ...filtered];
    // } else if (payload.source === "users") {
    //   filtered = payload.idsOrKeys.filter(
    //     (pubkey) => !this.checkedUsers.includes(pubkey)
    //   );
    //   if (filtered.length === 0) {
    //     return;
    //   }
    //   this.checkedUsers = [...this.checkedUsers, ...filtered];
    // }

    const filtered = payload.idsOrKeys;

    console.log(
      `=> Getting information for ${filtered.length} ${payload.source}`
    );

    const subscriptions: RelaySubscription[] = [];

    // for 25 each
    const sliceSize = 50;
    for (let i = 0; i < filtered.length; i += sliceSize) {
      const keys = filtered.slice(i, i + sliceSize);
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
}

const worker = new WorkerClass();
expose(worker);
