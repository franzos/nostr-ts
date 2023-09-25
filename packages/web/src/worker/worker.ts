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
  SubscriptionOptions,
  UserRecord,
  WebSocketEvent,
  decodeLightnightPayRequest,
  eventHasContacts,
  eventHasEventTags,
  eventHasPositionalEventTag,
  eventHasPositionalEventTags,
  verifyEvent,
} from "@nostr-ts/common";
import { Database } from "./database";
import {
  ONE_MINUTE,
  ProcessedToLightProcessedEvent,
  StorageEventsQuery,
  StorageQueryResult,
  TEN_SECONDS_IN_MS,
  WorkerEventFollowingUpdate,
  WorkerEventNew,
  WorkerEventStatusChange,
  WorkerEventUpdate,
  calculateEventsRequestRange,
  relayEventsRequestFromQuery,
} from "./worker-extra";
import { CreateListRecord } from "./lists";
import {
  NewProcessedEventFromDB,
  mergePopular,
  sortAndTrimPopular,
} from "./database-helper";

export class NWorker {
  status: "online" | "offline" | "loading";
  userPubkey?: string;

  connecting: boolean;
  componentStatus: {
    relayClient: boolean;
    database: boolean;
  };

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
  lastQueryHasNewerEvents: number | undefined;

  constructor(options?: { isInWebWorker?: boolean }) {
    this.status = "loading";
    this.connecting = false;
    this.componentStatus = {
      relayClient: false,
      database: false,
    };

    this.options = options || {};
    this.db = new Database();
    this.eventsInMemory = [];
    this.eventsPublishingQueue = [];

    this.lastQuery = undefined;
    this.lastQueryHasNewerEvents = undefined;
  }

  relayClient: RelayClient;

  updateWorkerStatus(type: "relayClient" | "database", ready: boolean) {
    this.componentStatus[type] = ready;

    let newStatus;
    if (this.componentStatus.relayClient && this.componentStatus.database) {
      newStatus = "online";
    } else if (this.componentStatus.database) {
      newStatus = "offline";
    } else {
      newStatus = "loading";
    }

    if (newStatus !== this.status) {
      console.log(`=> WORKER: Status change: ${this.status} => ${newStatus}`);
      this.status = newStatus;
      if (this.options.isInWebWorker) {
        const wev: WorkerEventStatusChange = {
          type: "status:change",
          data: this.status,
        };
        postMessage(wev);
      }
    }
  }

  async init() {
    await this.db.init();
    this.updateWorkerStatus("database", true);
  }

  setUserPubkey(pubkey: string) {
    this.userPubkey = pubkey;
  }

  ////////////////////////////////// RELAYS //////////////////////////////////

  async connect(
    relays: Relay[],
    options?: {
      autoLoadInfo?: boolean;
    }
  ) {
    this.connecting = true;
    this.relayClient = new RelayClient(relays);
    if (options?.autoLoadInfo !== false) {
      this.relayClient.getRelayInformation();
    }
    this.relayClient.listen(async (payload) => {
      await this.processEvent(payload);
    });
    this.updateWorkerStatus("relayClient", true);
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

  getSubscriptions(options?: { isActive?: boolean }) {
    return this.relayClient?.getSubscriptions(options);
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
    payload: CountRequest | AuthRequest | EventsRequest | CloseRequest,
    retryCount?: number
  ) {
    console.log(`=> WORKER: subscribe`, payload);

    if (!this.relayClient) {
      console.warn(
        `=> WORKER: Relay client not initialized. Will try again in 1s.`
      );

      setTimeout(() => {
        if (retryCount < 10) {
          console.log(`WORKER: Not retrying.`);
          return;
        }
        this.subscribe(payload, retryCount + 1);
      }, 1000);
      return;
    }

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
      if (sub.options && sub.options.view === token) {
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
    await this.db.addUser({
      ...payload,
    });
  }
  async updateUser(pubkey: string, payload: ProcessedUserBase) {
    const record = await this.db.getUser(pubkey);
    await this.db.updateUser(Object.assign(record, payload));
  }

  async countUsers() {
    return await this.db.countUsers();
  }

  async followUser(pubkey: string) {
    const record = await this.db.getUser(pubkey);
    if (record) {
      await this.db.updateUser({
        ...record,
        following: true,
      });
    }
  }

  async unfollowUser(pubkey: string) {
    const record = await this.db.getUser(pubkey);
    if (record) {
      await this.db.updateUser({
        ...record,
        following: false,
      });
    }
  }

  async getAllUsersFollowing() {
    return await this.db.getUsersByParam("following");
  }

  /**
   * This will take an incoming event, and update local following list
   */
  async updateUsersFollowingFromContacts(ev: EventBaseSigned) {
    const contacts = eventHasContacts(ev);
    if (!contacts) return;
    const following = await this.getAllUsersFollowing();

    let removeFollowing = [];
    let addNew = [];

    if (following && following.length > 0) {
      for (const prev of following) {
        const found = contacts.find((c) => c.key === prev.user.pubkey);
        if (!found) {
          removeFollowing.push(prev.user.pubkey);
        }
      }
      for (const contact of contacts) {
        const found = following.find((f) => f.user.pubkey === contact.key);
        if (!found) {
          addNew.push(contact);
        }
      }
    } else {
      addNew = contacts;
    }

    for (const pubkey of removeFollowing) {
      await this.unfollowUser(pubkey);
    }

    for (const contact of addNew) {
      const exists = await this.getUser(contact.key);
      if (!exists) {
        await this.addUser({
          user: new NUserBase({
            pubkey: contact.key,
          }),
          following: true,
          relayUrls: [contact.relayUrl],
        });
      } else {
        await this.followUser(contact.key);
      }
    }

    if (this.options.isInWebWorker) {
      const msg: WorkerEventFollowingUpdate = {
        type: "following:update",
        data: contacts.map((c) => c.key),
      };
      postMessage(msg);
    }

    await this.requestInformation(
      {
        source: "users",
        idsOrKeys: contacts.map((c) => c.key),
      },
      {
        timeoutIn: TEN_SECONDS_IN_MS,
      }
    );
  }

  /**
   * Check when the last contact list has been published
   */
  async lastContactsUpdate(pubkey: string): Promise<number | undefined> {
    const events = await this.db.getEventsByPublicKeysAndKinds(
      new NFilters({
        kinds: [NEVENT_KIND.CONTACTS],
        authors: [pubkey],
        since: 0,
        until: Date.now() / 1000,
      })
    );
    // Normally there's only one event
    return events[0].length > 0 ? events[0][0].created_at : undefined;
  }

  async blockUser(pubkey: string) {
    const record = await this.db.getUser(pubkey);
    if (record) {
      await this.db.updateUser({
        ...record,
        isBlocked: true,
      });
    }
  }

  async unblockUser(pubkey: string) {
    const record = await this.db.getUser(pubkey);
    if (record) {
      await this.db.updateUser({
        ...record,
        isBlocked: false,
      });
    }
  }

  async getAllUsersBlocked() {
    return await this.db.getUsersByParam("isBlocked");
  }

  ////////////////////////////////// POPULAR //////////////////////////////////

  async calculatePopular(params?: { isOffline?: boolean }) {
    const { users, events } = await this.db.calculatePopular();
    this.popularUsers = users;
    this.popularEvents = events;

    if (params && params.isOffline) return;

    await this.requestInformation(
      {
        source: "users",
        idsOrKeys: Object.keys(this.popularUsers),
      },
      {
        timeoutIn: TEN_SECONDS_IN_MS,
      },
      [NEVENT_KIND.METADATA]
    );
  }

  private popularUsersFromMemory() {
    let users: { [pubkey: string]: number } = {};

    for (const event of this.eventsInMemory) {
      if (!event.user) continue;
      if (users[event.user.pubkey]) {
        users[event.user.pubkey] += 1;
      } else {
        users[event.user.pubkey] = 1;
      }
    }

    return users;
  }

  async getPopularUsers() {
    const pubkeys = Object.entries(
      sortAndTrimPopular(
        mergePopular(this.popularUsers, this.popularUsersFromMemory())
      )
    ).map((p) => p[0]);
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

  private poularEventsFromMemory() {
    let events: { [id: string]: number } = {};

    for (const event of this.eventsInMemory) {
      if (events[event.event.id]) {
        events[event.event.id] += 1;
      } else {
        events[event.event.id] = 1;
      }
    }

    return events;
  }

  async getPopularEvents() {
    const ids = Object.entries(
      sortAndTrimPopular(
        mergePopular(this.popularEvents, this.poularEventsFromMemory())
      )
    ).map((p) => p[0]);
    const events: LightProcessedEvent[] = [];
    for (const id of ids) {
      const event = await this.db.getEvent(id);
      if (event) {
        events.push(
          ProcessedToLightProcessedEvent(NewProcessedEventFromDB(event))
        );
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
    for (const item of payload) {
      if (
        this.eventsPublishingQueue.find(
          (i) => i.event.id === item.event.id && i.relayUrl === item.relayUrl
        )
      ) {
        continue;
      } else {
        this.eventsPublishingQueue.push(item);
      }
    }
  }

  /**
   * Update event in publishing queue
   */
  updateQueueItem(payload: PublishingQueueItem) {
    this.eventsPublishingQueue = this.eventsPublishingQueue.map((item) => {
      if (
        item.event.id === payload.event.id &&
        item.relayUrl === payload.relayUrl
      ) {
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

  private async attachUser(data: ProcessedEventWithEvents) {
    const userData = await this.db.getUser(data.event.pubkey);
    return {
      ...data,
      user: userData ? userData.user : undefined,
    };
  }

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

    return this.attachUser(data);
  }

  addEventToMemoryAndFrontend(event: ProcessedEventWithEvents, view: string) {
    this.eventsInMemory.push(event);
    if (this.options.isInWebWorker) {
      const workerEvent: WorkerEventNew = {
        type: "event:new",
        view,
        data: ProcessedToLightProcessedEvent(event),
      };
      postMessage(workerEvent);
    }
  }

  /**
   * Update in-memory event and send to frontend
   * - Usually for worker scenario to teach the main thread
   */
  updateEventInMemoryAndFrontend(
    event: ProcessedEventWithEvents,
    view?: string
  ) {
    const index = this.eventsInMemory.findIndex(
      (ev) => ev.event.id === event.event.id
    );
    if (index !== -1) {
      this.eventsInMemory[index] = event;
      if (this.options.isInWebWorker) {
        const workerEvent: WorkerEventUpdate = {
          type: "event:update",
          view,
          data: ProcessedToLightProcessedEvent(event),
        };
        postMessage(workerEvent);
      }
    }
  }

  deleteEventsByPublicKey(publicKey: string) {
    this.eventsInMemory = this.eventsInMemory.filter(
      (ev) => ev.event.pubkey !== publicKey
    );
    this.db.deleteEventByPublicKey(publicKey);
  }

  /**
   *  Process query for events
   * - defaults interval to last 24h if no range (since, until) is specified
   */
  async _getEventsQueryProcessor({ token, query }: StorageEventsQuery) {
    const reqRange = calculateEventsRequestRange(query.filters);
    const direction = query.direction || "NEWER";
    const interval =
      direction === "NEWER"
        ? reqRange[1] - reqRange[0]
        : reqRange[0] - reqRange[1];
    const reqCount = query.reqCount ? query.reqCount : 0;

    const memory =
      query.remainInRange && query.reqCount
        ? this.eventsQueryMemory[reqCount - 1]
        : undefined;

    const memoryEventIds = this.eventsInMemory.map((e) => e.event.id);
    const eventIds = memory
      ? [...memory.eventIds, ...memoryEventIds]
      : memoryEventIds;

    const result = await this.db.getEvents(query.filters, {
      eventIds: eventIds,
    });
    const events = result[0];
    const totalEvents = result[1];

    events.sort((a, b) => {
      return b.created_at - a.created_at;
    });

    const remainingEvents = query.remainInRange
      ? query.remainInRange - events.length
      : totalEvents - events.length;

    /**
     * If we've got events, return them
     */
    if (events.length > 0) {
      this.eventsQueryMemory[reqCount] = {
        eventIds: [
          ...events.map((e) => e.id),
          ...(memory ? memory.eventIds : []),
        ],
      };

      // Clear previous request to save memory
      if (memory && memory.eventIds.length > 0) {
        this.eventsQueryMemory[reqCount - 1] = {
          eventIds: [],
        };
      }

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
    if (this.lastQuery === undefined) return;
    if (this.lastQueryHasNewerEvents > event.created_at) return;
    const filters = this.lastQuery.query.filters;
    const hasSinceFilter = filters.since && filters.since > 0;
    const eventCreated = event.created_at;
    if (hasSinceFilter && eventCreated > filters.until - 10 * ONE_MINUTE) {
      this.lastQueryHasNewerEvents = eventCreated;

      if (this.options.isInWebWorker) {
        postMessage({
          type: "event:notify",
          data: ProcessedToLightProcessedEvent(NewProcessedEventFromDB(event)),
        });
      }
    }
  }

  /**
   * Get events
   * - Handles in-memory events
   * - Handles subscriptions
   *
   * - defaults interval to last 24h if no range (since, until) is specified
   */
  async getEvents(params: StorageEventsQuery): Promise<StorageQueryResult> {
    if (!params.query.reqCount || params.query.reqCount === 0) {
      this.eventsInMemory = [];
      this.lastQueryHasNewerEvents = undefined;
    }
    if (params.query.isOffline === true) {
      console.warn(`=> WORKER: Offline mode`);
    } else {
      console.log(`=> WORKER: Online mode`);
      await this.subscribe(relayEventsRequestFromQuery(params));
    }

    this.lastQuery = params;

    console.log(`=> WORKER: getEvents`, params);

    // if (params.query.isLive) {
    //   console.log(`=> WORKER: IS LIVE`, params);
    //   return {
    //     next: params.query,
    //     token: params.token,
    //     events: [],
    //   };
    // }

    // console.log(`=> WORKER: IS NOT LIVE`, params);

    const result = await this._getEventsQueryProcessor(params);
    if (
      result.events &&
      result.events.length > 0 &&
      params.query.isOffline !== true
    ) {
      // trying w/o await
      await this.processSelectedEvents(
        result.events,
        params.token,
        params.query.isLive
      );
    }

    const milestone = Date.now();

    const events = [];
    for (const event of result.events) {
      const formatted = await this.attachUser(NewProcessedEventFromDB(event));
      this.eventsInMemory.push(formatted);
      events.push(ProcessedToLightProcessedEvent(formatted));
    }

    const end = Date.now();
    console.log(
      `=> WORKER: getEvents: ${result.events.length} events in ${
        (end - milestone) / 1000
      }s`
    );

    return {
      ...result,
      token: params.token,
      events,
    };
  }

  async getEvent(
    id: string,
    options: {
      view: string;
      retryCount?: number;
      relayUrls?: string[];
      isLive?: boolean;
    }
  ) {
    let event = this.eventsInMemory.find((ev) => ev.event.id === id);
    if (!event) {
      console.log(
        `=> WORKER: Event not found in memory.`,
        this.eventsInMemory.length,
        event
      );
      const dbEvent = await this.db.getEvent(id);
      if (dbEvent) {
        event = NewProcessedEventFromDB(dbEvent);
      }
    }
    if (event) {
      await this.requestInformation(
        {
          source: "events:related",
          idsOrKeys: [id],
        },
        {
          timeoutIn: TEN_SECONDS_IN_MS,
          view: options.view,
          isLive: true,
        }
      );

      const user = await this.db.getUser(event.event.pubkey);
      event.user = user
        ? user.user
        : {
            pubkey: event.event.pubkey,
          };
      if (!user) {
        await this.requestInformation(
          {
            source: "users",
            idsOrKeys: [event.event.pubkey],
          },
          {
            timeoutIn: TEN_SECONDS_IN_MS,
            view: options.view,
            isLive: true,
          }
        );
      }
      return ProcessedToLightProcessedEvent(event);
    }
    if (!event && (!options?.retryCount || options.retryCount === 0)) {
      if (options.relayUrls) {
        for (const url of options.relayUrls) {
          const relay = this.relayClient.relays.find((r) => r.url === url);
          if (!relay) {
            this.relayClient.connectRelay({
              url,
              read: true,
              write: false,
            });
          }
        }
      }

      console.log(`=> WORKER: Event not found in DB, requesting from relay.`);

      await this.subscribe({
        type: CLIENT_MESSAGE_TYPE.REQ,
        filters: new NFilters({
          kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
          ids: [id],
        }),
        options: {
          timeoutIn: TEN_SECONDS_IN_MS,
          view: options?.view ? options.view : undefined,
          isLive: true,
        },
      });

      return undefined;
    }
  }

  private mergeEventWithActive(
    event: EventBaseSigned,
    relayUrl: string,
    view?: string,
    isLive?: boolean
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

            this.updateEventInMemoryAndFrontend(ev, view);
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
          this.updateEventInMemoryAndFrontend(
            {
              ...ev,
              user: data.user,
              eventRelayUrls: data.relayUrls,
            },
            view
          );
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

        this.updateEventInMemoryAndFrontend(ev, view);
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

        this.updateEventInMemoryAndFrontend(ev, view);
        return;
      }
    } else if (
      event.kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
      event.kind === NEVENT_KIND.LONG_FORM_CONTENT
    ) {
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

            this.updateEventInMemoryAndFrontend(ev, view);
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

            this.updateEventInMemoryAndFrontend(ev, view);
            return;
          }
        }
        // Not adding to main thread since this is a reponse; we only couldn't find the related event
        return;
      }

      if (isLive) {
        const exists = this.eventsInMemory.find(
          (ev) => ev.event.id === event.id
        );
        if (!exists) {
          this.getUser(event.pubkey).then((userData) => {
            const newEvent: ProcessedEventWithEvents = {
              eventRelayUrls: [relayUrl],
              user: userData ? userData.user : undefined,
              event: new NEvent(event),
              reactions: [],
              reposts: [],
              badgeAwards: [],
              replies: [],
              mentions: [],
              zapReceipts: [],
            };
            this.addEventToMemoryAndFrontend(newEvent, view);
          });
        }
      } else {
        console.log(`=> WORKER: NOT LIVE.`, event.id);
      }

      this.notifyOfNewEvent(event);
    }
  }

  private async processRelayNotice(
    kind: string,
    payload: WebSocketEvent,
    subscription?: RelaySubscription
  ) {
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

        if (this.options.isInWebWorker) {
          postMessage({
            type: "relay:message",
            data: payload,
          });
        }
      }

      return;
    } else if (kind === RELAY_MESSAGE_TYPE.EOSE) {
      if (subscription) {
        this.relayClient.updateSubscription({
          ...subscription,
          eose: true,
        });
      }

      if (this.options.isInWebWorker) {
        postMessage({
          type: "relay:message",
          data: payload,
        });
      }

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

      if (this.options.isInWebWorker) {
        postMessage({
          type: "relay:message",
          data: payload,
        });
      }

      return;
    } else if (kind === RELAY_MESSAGE_TYPE.AUTH) {
      if (this.options.isInWebWorker) {
        postMessage({
          type: "relay:message",
          data: payload,
        });
      }

      return;
    }
  }

  async processEvent(payload: WebSocketEvent) {
    if (!payload.data) {
      console.log(`=> WORKER: No data in payload`, payload);
      return;
    }

    const payLoadKind = payload.data[0];

    if (payLoadKind === RELAY_MESSAGE_TYPE.EVENT) {
      // Before all other processing
      const ev = payload.data[2] as EventBaseSigned;
      const inMemory = this.eventsInMemory.find(
        (item) => item.event.id === ev.id
      );

      if (inMemory) {
        return;
      }
    }

    /**
     * Determine if related to subscription and view
     */

    let subscription: RelaySubscription | undefined = undefined;
    let associatedWithView: string | undefined = undefined;
    let isLive: boolean = false;

    if (
      payLoadKind === RELAY_MESSAGE_TYPE.COUNT ||
      payLoadKind === RELAY_MESSAGE_TYPE.EOSE ||
      payLoadKind === RELAY_MESSAGE_TYPE.EVENT
    ) {
      subscription = this.relayClient?.getSubscription(
        payload.data[1] as string
      );
      associatedWithView = subscription?.options?.view;
      isLive = subscription?.options?.isLive || false;

      /**
       * Make sure event signature is correct
       */
      if (payLoadKind === RELAY_MESSAGE_TYPE.EVENT) {
        const isVald = verifyEvent(payload.data[2]);
        if (!isVald) {
          console.log(`=> WORKER: Invalid event signature`, payload.data[2]);
          return;
        }
      }
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
      this.processRelayNotice(payLoadKind, payload, subscription);
    }

    /**
     * Handle events
     */

    if (payLoadKind === RELAY_MESSAGE_TYPE.EVENT) {
      const kind = payload.data[2].kind;
      if (kind === NEVENT_KIND.METADATA) {
        const ev = payload.data[2] as EventBaseSigned;

        const newUser = new NUserBase();
        newUser.fromEvent(ev);
        this.db.getUser(ev.pubkey).then((userRecord) => {
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
            this.db.updateUser({
              ...userRecord,
              user: newUser,
            });
          } else {
            const data = {
              user: newUser,
              relayUrls: [payload.meta.url],
            };
            this.db.addUser(data);
          }
          this.mergeEventWithActive(
            ev,
            payload.meta.url,
            associatedWithView,
            isLive
          );
        });
      } else if (
        kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
        kind === NEVENT_KIND.LONG_FORM_CONTENT
      ) {
        const ev = payload.data[2] as EventBaseSigned;
        this.getUser(ev.pubkey).then((userData) => {
          if (!userData || !userData.isBlocked) {
            this.mergeEventWithActive(
              ev,
              payload.meta.url,
              associatedWithView,
              isLive
            );
          }
          if (userData && userData.following) {
            this.db.saveEvent(ev);
          }
        });
      } else if (
        kind === NEVENT_KIND.ZAP_RECEIPT ||
        kind === NEVENT_KIND.REACTION ||
        kind === NEVENT_KIND.REPOST
      ) {
        const ev = payload.data[2] as EventBaseSigned;

        this.getUser(ev.pubkey).then((userData) => {
          if (!userData || !userData.isBlocked) {
            this.mergeEventWithActive(
              ev,
              payload.meta.url,
              associatedWithView,
              isLive
            );
          }
        });
      } else if (kind === NEVENT_KIND.CONTACTS) {
        const ev = payload.data[2] as EventBaseSigned;
        const userRecord = await this.db.getUser(ev.pubkey);
        if (userRecord) {
          if (userRecord.isBlocked) {
            return;
          }
        }

        this.db.getUser(ev.pubkey).then((userRecord) => {
          if (userRecord) {
            if (userRecord.isBlocked) {
              return;
            }
          }

          this.db.saveEventAndDeleteOlderOfType(ev).then((isNewerOrSame) => {
            if (isNewerOrSame) {
              this.updateUsersFollowingFromContacts(ev);
            }
          });
        });
      }
    }
  }

  ////////////////////////////////// More Info //////////////////////////////////

  async processSelectedEvents(
    events: EventBaseSigned[],
    view: string,
    isLive: boolean
  ) {
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
        timeoutIn: TEN_SECONDS_IN_MS,
        view,
        isLive,
      }
    );

    await this.requestInformation(
      {
        source: "events:related",
        idsOrKeys: eventIds,
      },
      {
        timeoutIn: TEN_SECONDS_IN_MS,
        view,
        isLive,
      }
    );
  }

  async requestInformation(
    payload: {
      source: "users" | "events" | "events:related";
      idsOrKeys: string[];
    },
    options: SubscriptionOptions,
    kinds?: NEVENT_KIND[]
  ) {
    if (payload.idsOrKeys.length === 0) {
      return;
    }

    const filtered = payload.idsOrKeys;

    console.log(
      `=> WORKER: Getting information for ${filtered.length} ${payload.source}`,
      options
    );

    const subscriptions: RelaySubscription[] = [];

    // for 25 each
    const sliceSize = 50;
    for (let i = 0; i < filtered.length; i += sliceSize) {
      const keys = filtered.slice(i, i + sliceSize);
      let filters: NFilters;

      if (payload.source === "events") {
        filters = new NFilters({
          kinds: kinds
            ? kinds
            : [
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
          kinds: kinds
            ? kinds
            : [
                NEVENT_KIND.SHORT_TEXT_NOTE,
                NEVENT_KIND.REACTION,
                NEVENT_KIND.REPOST,
                NEVENT_KIND.ZAP_RECEIPT,
              ],
          "#e": keys,
        });
      } else if (payload.source === "users") {
        filters = new NFilters({
          kinds: kinds ? kinds : [NEVENT_KIND.METADATA],
          authors: keys,
        });
      } else {
        throw new Error("Invalid source");
      }

      const subs = await this.subscribe({
        type: CLIENT_MESSAGE_TYPE.REQ,
        filters,
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
    this.eventsInMemory = [];
  }
}
