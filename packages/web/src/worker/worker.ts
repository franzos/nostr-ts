import { NUser, RelayClient } from "../classes";

import {
  AuthRequest,
  CLIENT_MESSAGE_TYPE,
  CloseRequest,
  CountRequest,
  EventBaseSigned,
  EventsRequest,
  LightProcessedEvent,
  NEVENT_KIND,
  NEvent,
  NFilters,
  NUserBase,
  ProcessedEventWithEvents,
  ProcessedUserBase,
  PublishingQueueItem,
  PublishingRequest,
  RELAY_MESSAGE_TYPE,
  Relay,
  RelaySubscription,
  RelaysWithIdsOrKeys,
  SubscriptionOptions,
  UserRecord,
  WebSocketEvent,
  decodeLightnightPayRequest,
  eventHasEventTags,
  eventHasPositionalEventTag,
  eventHasPositionalEventTags,
} from "@nostr-ts/common";
import { Database, NewProcessedEventFromDB } from "./database";
import {
  ONE_SECOND,
  ProcessedToLightProcessedEvent,
  StorageEventsQuery,
  StorageQueryResult,
  TEN_SECONDS,
  calculateEventsRequestRange,
  relayEventsRequestFromQuery,
} from "./worker-extra";
import { IncomingEventsQueue } from "./worker-queue";
import { CreateListRecord, ListRecord } from "./lists";

export class NWorker {
  db: Database;

  // in-memory events
  eventsInMemory: ProcessedEventWithEvents[] = [];
  // queue
  eventsPublishingQueue: PublishingQueueItem[] = [];
  // query memory
  eventsQueryMemory: {
    [queryCount: number]: {
      eventIds: string[];
    };
  } = {};

  popularUsers: {
    [pubkey: string]: number;
  } = {};
  popularEvents: {
    [id: string]: number;
  } = {};

  options: {
    isInWebWorker?: boolean;
  };

  lastQuery: StorageEventsQuery | undefined;

  // Triggered if subscription yields new event
  lastQueryNewEvent: number | undefined;
  incomingEventsQueue: IncomingEventsQueue;

  constructor(options?: { isInWebWorker?: boolean }) {
    this.options = options || {};
    this.db = new Database();
    this.eventsInMemory = [];
    this.eventsPublishingQueue = [];

    this.lastQuery = undefined;
    this.lastQueryNewEvent = undefined;

    this.incomingEventsQueue = new IncomingEventsQueue();
  }

  relayClient: RelayClient;

  async init() {
    await this.db.init();
    setTimeout(async () => {
      await this.calculatePopular();
    }, ONE_SECOND * 3);
  }

  ////////////////////////////////// RELAYS //////////////////////////////////

  async connect(
    relays: Relay[],
    options?: {
      autoLoadInfo?: boolean;
    }
  ) {
    this.relayClient = new RelayClient(relays);
    if (options?.autoLoadInfo !== false) {
      await this.relayClient.getRelayInformation();
    }
    this.relayClient.listen(async (payload) => {
      await this.processEvent(payload);
    });
  }

  disconnect() {
    this.relayClient.disconnect();
    this.eventsInMemory = [];
  }

  getRelays() {
    return this.relayClient?.relays
      ? this.relayClient.relays.map((r) => {
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
    this.relayClient?.relays.map((relay) => {
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

  ////////////////////////////////// SUBSCRIPTIONS //////////////////////////////////

  getSubscriptions() {
    return this.relayClient?.getSubscriptions();
  }

  /**
   * - Update client subscription
   * - Post message to main thread
   * @param payload
   */
  updateSubscription(payload: RelaySubscription) {
    this.relayClient?.updateSubscription(payload);
    postMessage({
      type: "subscription:update",
      data: payload,
    });
  }

  async subscribe(
    payload: CountRequest | AuthRequest | EventsRequest | CloseRequest
  ) {
    console.log(`=> WORKER: subscribe`, payload);
    return this?.relayClient.subscribe(payload);
  }

  unsubscribe(ids: string[]) {
    return this.relayClient?.unsubscribe(ids);
  }

  unsubscribeAll() {
    return this.relayClient?.unsubscribeAll();
  }

  unsubscribeByToken(token: string) {
    const subs = this.getSubscriptions();
    if (!subs) return;
    for (const sub of subs) {
      if (sub.options.view === token) {
        this.unsubscribe([sub.id]);
      }
    }
  }

  ////////////////////////////////// User //////////////////////////////////

  async getUser(pubkey: string): Promise<UserRecord | undefined> {
    const data = await this.db.getUser(pubkey);
    return data
      ? {
          ...data,
          user: new NUser(data.user),
        }
      : undefined;
  }

  async addUser(payload: ProcessedUserBase) {
    const { user } = payload;
    await this.db.addUser({
      user,
      relayUrls: payload.relayUrls,
    });
  }
  async updateUser(pubkey: string, payload: ProcessedUserBase) {
    const record = await this.db.getUser(pubkey);
    await this.db.updateUser("users", Object.assign(record, payload));
  }

  async countUsers() {
    return await this.db.countUsers();
  }

  async followUser(pubkey: string) {
    const record = await this.db.getUser(pubkey);
    if (record) {
      await this.db.updateUser("users", {
        ...record,
        following: true,
      });
    }
  }

  async unfollowUser(pubkey: string) {
    const record = await this.db.getUser(pubkey);
    if (record) {
      await this.db.updateUser("users", {
        ...record,
        following: false,
      });
    }
  }

  async getAllUsersFollowing() {
    return await this.db.getUsersByParam("following");
  }

  async blockUser(pubkey: string) {
    const record = await this.db.getUser(pubkey);
    if (record) {
      await this.db.updateUser("users", {
        ...record,
        isBlocked: true,
      });
    }
  }

  async unblockUser(pubkey: string) {
    const record = await this.db.getUser(pubkey);
    if (record) {
      await this.db.updateUser("users", {
        ...record,
        isBlocked: false,
      });
    }
  }

  async getAllUsersBlocked() {
    return await this.db.getUsersByParam("isBlocked");
  }

  ////////////////////////////////// POPULAR //////////////////////////////////

  private async calculatePopular(timeInSeconds?: number) {
    const { users, events } = await this.db.calculatePopular(timeInSeconds);
    this.popularUsers = users;
    this.popularEvents = events;

    await this.requestInformation(
      {
        source: "users",
        idsOrKeys: Object.keys(this.popularUsers),
      },
      {
        timeoutIn: TEN_SECONDS,
      }
    );
  }

  async getPopularUsers() {
    const pubkeys = Object.entries(this.popularUsers).map((p) => p[0]);
    const users: UserRecord[] = [];
    for (const pubkey of pubkeys) {
      const user = await this.db.getUser(pubkey);
      if (user) {
        users.push(user);
      } else {
        users.push({
          user: new NUserBase({
            pubkey,
          }),
          relayUrls: [],
        });
      }
    }
    return users ? users : undefined;
  }

  async getPopularEvents() {
    const ids = Object.entries(this.popularEvents).map((p) => p[0]);
    const events: LightProcessedEvent[] = [];
    for (const id of ids) {
      const event = await this.db.getEvent(id);
      if (event) {
        events.push(event);
      }
    }
    return events ? events : undefined;
  }

  ////////////////////////////////// LISTS //////////////////////////////////

  async createList(payload: CreateListRecord) {
    const id = await this.db.createList(payload);
    return id;
  }

  async updateList(id: string, payload: CreateListRecord) {
    return this.db.updateList(id, payload);
  }

  async deleteList(id: string) {
    return this.db.deleteList(id);
  }

  async getAllLists() {
    return this.db.getAllLists();
  }

  async getList(id: string) {
    return this.db.getList(id);
  }

  async getListsWithUser(pubkey: string) {
    return this.db.getListsWithUser(pubkey);
  }

  async addUserToList(listId: string, pubkey: string) {
    return this.db.addUserToList(listId, pubkey);
  }

  async removeUserFromList(listId: string, pubkey: string) {
    return this.db.removeUserFromList(listId, pubkey);
  }

  ////////////////////////////////// EVENTS:QUEUE //////////////////////////////////

  /**
   * Add event to publishing queue
   */
  addQueueItems(payload: PublishingQueueItem[]) {
    this.eventsPublishingQueue.push(...payload);
  }

  /**
   * Update event in publishing queue
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
   * Remove event from publishing queue
   */
  getQueueItems() {
    return this.eventsPublishingQueue;
  }

  ////////////////////////////////// EVENTS //////////////////////////////////

  /**
   * Load related events from the database and merge with event
   */
  private async attachRelatedEvents(data: ProcessedEventWithEvents) {
    const related = await this.db.getRelatedEvents(data.event.id, [
      NEVENT_KIND.REACTION,
      NEVENT_KIND.ZAP_RECEIPT,
      NEVENT_KIND.SHORT_TEXT_NOTE,
    ]);

    const newReactions = [];
    const newReplies = [];
    const zapReceipts = [];

    const existingZapIds = new Set(data.zapReceipts.map((r) => r.id));

    for (const rel of related) {
      switch (rel.kind) {
        case NEVENT_KIND.REACTION:
          newReactions.push(rel);
          break;
        case NEVENT_KIND.SHORT_TEXT_NOTE:
          newReplies.push(rel);
          break;
        case NEVENT_KIND.ZAP_RECEIPT:
          if (!existingZapIds.has(rel.id)) {
            existingZapIds.add(rel.id); // Add to set to avoid duplicates
            try {
              const invoiceTag = rel.tags?.find((tag) => tag[0] === "bolt11");
              if (invoiceTag) {
                const extractedInvoice = decodeLightnightPayRequest(
                  invoiceTag[1]
                );
                const amount = extractedInvoice.sections.find(
                  (s) => s.name === "amount"
                )?.value as number;
                zapReceipts.push({
                  id: rel.id,
                  pubkey: rel.pubkey,
                  amount,
                });
              }
            } catch (e) {
              console.log(`=> WORKER: Error decoding invoice`, e);
            }
          }
          break;
      }
    }

    data.reactions = [...data.reactions, ...newReactions];
    data.replies = [...data.replies, ...newReplies];
    data.zapReceipts = [...data.zapReceipts, ...zapReceipts];

    const userData = await this.db.getUser(data.event.pubkey);

    return {
      ...data,
      user: userData ? userData.user : undefined,
    };
  }

  /**
   * Update in-memory event and send to frontend
   * - Usually for worker scenario to teach the main thread
   */
  updateEventInMemoryAndFrontend(event: ProcessedEventWithEvents) {
    const index = this.eventsInMemory.findIndex(
      (ev) => ev.event.id === event.event.id
    );
    if (index !== -1) {
      this.eventsInMemory[index] = event;
      if (this.options.isInWebWorker) {
        const workerEvent = {
          data: {
            type: "event:update",
            data: ProcessedToLightProcessedEvent(event),
          },
        };
        postMessage(workerEvent.data);
      }
    }
  }

  /**
   *  Process query for events
   */
  async _getEventsQueryProcessor({ token, query }: StorageEventsQuery) {
    const reqRange = calculateEventsRequestRange(query.filters);
    const direction = query.direction || "NEWER";
    const interval =
      direction === "NEWER"
        ? reqRange[1] - reqRange[0]
        : reqRange[0] - reqRange[1];
    const reqCount = 0; // query.reqCount ? query.reqCount : 0;

    const memory =
      query.remainInRange && query.reqCount
        ? this.eventsQueryMemory.hasOwnProperty(reqCount - 1)
          ? this.eventsQueryMemory[reqCount - 1]
          : undefined
        : undefined;

    const result = await this.db.getEvents(query.filters, memory);
    const events = result[0];
    const totalEvents = result[1];

    events.sort((a, b) => {
      return b.created_at - a.created_at;
    });

    const remainingEvents = query.remainInRange
      ? query.remainInRange - events.length
      : totalEvents - events.length;

    console.log(
      `WORKER: Total events: ${totalEvents}, (events.length: ${events.length})`
    );

    /**
     * If we've got events, return them
     */
    if (events.length > 0) {
      this.eventsQueryMemory[reqCount] = {
        eventIds: events.map((e) => e.id),
      };
      const oldest = events[events.length - 1].created_at;

      if (remainingEvents > 0) {
        /**
         * Got some events left; return the same range
         */
        return {
          events,
          next: {
            ...query,
            filters: {
              ...query.filters,
              since: query.filters.since,
              until: query.filters.until,
            },
            reqCount: reqCount + 1,
            prevInterval: interval,
            remainInRange: remainingEvents,
            stickyInterval: query.stickyInterval,
            direction,
          },
        };
      } else {
        /**
         * No events left; return next range
         */
        return {
          events,
          next: {
            ...query,
            filters: {
              ...query.filters,
              since: query.stickyInterval
                ? query.filters.since + interval
                : oldest,
              until: query.stickyInterval
                ? query.filters.until + interval
                : oldest + interval,
            },
            reqCount: reqCount + 1,
            prevInterval: interval,
            stickyInterval: query.stickyInterval,
            direction,
          },
        };
      }
    }

    /**
     * If this is the first request, and we got no results, return same query
     * if not, try next interval
     */
    const isFirstQuery = !query.reqCount || query.reqCount === 0;

    const since = isFirstQuery
      ? query.filters.since
      : query.filters.since + interval;
    const until = isFirstQuery
      ? query.filters.until
      : query.filters.until + interval;

    return {
      events: [],
      next: {
        ...query,
        filters: {
          ...query.filters,
          since,
          until,
        },
        reqCount: reqCount + 1,
        prevInterval: interval,
        stickyInterval: query.stickyInterval,
        direction,
      },
    };
  }

  async notifyOfNewEvent(event: EventBaseSigned) {
    if (this.lastQueryNewEvent || !this.lastQuery) return;
    const filters = this.lastQuery.query.filters;
    const hasSinceFilter = filters.since && filters.since > 0;
    const eventCreated = event.created_at;
    if (hasSinceFilter && eventCreated > filters.since) {
      this.lastQueryNewEvent = eventCreated;
      postMessage({
        type: "event:new",
        data: ProcessedToLightProcessedEvent(NewProcessedEventFromDB(event)),
      });
    }
    //
  }

  /**
   * Get events
   * - Handles in-memory events
   * - Handles subscriptions
   */
  async getEvents(params: StorageEventsQuery): Promise<StorageQueryResult> {
    if (!params.query.reqCount || params.query.reqCount === 0) {
      this.eventsInMemory = [];
      if (params.query.isOffline === true) {
        console.warn(`=> WORKER: Offline mode`);
      } else {
        console.log(`=> WORKER: Requesting from relay`);
        this.subscribe(relayEventsRequestFromQuery(params));
      }
    }
    const result = await this._getEventsQueryProcessor(params);
    if (
      result.events &&
      result.events.length > 0 &&
      params.query.isOffline !== true
    ) {
      await this.processSelectedEvents(params.token, result.events);
    }
    const events = [];
    for (const event of result.events) {
      const withRelated = await this.attachRelatedEvents(
        NewProcessedEventFromDB(event)
      );
      this.eventsInMemory.push(withRelated);
      events.push(ProcessedToLightProcessedEvent(withRelated));
    }

    return {
      ...result,
      token: params.token,
      events,
    };
  }

  async getEvent(
    id: string,
    options?: {
      token?: string;
    }
  ) {
    const event = await this.db.getEvent(id);
    if (!event) {
      console.log(`=> WORKER: Event not found in DB, requesting from relay.`);
      await this.subscribe({
        type: CLIENT_MESSAGE_TYPE.REQ,
        filters: new NFilters({
          ids: [id],
        }),
        options: {
          timeoutIn: TEN_SECONDS,
          view: options?.token ? options.token : undefined,
        },
      });
      return undefined;
    }
    const withRelated = await this.attachRelatedEvents(
      NewProcessedEventFromDB(event)
    );
    this.eventsInMemory.push(withRelated);
    return ProcessedToLightProcessedEvent(withRelated);
  }

  private async mergeEventWithActive(
    event: EventBaseSigned,
    relayUrl: string,
    view?: string
  ) {
    if (event.kind === NEVENT_KIND.ZAP_RECEIPT) {
      /**
       * ZAP RECEIPT
       */
      const tags = new NEvent(event).hasEventTags();
      const hasRootTag = tags?.find((tag) => tag.marker === "root");
      const invoice = event.tags?.find((tag) => tag[0] === "bolt11");
      if (hasRootTag && invoice) {
        for (const ev of this.eventsInMemory) {
          if (ev.event.id !== hasRootTag.eventId) continue;

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

            if (ev.zapReceipts) {
              if (ev.zapReceipts.find((r) => r.id === data.id)) return;
              ev.zapReceipts.push(data);
            } else {
              ev.zapReceipts = [data];
            }

            this.updateEventInMemoryAndFrontend(ev);
            return;
          } catch (err) {
            console.log(`=> WORKER: Error decoding invoice`, err);
          }
        }
      }
    } else if (event.kind === NEVENT_KIND.METADATA) {
      /**
       * METADATA
       */
      const data = {
        user: new NUserBase(),
        relayUrls: [relayUrl],
      };
      data.user.fromEvent(event);

      for (const ev of this.eventsInMemory) {
        if (ev.event.pubkey === event.pubkey) {
          this.updateEventInMemoryAndFrontend({
            ...ev,
            user: data.user,
            eventRelayUrls: data.relayUrls,
          });
        }
      }
    } else if (event.kind === NEVENT_KIND.REACTION) {
      /**
       * REACTION
       */
      const tags = new NEvent(event).hasEventTags();
      if (!tags) {
        return;
      }
      const eventIds = tags
        ?.filter((tag) => tag.eventId)
        .map((tag) => tag.eventId);

      for (const ev of this.eventsInMemory) {
        if (!eventIds.includes(ev.event.id)) continue;

        const data = {
          id: event.id,
          pubkey: event.pubkey,
          content: event.content,
        };
        if (ev.reactions) {
          if (ev.reactions.find((r) => r.id === data.id)) return;
          ev.reactions.push(data);
        } else {
          ev.reactions = [data];
        }

        this.updateEventInMemoryAndFrontend(ev);
        return;
      }
    } else if (event.kind === NEVENT_KIND.REPOST) {
      /**
       * REPOST
       */
      const tags = new NEvent(event).hasEventTags();
      if (!tags) {
        return;
      }
      const eventIds = tags
        ?.filter((tag) => tag.eventId)
        .map((tag) => tag.eventId);

      for (const ev of this.eventsInMemory) {
        if (!eventIds.includes(ev.event.id)) continue;

        const data = {
          id: event.id,
          pubkey: event.pubkey,
        };
        if (ev.reposts) {
          if (ev.reposts.find((r) => r.id === data.id)) return;
          ev.reposts.push(data);
        } else {
          ev.reposts = [data];
        }

        this.updateEventInMemoryAndFrontend(ev);
        return;
      }
    } else if (event.kind === NEVENT_KIND.SHORT_TEXT_NOTE) {
      /**
       * SHORT TEXT NOTE
       * can also be reply
       */

      const hasPositional = eventHasPositionalEventTag(event);
      const tags = hasPositional
        ? eventHasPositionalEventTags(event)
        : eventHasEventTags(event);
      if (tags) {
        const hasRootTag = tags?.find((tag) => tag.marker === "root");
        if (hasRootTag) {
          // Reply to existing event
          for (const ev of this.eventsInMemory) {
            if (ev.event.id !== hasRootTag.eventId) continue;

            const data = {
              id: event.id,
              pubkey: event.pubkey,
              content: event.content,
            };
            if (ev.replies) {
              if (ev.replies.find((r) => r.id === data.id)) return;
              ev.replies.push(data);
            } else {
              ev.replies = [data];
            }

            this.updateEventInMemoryAndFrontend(ev);
            return;
          }
        }
        const hasReplyTag = tags?.find((tag) => tag.marker === "reply");
        if (hasReplyTag) {
          // Reply to existing reply
          for (const ev of this.eventsInMemory) {
            if (ev.event.id !== hasReplyTag.eventId) continue;

            const data = {
              id: event.id,
              pubkey: event.pubkey,
              content: event.content,
            };
            if (ev.replies) {
              if (ev.replies.find((r) => r.id === data.id)) return;
              ev.replies.push(data);
            } else {
              ev.replies = [data];
            }

            this.updateEventInMemoryAndFrontend(ev);
            return;
          }
        }
      }

      if (tags) {
        // Not adding to main thread since this is a reponse; we only couldn't find the related event
        return;
      }

      this.notifyOfNewEvent(event);
    }
  }

  private async processRelayNotice(
    kind: string,
    payload: WebSocketEvent,
    subscription?: RelaySubscription
  ) {
    this.incomingEventsQueue.enqueueBackground(async () => {
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
          this.relayClient.updateSubscription({
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
        const subscription = this.relayClient?.getSubscriptions();
        const itemIsSubscription = subscription?.find(
          (item) => item.id === payload.data[1]
        );
        if (itemIsSubscription) {
          this.relayClient.updateSubscription({
            ...itemIsSubscription,
            result: JSON.stringify(payload.data[2]),
          });
        }

        return;
      } else if (kind === RELAY_MESSAGE_TYPE.NOTICE) {
        const subscription = this.relayClient?.getSubscriptions();
        const itemIsSubscription = subscription?.find(
          (item) => item.id === payload.data[1]
        );
        if (itemIsSubscription) {
          this.relayClient.updateSubscription({
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
      console.log(`=> WORKER: No data in payload`, payload);
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
      subscription = this.relayClient?.getSubscription(
        payload.data[1] as string
      );
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
        kind === NEVENT_KIND.LONG_FORM_CONTENT ||
        kind === NEVENT_KIND.METADATA
      ) {
        this.incomingEventsQueue.enqueuePriority(async () => {
          if (kind !== NEVENT_KIND.METADATA) {
            if (this.eventsInMemory.length >= 100 * 5) {
              return;
            }
          }

          const ev = payload.data[2] as EventBaseSigned;
          const userRecord = await this.db.getUser(ev.pubkey);
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
          }

          await this.db.saveEvent(ev);

          if (kind === NEVENT_KIND.METADATA) {
            const newUser = new NUserBase();
            newUser.fromEvent(ev);
            const data = {
              user: newUser,
              relayUrls: [payload.meta.url],
            };
            if (userRecord) {
              await this.db.updateUser(ev.pubkey, data);
            } else {
              await this.db.addUser(data);
            }
          }

          await this.mergeEventWithActive(
            ev,
            payload.meta.url,
            associatedWithView
          );
        });
      } else if (
        kind === NEVENT_KIND.ZAP_RECEIPT ||
        kind === NEVENT_KIND.REACTION ||
        kind === NEVENT_KIND.REPOST
      ) {
        this.incomingEventsQueue.enqueueBackground(async () => {
          const ev = payload.data[2] as EventBaseSigned;
          const userRecord = await this.db.getUser(ev.pubkey);
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
          }
          await this.db.saveEvent(ev);

          await this.mergeEventWithActive(
            ev,
            payload.meta.url,
            associatedWithView
          );
        });
      }
    }
  }

  ////////////////////////////////// More Info //////////////////////////////////

  async processSelectedEvents(view: string, events: EventBaseSigned[]) {
    const eventUsers: string[] = [];
    const eventIds: string[] = [];

    for (const ev of events) {
      // TODO: Check if stale
      if (!eventUsers.find((pub) => pub === ev.pubkey)) {
        const user = await this.getUser(ev.pubkey);
        if (!user) {
          eventUsers.push(ev.pubkey);
        }
      }

      // TODO: Check if stale
      if (!eventIds.find((id) => id === ev.id)) {
        eventIds.push(ev.id);
      }
    }

    await this.requestInformation(
      {
        source: "users",
        idsOrKeys: eventUsers,
      },
      {
        timeoutIn: TEN_SECONDS,
        view,
      }
    );

    await this.requestInformation(
      {
        source: "events",
        idsOrKeys: eventIds,
      },
      {
        timeoutIn: TEN_SECONDS,
        view,
      }
    );
  }

  async requestInformation(
    payload: {
      source: "users" | "events" | "events:related";
      idsOrKeys: string[];
    },
    options: SubscriptionOptions
  ) {
    if (payload.idsOrKeys.length === 0) {
      return;
    }

    const filtered = payload.idsOrKeys;

    console.log(
      `=> WORKER: Getting information for ${filtered.length} ${payload.source}`
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

  async getEventReplies(
    id: string,
    view?: string | undefined
  ): Promise<LightProcessedEvent[]> {
    return this.db
      .getRelatedEvents(id, [NEVENT_KIND.SHORT_TEXT_NOTE])
      .then((evs) =>
        Promise.all(
          evs.map(async (ev) => {
            return ProcessedToLightProcessedEvent(NewProcessedEventFromDB(ev));
          })
        )
      );
  }

  /**
   *
   * - Adds event to queue after sending
   * @param event
   * @returns
   */
  async sendEvent(payload: PublishingRequest) {
    if (!this.relayClient) {
      throw new Error("Client not initialized");
    }
    const result = this.relayClient.sendEvent(payload);
    if (result) {
      const kind = payload.event.kind;
      const queued = [
        NEVENT_KIND.SHORT_TEXT_NOTE,
        NEVENT_KIND.LONG_FORM_CONTENT,
        NEVENT_KIND.RECOMMEND_RELAY,
        NEVENT_KIND.REACTION,
        NEVENT_KIND.REPOST,
      ];
      if (queued.includes(kind)) {
        // Set event
        // TODO: Not sure if we should set it directly, or wait for the relay to send it back
        // this.addEvent({
        //   event: payload.event,
        //   eventRelayUrls: result.map((r) => r.relayUrl),
        // });
        // Set queue item
        this.mergeEventWithActive(payload.event, result[0].relayUrl);
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
    if (!this.relayClient) {
      throw new Error("Client not initialized");
    }
    this.addQueueItems(payload);
    const result = this.relayClient.sendQueueItems(payload);
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
    this.incomingEventsQueue.clearPriority();
    this.incomingEventsQueue.clearBackground();
    this.eventsInMemory = [];
  }
}
