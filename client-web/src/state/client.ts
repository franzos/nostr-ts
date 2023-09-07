import { nanoid } from "nanoid";
import {
  ProcessedEvent,
  WebSocketEvent,
  Relay,
  NEvent,
  NFilters,
  PublishingQueueItem,
  CountRequest,
  PublishingRequest,
  WebSocketClientInfo,
  RelaysWithIdsOrKeys,
  AuthRequest,
  CloseRequest,
  EventsRequest,
  ProcessedUserBase,
  UserRecord,
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
import { NClientWorker } from "./worker-types";
import { SubscriptionOptions } from "@nostr-ts/common";
import { WorkerEvent } from "./base-types";

const throttleDelayInMs = 250;

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

function throttle(fn: (events: WorkerEvent[]) => void, delay: number) {
  let timeout: number | null = null;
  let eventsBatch: WorkerEvent[] = [];

  return function (event: WorkerEvent) {
    eventsBatch.push(event);

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
  store: wrap<NClientWorker>(worker),
  init: async (config?: { maxEvents?: number }) => {
    await get().loadKeyStore();
    await get().store.init(config);

    const processEvents = (events: WorkerEvent[]) => {
      if (get().changingView) return;
      events.map((event) => {
        const payload = event.data;

        if (payload.type === "event:new" || payload.type === "event:update") {
          const data = payload.data as ProcessedEvent;
          if (payload.type === "event:new") {
            get().addEvent(data);
          } else if (payload.type === "event:update") {
            get().updateEvent(data);
          }
        } else if (payload.type === "relay:message") {
          const data = payload.data as WebSocketEvent;
          set({
            relayEvents: [...get().relayEvents, data],
          });
        }
      });
    };

    const throttledEvents = throttle(processEvents, throttleDelayInMs);
    worker.addEventListener("message", throttledEvents);

    const following = await get().store.getAllUsersFollowing();
    if (following) {
      set({ followingUserIds: following.map((u) => u.user.pubkey) });
    }
  },
  connected: false,
  connect: async (relays?: Relay[]) => {
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
    console.log(`Unsubscribing ${ids}`);
    return get().store.unsubscribe(ids);
  },
  unsubscribeAll: async () => {
    console.log(`Unsubscribing all`);
    return get().store.unsubscribeAll();
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
      console.log(`Setting keystore for ${config.keystore}`, config);
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
  count: async (payload: CountRequest) => {
    return get().store.count(payload);
  },
  countEvents: async () => {
    return get().store.countEvents();
  },
  getEvents: async (params: { limit?: number; offset?: number }) => {
    await get().store.getEvents(params);
  },
  events: [],
  addEvent: (payload: ProcessedEvent) => {
    set({
      events: [...get().events, payload],
    });
  },
  updateEvent: (payload: ProcessedEvent) => {
    set({
      events: get().events.map((event) => {
        if (event.event.id === payload.event.id) {
          return payload;
        }
        return event;
      }),
    });
  },
  maxEvents: MAX_EVENTS,
  setMaxEvents: async (max: number) => {
    await get().store.setMaxEvents(max);
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
    console.log(`Determining applicable relays`, request);
    // TODO: RELAY check if supported (supportsEvent)
    const allRelays = await get().getRelays();
    const relays =
      request.relayUrls && request.relayUrls.length > 0
        ? allRelays.filter((r) => request.relayUrls?.includes(r.url))
        : allRelays;

    return {
      relays: relays.filter((r) => r.isReady && r.write === true),
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
  getEventById: async (id: string) => {
    return get().store.getEventById(id);
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
    await get().store.followUser(payload);
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
    return get().store.followingUser(pubkey);
  },
  followingUserIds: [],
  getAllUsersFollowing: async () => {
    return get().store.getAllUsersFollowing();
  },
  blockUser: async (payload: { pubkey: string; relayUrls: string[] }) => {
    await get().store.blockUser(payload);
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
  requestInformation: (
    payload: RelaysWithIdsOrKeys,
    options: SubscriptionOptions
  ) => {
    return get().store.requestInformation(payload, options);
  },

  changingView: false,

  /**
   * Setup a subscription related to a view
   * @param view
   * @param filters
   * @returns
   */
  setViewSubscription: async (
    view: string,
    filters: NFilters,
    options?: {
      reset?: boolean;
    }
  ) => {
    set({ changingView: true });
    await get().store.setViewSubscription(view, filters, options);
    if (options && options.reset) {
      /**
       * Cleanup previous subscription
       */
      set({ maxEvents: MAX_EVENTS });
      set({ events: [] });
    }
    set({ changingView: false });
  },

  /**
   * Remove a subscription related to a view
   * @param view
   * @returns
   */
  removeViewSubscription: async (view: string) => {
    await get().store.removeViewSubscription(view);
  },
}));
