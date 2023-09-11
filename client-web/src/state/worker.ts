import {
  NEvent,
  RELAY_MESSAGE_TYPE,
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
  ProcessedEventWithEvents,
  EventBaseSigned,
  eventHasEventTags,
  eventHasPositionalEventTags,
  eventHasPositionalEventTag,
  decodeLightnightPayRequest,
} from "@nostr-ts/common";
import { IDBPDatabase, openDB } from "idb";
import { MAX_EVENTS } from "../defaults";
import { expose } from "comlink";
import { IncomingEventsQueue } from "./incoming-queue";
import { NClientDB, NClientWorker } from "./worker-types";
import { NUser, RelayClient } from "@nostr-ts/web";
import { ListRecord, ProcessedListRecord, WorkerEvent } from "./base-types";
import { nanoid } from "nanoid";

const incomingQueue = new IncomingEventsQueue();

function processToLight(event: ProcessedEventWithEvents) {
  const reactionsCount = event.reactions.reduce((acc, r) => {
    const content = r?.content ? r.content : undefined;
    if (content && acc[content]) {
      acc[content] += 1;
    } else if (content) {
      acc[content] = 1;
    }
    return acc;
  }, {} as { [key: string]: number });

  const data: LightProcessedEvent = {
    event: event.event,
    user: event.user,
    eventRelayUrls: event.eventRelayUrls,
    repliesCount: event.replies.length,
    reactionsCount,
    repostsCount: event.reposts.length,
    badgeAwardsCount: event.badgeAwards.length,
    mentionsCount: 0,
    zapReceiptAmount: event.zapReceipts.reduce((acc, r) => {
      return acc + Number(r.amount);
    }, 0),
    zapReceiptCount: event.zapReceipts.length,
  };

  return data;
}

class WorkerClass implements NClientWorker {
  connected: boolean;
  db: IDBPDatabase<NClientDB> | null;
  client: RelayClient | null;
  events: ProcessedEventWithEvents[];
  maxEvents: number;

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
    this.db = await openDB<NClientDB>("nostr-client", 4, {
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

        if (oldVersion < 4) {
          const eventStore = db.createObjectStore("events", { keyPath: "id" });

          eventStore.createIndex("pubkey", "pubkey", { unique: false });
          eventStore.createIndex("kind", "kind", { unique: false });
          eventStore.createIndex("created_at", "created_at", { unique: false });

          eventStore.createIndex("kindAndPubkey", ["kind", "pubkey"], {
            unique: false,
          });

          const tagStore = db.createObjectStore("tags", { keyPath: "id" });

          tagStore.createIndex("eventId", "eventId", { unique: false });
          tagStore.createIndex("typeAndValue", ["type", "value"], {
            unique: false,
          });
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
      : undefined;
  }

  updateRelay(
    url: string,
    options: {
      isEnabled?: boolean;
      read?: boolean;
      write?: boolean;
    }
  ) {
    this.client?.relays.map((relay) => {
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
        return;
      }
    });
  }

  getSubscriptions() {
    return this.client?.getSubscriptions();
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
    console.log(`=> WORKER: Subscribe`, payload);
    return this.client?.subscribe(payload);
  }

  unsubscribe(ids: string[]) {
    return this.client?.unsubscribe(ids);
  }

  unsubscribeAll() {
    return this.client?.unsubscribeAll();
  }

  /**
   * Save without checking if exists
   */
  private async saveEventToDBWithoutCheck(event: EventBase) {
    await this.db?.add("events", event);
    if (event.tags) {
      for (const tag of event.tags) {
        if (tag[0] === "e" || tag[0] === "p") {
          await this.db?.add("tags", {
            eventId: event.id,
            id: nanoid(),
            type: tag[0],
            value: tag[1],
          });
        }
      }
    }
  }

  /**
   * Save event
   */
  private async saveEventToDB(event: EventBase) {
    const exists = await this.db?.get("events", event.id as string);
    if (exists) return;
    return this.saveEventToDBWithoutCheck(event);
  }

  /**
   * Use event
   */
  private async useEvent(payload: ProcessedEventWithEvents) {
    this.events.push(payload);
  }

  /**
   * - Update event on map
   * - Post message to main thread
   */
  private updatedUsedEvent(payload: ProcessedEventWithEvents, view?: string) {
    this.events = this.events.map((event) => {
      if (event.event.id === payload.event.id) {
        const workerEvent: WorkerEvent = {
          data: {
            type: "event:update",
            view: view || "",
            data: processToLight(payload),
          },
        };
        postMessage(workerEvent.data);
        return payload;
      }
      return event;
    });
  }

  /**
   * Load related
   */
  private async getRelatedEvents(id: string, kinds: NEVENT_KIND[]) {
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

  /**
   * Load related and process
   */
  private async getRelatedProcessedEvents(
    id: string,
    kinds: NEVENT_KIND[]
  ): Promise<LightProcessedEvent[]> {
    const events = await this.getRelatedEvents(id, kinds);
    const processedEvents: LightProcessedEvent[] = [];
    for (const event of events) {
      const user = await this.db?.get("users", event.pubkey);
      processedEvents.push({
        event: event,
        user: user ? user.user : undefined,
        eventRelayUrls: user ? user.relayUrls : [],
        repliesCount: 0,
        reactionsCount: {},
        repostsCount: 0,
        badgeAwardsCount: 0,
        mentionsCount: 0,
        zapReceiptAmount: 0,
        zapReceiptCount: 0,
      });
    }

    return processedEvents;
  }

  setMaxEvents(max: number) {
    this.maxEvents = max;
  }

  /**
   * Add new items to worker queue
   */
  addQueueItems(payload: PublishingQueueItem[]) {
    this.eventsPublishingQueue.push(...payload);
  }

  /**
   * Update queue item
   */
  updateQueueItem(payload: PublishingQueueItem) {
    this.eventsPublishingQueue = this.eventsPublishingQueue.map((item) => {
      if (item.event.id === payload.event.id) {
        return payload;
      }
      return item;
    });
  }

  /**
   * Get all queue items
   */
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
      const related = await this.getRelatedEvents(id, [
        NEVENT_KIND.REACTION,
        NEVENT_KIND.ZAP_RECEIPT,
        NEVENT_KIND.SHORT_TEXT_NOTE,
        NEVENT_KIND.ZAP_RECEIPT,
      ]);

      event.reactions = [
        ...event.reactions,
        ...related.filter((e) => e.kind === NEVENT_KIND.REACTION),
      ];
      event.replies = [
        ...event.replies,
        ...related.filter((e) => e.kind === NEVENT_KIND.SHORT_TEXT_NOTE),
      ];

      const zapReceipts = [];
      event.zapReceipts.map((receipt) => {
        zapReceipts.push({
          id: receipt.id,
          pubkey: receipt.pubkey,
          amount: receipt.amount,
        });
      });
      related
        .filter((e) => e.kind === NEVENT_KIND.ZAP_RECEIPT)
        .map((receipt) => {
          const added = event.zapReceipts.find(
            (r) => r.id === receipt.id && r.pubkey === receipt.pubkey
          );
          if (!added) {
            const invoice = receipt.tags?.find((tag) => tag[0] === "bolt11");
            if (invoice) {
              try {
                const extractedInvoice = decodeLightnightPayRequest(invoice[1]);
                const amount = extractedInvoice.sections.find(
                  (s) => s.name === "amount"
                )?.value as number;
                zapReceipts.push({
                  id: receipt.id,
                  pubkey: receipt.pubkey,
                  amount,
                });
              } catch (e) {
                console.log(`=> WORKER: Error decoding invoice`, e);
              }
            }
          }
        });

      const userData = await this.getUser(event.event.pubkey);

      return processToLight({
        ...event,
        user: userData ? userData.user : undefined,
      });
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

  async getEventReplies(id: string, view?: string | undefined) {
    const event = this.events.find((e) => e.event.id === id);
    if (event) {
      const related = await this.getRelatedProcessedEvents(id, [
        NEVENT_KIND.SHORT_TEXT_NOTE,
      ]);

      return related;
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

  /**
   * Get events (frontend)
   * - from array
   * - enrichted with DB data
   */
  async getEvents(params: { view: string; limit?: number; offset?: number }) {
    this.events.sort((a, b) => {
      return b.event.created_at - a.event.created_at;
    });

    const limit = params.limit || 10; // Using a default limit, adjust as needed
    const offset = params.offset || 0;
    const selectedEvents = this.events.slice(offset, offset + limit);

    const processEvent = async (event: ProcessedEventWithEvents) => {
      const ev = await this.getEvent(event.event.id, params.view);

      if (ev) {
        const workerEvent: WorkerEvent = {
          data: {
            type: "event:new",
            view: params.view,
            data: ev,
          },
        };

        postMessage(workerEvent.data);
      }
    };

    await Promise.all(selectedEvents.map(processEvent));

    // Request related data
    await this.processSelectedEvents(params.view, selectedEvents);
  }

  /**
   * Merge with array events
   */
  private async mergeEventWithActive(
    event: EventBaseSigned,
    relayUrl: string,
    view?: string
  ) {
    if (event.kind === NEVENT_KIND.ZAP_RECEIPT) {
      const tags = new NEvent(event).hasEventTags();
      const hasRootTag = tags?.find((tag) => tag.marker === "root");
      const invoice = event.tags?.find((tag) => tag[0] === "bolt11");
      if (hasRootTag && invoice) {
        for (const e of this.events) {
          if (e.event.id === hasRootTag.eventId) {
            try {
              const extractedInvoice = decodeLightnightPayRequest(invoice[1]);
              const amount = extractedInvoice.sections.find(
                (s) => s.name === "amount"
              )?.value as number;

              const data = {
                id: event.id,
                pubkey: event.pubkey,
                amount,
              };

              if (e.zapReceipts) {
                e.zapReceipts.push(data);
              } else {
                e.zapReceipts = [data];
              }

              this.updatedUsedEvent(e, view);
              return;
            } catch (e) {
              console.log(`=> WORKER: Error decoding invoice`, e);
            }
          }
        }
      }
    } else if (event.kind === NEVENT_KIND.METADATA) {
      const data = {
        user: new NUserBase(),
        relayUrls: [relayUrl],
      };
      data.user.fromEvent(event);

      this.events.map((e) => {
        if (e.event.pubkey === event.pubkey) {
          this.updatedUsedEvent({
            ...e,
            user: data.user,
            eventRelayUrls: data.relayUrls,
          });
        }
      });
    } else if (event.kind === NEVENT_KIND.REACTION) {
      const tags = new NEvent(event).hasEventTags();
      if (!tags) {
        return;
      }
      const eventIds = tags
        ?.filter((tag) => tag.eventId)
        .map((tag) => tag.eventId);

      this.events.map((e) => {
        eventIds?.map((id) => {
          if (e.event.id === id) {
            const data = {
              id: event.id,
              pubkey: event.pubkey,
              content: event.content,
            };
            if (e.reactions) {
              e.reactions.push(data);
            } else {
              e.reactions = [data];
            }

            this.updatedUsedEvent(e, view);
          }
        });
      });
    } else if (event.kind === NEVENT_KIND.REPOST) {
      const tags = new NEvent(event).hasEventTags();
      if (!tags) {
        return;
      }
      const eventIds = tags
        ?.filter((tag) => tag.eventId)
        .map((tag) => tag.eventId);

      this.events.map((e) => {
        eventIds?.map((id) => {
          if (e.event.id === id) {
            const data = {
              id: event.id,
              pubkey: event.pubkey,
            };
            if (e.reposts) {
              e.reposts.push(data);
            } else {
              e.reposts = [data];
            }

            this.updatedUsedEvent(e, view);
            return;
          }
        });
      });
    } else if (event.kind === NEVENT_KIND.SHORT_TEXT_NOTE) {
      /**
       * Event is a reply
       */
      const hasPositional = eventHasPositionalEventTag(event);
      const tags = hasPositional
        ? eventHasPositionalEventTags(event)
        : eventHasEventTags(event);
      if (tags) {
        // TODO
        // Reply to a reply
        // const hasReplyTag = tags?.find((tag) => tag.marker === "reply");

        const hasRootTag = tags?.find((tag) => tag.marker === "root");
        if (hasRootTag) {
          // Reply to existing event
          for (const e of this.events) {
            if (e.event.id === hasRootTag.eventId) {
              const data = {
                id: event.id,
                pubkey: event.pubkey,
                content: event.content,
              };
              if (e.replies) {
                e.replies.push(data);
              } else {
                e.replies = [data];
              }

              this.updatedUsedEvent(e, view);
              return;
            }
          }
        }
        const hasReplyTag = tags?.find((tag) => tag.marker === "reply");
        if (hasReplyTag) {
          // Reply to existing reply
          for (const e of this.events) {
            if (e.event.id === hasReplyTag.eventId) {
              const data = {
                id: event.id,
                pubkey: event.pubkey,
                content: event.content,
              };
              if (e.replies) {
                e.replies.push(data);
              } else {
                e.replies = [data];
              }

              this.updatedUsedEvent(e, view);
              return;
            }
          }
        }
      }

      if (tags) {
        // Not adding to main thread since this is a reponse; we only couldn't find the related event
        return;
      }

      // If not reply, check if exists; if not add
      const exists = this.events.find((e) => e.event.id === event.id);
      if (!exists) {
        // TODO: This is probably not needed
        const userData = await this.getUser(event.pubkey);
        const mentions = new NEvent(event).hasMentions();
        const newEvent: ProcessedEventWithEvents = {
          eventRelayUrls: [relayUrl],
          user: userData ? userData.user : undefined,
          event: new NEvent(event),
          reactions: [],
          reposts: [],
          badgeAwards: [],
          replies: [],
          mentions:
            mentions?.map((mention) => {
              return {
                pubkey: mention,
                id: event.id,
              };
            }) || [],
          zapReceipts: [],
        };

        await this.useEvent(newEvent);
      }
    }
  }

  private async processRelayNotice(
    kind: string,
    payload: WebSocketEvent,
    subscription?: RelaySubscription
  ) {
    incomingQueue.enqueueBackground(async () => {
      if (kind === RELAY_MESSAGE_TYPE.OK) {
        const eventId = payload.data[1];
        const status = payload.data[2] as boolean;
        const message = payload.data[3] as string;

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
      } else if (kind === RELAY_MESSAGE_TYPE.EOSE) {
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
      } else if (kind === RELAY_MESSAGE_TYPE.COUNT) {
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
      } else if (kind === RELAY_MESSAGE_TYPE.NOTICE) {
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
      } else if (kind === RELAY_MESSAGE_TYPE.AUTH) {
        postMessage({
          type: "relay:message",
          data: payload,
        });

        return;
      }
    });
  }

  async processEvent(payload: WebSocketEvent) {
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
      await this.processRelayNotice(payLoadKind, payload, subscription);
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
          if (this.events.length >= this.maxEvents * 2) {
            return;
          }

          const ev = payload.data[2] as EventBaseSigned;
          const userRecord = await this.getUser(ev.pubkey);
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
          }

          await this.saveEventToDB(ev);

          await this.mergeEventWithActive(
            ev,
            payload.meta.url,
            associatedWithView
          );
        });
      } else if (
        kind === NEVENT_KIND.ZAP_RECEIPT ||
        kind === NEVENT_KIND.REACTION ||
        kind === NEVENT_KIND.REPOST ||
        kind === NEVENT_KIND.METADATA
      ) {
        incomingQueue.enqueueBackground(async () => {
          const ev = payload.data[2] as EventBaseSigned;
          const userRecord = await this.getUser(ev.pubkey);
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
          }
          await this.saveEventToDB(ev);

          await this.mergeEventWithActive(
            ev,
            payload.meta.url,
            associatedWithView
          );

          if (kind === NEVENT_KIND.METADATA) {
            const newUser = new NUserBase();
            newUser.fromEvent(ev);
            const data = {
              user: newUser,
              relayUrls: [payload.meta.url],
            };
            if (userRecord) {
              await this.updateUser(ev.pubkey, data);
            } else {
              await this.addUser(data);
            }
          }
        });
      }
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
    incomingQueue.clearBackground();
    this.events = [];
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

    for (const relayUrl of relayUrls) {
      await this.requestInformation(
        {
          source: "users",
          idsOrKeys: [pubkey],
          relayUrl,
        },
        {
          timeoutIn: 10000,
        }
      );
    }

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
    subs?.map((sub) => {
      if (sub.options && sub.options.view !== view) {
        this.unsubscribe([sub.id]);
      }
    });

    if (options?.reset) {
      this.clearEvents();
    }

    const relaysCount = this.getRelays()?.length || 0;

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

    return {
      viewChanged: true,
    };
  }

  removeViewSubscription(view: string) {
    const subs = this.getSubscriptions();
    subs?.map((sub) => {
      if (sub.options && sub.options.view === view) {
        this.unsubscribe([sub.id]);
      }
    });
  }

  async processSelectedEvents(
    view: string,
    events: ProcessedEventWithEvents[]
  ) {
    const eventUsers: { pubkey: string; relayUrls?: string[] }[] = [];
    const eventIds: { id: string; relayUrls?: string[] }[] = [];

    for (const ev of events) {
      console.log(ev.eventRelayUrls);
      // TODO: Check if stale
      if (!eventUsers.find((user) => user.pubkey === ev.event.pubkey)) {
        const user = await this.getUser(ev.event.pubkey);
        if (!user) {
          eventUsers.push({
            pubkey: ev.event.pubkey,
            relayUrls: ev.eventRelayUrls,
          });
        }
      }

      // TODO: Check if stale
      if (!eventIds.find((id) => id.id === ev.event.id)) {
        eventIds.push({
          id: ev.event.id,
          relayUrls: ev.eventRelayUrls,
        });
      }
    }

    const relayUrlToPubkeysMap: Record<string, Set<string>> = {};

    for (const ev of eventUsers) {
      if (ev.relayUrls) {
        for (const relayUrl of ev.relayUrls) {
          if (!relayUrlToPubkeysMap[relayUrl]) {
            relayUrlToPubkeysMap[relayUrl] = new Set();
          }
          relayUrlToPubkeysMap[relayUrl].add(ev.pubkey);
        }
      }
    }

    const reqUsers: RelaysWithIdsOrKeys[] = Object.entries(
      relayUrlToPubkeysMap
    ).map(([relayUrl, pubkeysSet]) => {
      return {
        source: "users",
        relayUrl,
        idsOrKeys: [...pubkeysSet],
      };
    });

    const relayUrlToRelEventIdsMap: Record<string, Set<string>> = {};

    for (const ev of eventIds) {
      if (ev.relayUrls) {
        for (const relayUrl of ev.relayUrls) {
          if (!relayUrlToRelEventIdsMap[relayUrl]) {
            relayUrlToRelEventIdsMap[relayUrl] = new Set();
          }
          relayUrlToRelEventIdsMap[relayUrl].add(ev.id);
        }
      }
    }

    const reqEvents: RelaysWithIdsOrKeys[] = Object.entries(
      relayUrlToRelEventIdsMap
    ).map(([relayUrl, eventIdsSet]) => {
      return {
        source: "events:related",
        relayUrl,
        idsOrKeys: [...eventIdsSet],
      };
    });

    for (const req of reqUsers) {
      await this.requestInformation(req, {
        timeoutIn: 10000,
        view,
      });
    }

    for (const req of reqEvents) {
      await this.requestInformation(req, {
        timeoutIn: 10000,
        view,
      });
    }
  }

  // TODO: Probably shouldn't care about relayUrls
  async requestInformation(
    payload: RelaysWithIdsOrKeys,
    options: SubscriptionOptions
  ) {
    if (payload.idsOrKeys.length === 0) {
      return;
    }

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
            // NEVENT_KIND.SHORT_TEXT_NOTE,
            NEVENT_KIND.REACTION,
            NEVENT_KIND.REPOST,
            NEVENT_KIND.ZAP_RECEIPT,
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
        // relayUrls: [payload.relayUrl],
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
