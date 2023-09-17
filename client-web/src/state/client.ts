import { nanoid } from "nanoid";
import {
  WebSocketEvent,
  Relay,
  NEvent,
  PublishingQueueItem,
  CountRequest,
  PublishingRequest,
  WebSocketClientInfo,
  AuthRequest,
  CloseRequest,
  EventsRequest,
  ProcessedUserBase,
  UserRecord,
  LightProcessedEvent,
  NewAuthEvent,
  CLIENT_MESSAGE_TYPE,
} from "@nostr-ts/common";
import { wrap } from "comlink";
import { create } from "zustand";
import { MAX_EVENTS } from "../defaults";
import { NClient } from "./client-types";
import {
  NClientKeystore,
  loadKeyStoreConfig,
  saveKeyStoreConfig,
} from "./keystore";
import { SubscriptionOptions } from "@nostr-ts/common";
import { CreateListRecord, SystemStatus, WorkerEvent } from "./base-types";
import { NWorker, StorageEventsQuery } from "@nostr-ts/web";

const throttleDelayInMs = 500;

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

function throttle(fn: (events: WorkerEvent[]) => void, delay: number) {
  let timeout: number | null = null;
  let eventsBatch: WorkerEvent[] = [];

  return function (incomingEvent: WorkerEvent) {
    if (incomingEvent.data.type === "event:update") {
      const incomingEventId = (incomingEvent.data.data as LightProcessedEvent)
        .event.id;

      const existingEventIndex = eventsBatch.findIndex((batchEvent) => {
        if (batchEvent.data.type === "event:update") {
          const batchEventId = (batchEvent.data.data as LightProcessedEvent)
            .event.id;
          return batchEventId === incomingEventId;
        }
        return false;
      });

      if (existingEventIndex !== -1) {
        eventsBatch[existingEventIndex] = incomingEvent;
      } else {
        eventsBatch.push(incomingEvent);
      }
    } else {
      eventsBatch.push(incomingEvent);
    }

    if (!timeout) {
      timeout = setTimeout(() => {
        fn(eventsBatch);
        eventsBatch = [];
        timeout = null;
      }, delay);
    }
  };
}

export const useNClient = create<NClient>((set, get) => ({
  status: "loading",
  store: wrap<NWorker>(worker),
  hasNewerEvents: undefined,
  _processEvents: (events: WorkerEvent[]) => {
    events.forEach((event) => {
      const payload = event.data;
      if (payload.type === "RAW") return;

      switch (payload.type) {
        case "event:new":
          set({
            hasNewerEvents: {
              count: (function () {
                const hasNotification = get().hasNewerEvents;
                if (hasNotification) {
                  return hasNotification.count + 1;
                }
                return 1;
              })(),
              lastTimestamp: (payload.data as LightProcessedEvent).event
                .created_at,
            },
          });
          break;
        case "event:update":
          get().updateEvent(payload.data as LightProcessedEvent);
          break;
        case "relay:message":
          set({
            relayEvents: [...get().relayEvents, payload.data as WebSocketEvent],
          });
          break;
        case "status:change":
          set({ status: payload.data as SystemStatus });
          console.log(`Status changed to ${payload.data}`);
          break;
        default:
          console.log(`Unsupported payload type: ${payload.type}`);
      }
    });
  },
  init: async () => {
    try {
      await get().loadKeyStore();

      const throttledEvents = throttle(get()._processEvents, throttleDelayInMs);
      worker.addEventListener("message", throttledEvents);

      await get().store.init();

      const following = await get().store.getAllUsersFollowing();
      if (following) {
        set({ followingUserIds: following.map((u) => u.user.pubkey) });
      }
    } catch (err) {
      console.error("Initialization failed:", err);
    }
  },
  connected: false,
  connect: async (relays: Relay[]) => {
    if (get().connected) {
      return;
    }
    await get().store.connect(relays);
    set({
      connected: true,
    });
  },
  disconnect: async () => {
    await get().store.disconnect();
    set({
      connected: false,
    });
  },
  getRelays: async () => {
    return get().store.getRelays();
  },
  updateRelay: async (
    url: string,
    options: {
      isEnabled?: boolean;
      read?: boolean;
      write?: boolean;
    }
  ) => {
    return get().store.updateRelay(url, options);
  },
  relayAuth: async (relayUrl: string, challenge: string) => {
    const keypair = get().keypair;
    if (!keypair) {
      throw new Error("Keypair not initialized");
    }

    const keystore = get().keystore;

    const ev = NewAuthEvent({
      relayUrl,
      challenge,
    });
    ev.pubkey = keypair.publicKey;
    ev.generateId();

    if (keystore === "localstore") {
      if (!keypair.privateKey || keypair.privateKey === "") {
        throw new Error("No private key available");
      }
      ev.sign({
        privateKey: keypair.privateKey,
        publicKey: keypair.publicKey,
      });
    } else if (keystore === "nos2x") {
      if (window.nostr && window.nostr.signEvent) {
        const signedEv = await window.nostr.signEvent(ev.ToObj());
        if (!signedEv.sig) {
          throw new Error("No signature");
        }
        ev.sig = signedEv.sig;
      } else {
        throw new Error("Nostr not initialized");
      }
    } else {
      throw new Error("Invalid keystore");
    }

    await get().subscribe({
      type: CLIENT_MESSAGE_TYPE.AUTH,
      signedEvent: ev.ToObj(),
      relayUrls: [relayUrl],
      options: {
        // 5 minutes
        timeoutIn: 300000,
      },
    });
  },
  relayEvents: [],
  getSubscriptions: async () => {
    return get().store.getSubscriptions();
  },
  subscribe: async (
    payload: CountRequest | AuthRequest | EventsRequest | CloseRequest
  ) => {
    return get().store.subscribe(payload);
  },
  unsubscribe: async (ids: string[]) => {
    return get().store.unsubscribe(ids);
  },
  unsubscribeAll: async () => {
    return get().store.unsubscribeAll();
  },
  unsubscribeByToken: async (token: string) => {
    console.log(`=> CLIENT: Unsubscribe by token`, token);
    set({ events: [] });
    return get().store.unsubscribeByToken(token);
  },
  keystore: "none",
  loadKeyStore: () => {
    const store = loadKeyStoreConfig();
    set({
      keystore: store.keystore,
    });
    if (
      store.keystore === "localstore" &&
      store.publicKey &&
      store.privateKey
    ) {
      set({
        keypair: {
          publicKey: store.publicKey,
          privateKey: store.privateKey,
        },
        keypairIsLoaded: true,
      });
    }
  },
  saveKeyStore: () => {
    const keystore = get().keystore;
    if (keystore === "localstore") {
      const keypair = get().keypair;
      if (keypair) {
        saveKeyStoreConfig({
          keystore,
          publicKey: keypair.publicKey,
          privateKey: keypair.privateKey,
        });
      } else {
        saveKeyStoreConfig({
          keystore: keystore,
        });
      }
    }
  },
  resetKeyStore: () => {
    saveKeyStoreConfig({
      keystore: "none",
    });
    set({
      keystore: "none",
      keypair: { publicKey: "", privateKey: "" },
      keypairIsLoaded: false,
    });
  },
  setKeyStore: (config: NClientKeystore) => {
    if (config.keystore === "localstore") {
      if (config.publicKey && config.privateKey) {
        set({
          keystore: config.keystore,
          keypair: {
            publicKey: config.publicKey,
            privateKey: config.privateKey,
          },
          keypairIsLoaded: true,
        });
        get().saveKeyStore();
      }
    } else if (config.keystore === "nos2x") {
      set({
        keystore: config.keystore,
        keypair: {
          publicKey: config.publicKey || "",
        },
        keypairIsLoaded: true,
      });
    } else {
      console.error(`Unknown keystore ${config.keystore}`);
    }
  },
  keypair: { publicKey: "", privateKey: "" },
  keypairIsLoaded: false,
  getPopularEvents: async () => {
    return get().store.getPopularEvents();
  },
  getPopularUsers: async () => {
    return get().store.getPopularUsers();
  },
  calculatePopular: async () => {
    return get().store.calculatePopular();
  },
  count: async (pubkey: string) => {
    console.log(`=> CLIENT: TODO Count`, pubkey);
    return new Promise((resolve) => resolve([]));
  },
  countEvents: async () => {
    return new Promise((resolve) => resolve(0));
  },
  getEvent: async (
    id: string,
    options?: {
      token?: string;
      retryCount?: number;
    }
  ) => {
    return get().store.getEvent(id, options);
  },
  nextQuery: undefined,
  getEvents: async (
    queryParams?: StorageEventsQuery,
    insertAt?: "append" | "prepend" | "replace"
  ) => {
    const insert = insertAt || "append";
    let params = queryParams;

    if (!params) {
      const nextQuery = get().nextQuery;
      if (!nextQuery) {
        throw new Error("No query params provided and no next query set");
      }
      params = {
        token: nextQuery.token,
        query: nextQuery.next,
      };
    }
    const isFirstReq = params.query.reqCount
      ? params.query.reqCount === 0
      : true;
    if (isFirstReq) {
      set({
        nextQuery: undefined,
        hasNewerEvents: {
          count: 0,
          lastTimestamp: 0,
        },
      });
    }
    const data = await get().store.getEvents(params);

    if (data.events && data.events.length > 0 && isFirstReq) {
      set({
        events: data.events,
        nextQuery: {
          token: params.token,
          next: data.next,
        },
      });
    } else if (data.events && data.events.length > 0) {
      if (insert === "prepend") {
        set({
          // event.created_at
          events: [...data.events, ...get().events],
          nextQuery: {
            token: params.token,
            next: data.next,
          },
          hasNewerEvents: undefined,
        });
      } else if (insert === "append") {
        set({
          events: [...get().events, ...data.events],
          nextQuery: {
            token: params.token,
            next: data.next,
          },
        });
      } else {
        set({
          events: data.events,
          nextQuery: {
            token: params.token,
            next: data.next,
          },
        });
      }
    } else {
      set({
        nextQuery: {
          token: params.token,
          next: data.next,
        },
      });
    }
    return data.next;
  },
  getEventReplies: async (id: string) => {
    return get().store.getEventReplies(id);
  },
  events: [],
  addEvent: (payload: LightProcessedEvent) => {
    set({
      events: [...get().events, payload],
    });
  },
  addEvents: (payload: LightProcessedEvent[]) => {
    set({
      events: [...get().events, ...payload],
    });
  },
  updateEvent: (payload: LightProcessedEvent) => {
    const events = [...get().events]; // copy existing array
    const indexToUpdate = events.findIndex(
      (event) => event.event.id === payload.event.id
    );

    if (indexToUpdate !== -1) {
      events[indexToUpdate] = payload;
    }

    set({ events });
  },
  updateEvents: (payload: LightProcessedEvent[]) => {
    const events = [...get().events];
    const payloadMap = Object.fromEntries(payload.map((p) => [p.event.id, p]));

    for (let i = 0; i < events.length; i++) {
      if (payloadMap[events[i].event.id]) {
        events[i] = payloadMap[events[i].event.id];
      }
    }

    set({ events });
  },
  maxEvents: MAX_EVENTS,
  setMaxEvents: async (max: number) => {
    set({ maxEvents: max });
  },

  /**
   * Check which of the given relays are available
   * - check requirements
   */
  determineApplicableRelays: async (
    request: PublishingRequest
  ): Promise<{
    relays: WebSocketClientInfo[];
    pow: number;
  }> => {
    // TODO: RELAY check if supported (supportsEvent)
    const relays = await get()
      .getRelays()
      .then((rels) => {
        if (!rels) {
          return [];
        }
        // If preference provided; if not use all
        const selected = request.relayUrls
          ? rels.filter((r) => request.relayUrls?.includes(r.url))
          : rels;
        return selected.filter((r) => r.isReady && r.write === true);
      });

    return {
      relays,
      pow: 0,
    };
  },

  /**
   * Generate queue items from request
   * - Process relays
   * - Generate queue item
   */
  generateQueueItems: async (
    request: PublishingRequest
  ): Promise<PublishingQueueItem[] | undefined> => {
    let applicableRelays: WebSocketClientInfo[] = [];
    const { relays } = await get().determineApplicableRelays(request);
    if (request.relayUrls && request.relayUrls.length > 0) {
      applicableRelays = relays.filter((r) =>
        request.relayUrls?.includes(r.url)
      );
    } else {
      applicableRelays = relays;
    }
    if (applicableRelays.length === 0) {
      return undefined;
    }
    const newSubs: PublishingQueueItem[] = [];
    for (const relay of applicableRelays) {
      if (relay.isReady && relay.write) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { relayUrls: _relayUrls, ...restOfRequest } = request;
        const sub: PublishingQueueItem = {
          ...restOfRequest,
          id: nanoid(),
          relayUrl: relay.url,
          send: false,
        };
        newSubs.push(sub);
      }
    }
    return newSubs;
  },
  getQueueItems: async () => {
    return get().store.getQueueItems();
  },
  /**
   * Add items to publishing queue
   */
  getUser: async (pubkey: string): Promise<UserRecord | undefined> => {
    return get().store.getUser(pubkey);
  },
  addUser: async (payload: ProcessedUserBase) => {
    return get().store.addUser(payload);
  },
  updateUser: async (pubkey: string, payload: ProcessedUserBase) => {
    return get().store.updateUser(pubkey, payload);
  },
  countUsers: async () => {
    return get().store.countUsers();
  },
  eventProofOfWork: async (event: NEvent, bits: number) => {
    return new Promise((resolve) => {
      const worker = new Worker(new URL("./pow-worker.ts", import.meta.url), {
        type: "module",
      });

      // Setup an event listener to receive results from the worker
      worker.onmessage = function (e) {
        resolve(e.data.result);
        // Terminate the worker after receiving the result
        worker.terminate();
      };

      // Send a message to the worker to start the calculation
      worker.postMessage({
        event: event,
        bits: bits,
      });
    });
  },
  sendEvent: async (event: PublishingRequest) => {
    return get().store.sendEvent(event);
  },
  signAndSendEvent: async (payload: PublishingRequest) => {
    const keypair = get().keypair;
    if (!keypair) {
      throw new Error("Keypair not initialized");
    }

    const keystore = get().keystore;

    let ev = payload.event;
    ev.pubkey = keypair.publicKey;
    ev.generateId();

    let relayUrls = payload.relayUrls;

    // Check if POW is needed and which relays are available
    const { relays, pow } = await get().determineApplicableRelays(payload);
    if (relays.length === 0) {
      if (relayUrls?.length === 0) {
        throw new Error(
          `None of the required relays are available: ${relayUrls.join(", ")}.`
        );
      } else {
        throw new Error(`No write-enabled relays available.`);
      }
    }

    relayUrls = relays.map((r) => r.url);

    let requestedPOW = payload.pow;
    const neededPow = pow;
    if (requestedPOW && requestedPOW !== 0) {
      if (requestedPOW < neededPow) {
        // Smaller than needed, throw error
        throw new Error(
          `Requested POW ${requestedPOW} is lower than needed ${neededPow}`
        );
      } else if (requestedPOW > neededPow) {
        // Equal or higher than needed, use requested
      }
    } else {
      // No requested POW, use needed
      requestedPOW = neededPow;
    }

    let queueItems: PublishingQueueItem[] = [];

    if (requestedPOW > 0) {
      const items = await get().generateQueueItems({
        ...payload,
        relayUrls,
        pow: requestedPOW,
      });
      if (items) {
        queueItems = items;
      }
      await get().store.addQueueItems(queueItems);
      const result = await get().eventProofOfWork(payload.event, requestedPOW);
      ev = new NEvent(result);

      for (const item of queueItems) {
        item.event = ev;
        item.powDone = Date.now();
      }
    }

    if (keystore === "localstore") {
      ev.sign({
        privateKey: keypair.privateKey || "",
        publicKey: keypair.publicKey,
      });
    } else if (keystore === "nos2x") {
      if (window.nostr && window.nostr.signEvent) {
        const signedEv = await window.nostr.signEvent(ev.ToObj());
        if (!signedEv.sig) {
          throw new Error("No signature");
        }
        ev.sig = signedEv.sig;
      } else {
        throw new Error("Nostr not initialized");
      }
    } else {
      throw new Error("Invalid keystore");
    }

    ev.isReadyToPublishOrThrow();

    if (queueItems.length === 0) {
      // If this is 0, we didn't need POW
      const items = await get().generateQueueItems({
        ...payload,
        relayUrls,
        pow: requestedPOW,
        event: ev,
      });
      if (items) {
        queueItems = items;
      }
      await get().store.addQueueItems(queueItems);
      // get().addQueueItems?.(queueItems);
    } else {
      for (const item of queueItems) {
        item.event = ev;
        await get().store.updateQueueItem(item);
      }
    }

    await get().store.sendQueueItems(queueItems);
    return ev.id;
  },
  followUser: async (payload: { pubkey: string; relayUrls: string[] }) => {
    await get().store.followUser(payload.pubkey);
    const folowing = await get().store.getAllUsersFollowing();
    if (folowing) {
      set({ followingUserIds: folowing.map((u) => u.user.pubkey) });
    }
  },
  unfollowUser: async (pubkey: string) => {
    await get().store.unfollowUser(pubkey);
    const folowing = await get().store.getAllUsersFollowing();
    if (folowing) {
      set({ followingUserIds: folowing.map((u) => u.user.pubkey) });
    }
  },
  followingUser: async (pubkey: string) => {
    const userData = await get().store.getUser(pubkey);
    return userData?.following || false;
  },
  followingUserIds: [],
  getAllUsersFollowing: async () => {
    return get().store.getAllUsersFollowing();
  },
  blockUser: async (payload: { pubkey: string; relayUrls: string[] }) => {
    await get().store.blockUser(payload.pubkey);
    set({
      events: get().events.filter((e) => e.event.pubkey !== payload.pubkey),
    });
  },
  unblockUser: async (pubkey: string) => {
    return get().store.unblockUser(pubkey);
  },
  getAllUsersBlocked: async () => {
    return get().store.getAllUsersBlocked();
  },
  createList: async (payload: CreateListRecord) => {
    return get().store.createList(payload);
  },
  updateList: async (id: string, payload: CreateListRecord) => {
    return get().store.updateList(id, payload);
  },
  deleteList: async (id: string) => {
    return get().store.deleteList(id);
  },
  getAllLists: async () => {
    return get().store.getAllLists();
  },
  getList: async (id: string) => {
    return get().store.getList(id);
  },
  getListsWithUser: async (pubkey: string) => {
    return get().store.getListsWithUser(pubkey);
  },
  addUserToList: async (id: string, pubkey: string) => {
    return get().store.addUserToList(id, pubkey);
  },
  removeUserFromList: async (id: string, pubkey: string) => {
    return get().store.removeUserFromList(id, pubkey);
  },
  requestInformation: (
    payload: {
      source: "users" | "events" | "events:related";
      idsOrKeys: string[];
    },
    options: SubscriptionOptions
  ) => {
    return get().store.requestInformation(payload, options);
  },
}));
