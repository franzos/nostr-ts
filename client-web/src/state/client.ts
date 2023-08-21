import {
  NEventWithUserBase,
  WebSocketEvent,
  Relay,
  NEvent,
  NEVENT_KIND,
  NUserBase,
  NFilters,
  Subscribe,
  Count,
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
import { PublishingEventsQueueItem } from "./publishing-qeue";

interface Event {
  data: {
    type:
      | "event:new"
      | "event:update"
      | "relay:message"
      | "event:queue:new"
      | "event:queue:update";
    data: NEventWithUserBase | WebSocketEvent | PublishingEventsQueueItem;
  };
}

const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

function throttle(fn: (events: Event[]) => void, delay: number) {
  let timeout: number | null = null;
  let eventsBatch: Event[] = [];

  return function (event: Event) {
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

    const processEvents = (events: Event[]) => {
      events.forEach((event) => {
        const payload = event.data;

        if (payload.type === "event:new" || payload.type === "event:update") {
          const data = payload.data as NEventWithUserBase;
          if (payload.type === "event:new") {
            set({
              events: [...get().events, data],
            });
          } else if (payload.type === "event:update") {
            const eventIndex = get().events.findIndex(
              (event) => event.event.id === data.event.id
            );

            if (eventIndex !== -1) {
              const updatedEvents = [...get().events];
              updatedEvents[eventIndex] = data;
              set({ events: updatedEvents });
            }
          }
        } else if (payload.type === "relay:message") {
          console.log("relay:message", payload.data);
          const data = payload.data as WebSocketEvent;
          set({
            relayEvents: [...get().relayEvents, data],
          });
        } else if (payload.type === "event:queue:update") {
          const data = payload.data as PublishingEventsQueueItem;
          const index = get().eventsPublishingQueue.findIndex(
            (item) => item.event.id === data.event.id
          );
          if (index !== -1) {
            const updatedQueue = [...get().eventsPublishingQueue];
            updatedQueue[index] = Object.assign(updatedQueue[index], data);
            set({ eventsPublishingQueue: updatedQueue });
          }
        }
      });
    };

    const throttledEvents = throttle(processEvents, 100);

    worker.addEventListener("message", throttledEvents);
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
    id: string,
    options: {
      isEnabled?: boolean;
      read?: boolean;
      write?: boolean;
    }
  ) => {
    return get().store.updateRelay(id, options);
  },
  relayEvents: [],
  getSubscriptions: async () => {
    return get().store.getSubscriptions();
  },
  subscribe: async (payload: Subscribe) => {
    return get().store.subscribe(payload);
  },
  unsubscribe: async (id: string) => {
    return get().store.unsubscribe(id);
  },
  unsubscribeAll: async () => {
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
      });
    } else {
      console.error(`Unknown keystore ${config.keystore}`);
    }
  },
  keypair: { publicKey: "", privateKey: "" },
  keypairIsLoaded: false,
  newEvent: new NEvent({
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
  }),
  setNewEvent: (event: NEvent) => {
    set({ newEvent: event });
  },
  newEventName: "NewShortTextNote",
  setNewEventName: (name: string) => {
    set({ newEventName: name });
  },
  setNewEventContent: (content: string) => {
    set({ newEvent: get().newEvent.setContentWithoutChecks(content) });
  },
  count: async (payload: Count) => {
    return get().store.count(payload);
  },
  events: [],
  maxEvents: MAX_EVENTS,
  setMaxEvents: async (max: number) => {
    console.log(`Setting max events to ${max}`);
    await get().store.setMaxEvents(max);
    set({ maxEvents: max });
  },
  skippedEvents: 0,
  getUser: async (pubkey: string) => {
    return get().store.getUser(pubkey);
  },
  addUser: async (user: NUserBase) => {
    return get().store.addUser(user);
  },
  updateUser: async (user: NUserBase) => {
    return get().store.updateUser(user);
  },
  countUsers: async () => {
    return get().store.countUsers();
  },
  getEventById: (id: string) => {
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
  sendEvent: async (event: NEvent) => {
    return get().store.sendEvent(event);
  },
  signAndSendEvent: async (event: NEvent, proofOfWorkBits?: number) => {
    const keypair = get().keypair;
    if (!keypair) {
      throw new Error("Keypair not initialized");
    }

    const keystore = get().keystore;
    const relays = await get().getRelays();
    const available = relays.filter((r) => r.write);

    let signedEvent: NEvent;

    // Ready event
    event.pubkey = keypair.publicKey;
    event.generateId();
    const origId = event.id;

    set({
      eventsPublishingQueue: [
        ...get().eventsPublishingQueue,
        {
          event,
          send: false,
          powRequired: proofOfWorkBits,
          powStartTime: proofOfWorkBits && proofOfWorkBits > 0 ? Date.now() : 0,
          powEndTime: 0,
          powDone: false,
          accepted: false,
          relays: available.map((r) => {
            return {
              id: r.id,
              send: false,
            };
          }),
        },
      ],
    });

    // TODO: Check if relay requires POW
    if (proofOfWorkBits && proofOfWorkBits > 0) {
      console.log(`Generating proof of work for event ${event.id}`);
      const result = await get().eventProofOfWork(event, proofOfWorkBits);
      console.log(`Proof of work for event ${event.id} is ${result}`);
      event = new NEvent(result);

      const index = get().eventsPublishingQueue.findIndex(
        (e) => e.event.id === origId
      );
      if (index >= 0) {
        const queue = get().eventsPublishingQueue;
        queue[index].event = event;
        queue[index].powDone = true;
        queue[index].powEndTime = Date.now();
        console.log(
          `Proof of work took ${
            (queue[index].powEndTime as number) -
            (queue[index].powStartTime as number)
          }ms`
        );
        set({ eventsPublishingQueue: queue });
      }
    }

    if (keystore === "localstore") {
      event.sign({
        privateKey: keypair.privateKey || "",
        publicKey: keypair.publicKey,
      });
      signedEvent = event;
    } else if (keystore === "nos2x") {
      if (window.nostr && window.nostr.signEvent) {
        const ev = await window.nostr.signEvent(event.toJson());
        console.log("signed event", ev);
        signedEvent = new NEvent(ev);
      } else {
        throw new Error("Nostr not initialized");
      }
    } else {
      throw new Error("Invalid keystore");
    }

    event.isReadyToPublishOrThrow();
    await get().sendEvent(signedEvent);
    return event.id;
  },
  eventsPublishingQueue: [],
  clearEvents: async () => {
    await get().store.clearEvents();
    set({ events: [] });
  },
  /**
   * Follow a user
   */
  followUser: async (pubkey: string) => {
    await get().store.followUser(pubkey);
    const folowing = await get().store.getAllUsersFollowing();
    if (folowing) {
      set({ followingUserIds: folowing.map((u) => u.pubkey) });
    }
  },
  /**
   * Unfollow a user
   */
  unfollowUser: async (pubkey: string) => {
    await get().store.unfollowUser(pubkey);
    const folowing = await get().store.getAllUsersFollowing();
    if (folowing) {
      set({ followingUserIds: folowing.map((u) => u.pubkey) });
    }
  },
  /**
   * Check if following user
   */
  followingUser: async (pubkey: string) => {
    return get().store.followingUser(pubkey);
  },
  followingUserIds: [],
  getAllUsersFollowing: async () => {
    return get().store.getAllUsersFollowing();
  },
  /**
   * Update information of user we are following
   * @param user
   */
  updateUserFollowing: async (user: NUserBase) => {
    return get().store.updateUserFollowing(user);
  },
  requestInformation: (
    source: "events" | "users",
    idsOrKeys: string[],
    options?: {
      timeout?: number;
    }
  ) => {
    return get().store.requestInformation(source, idsOrKeys, options);
  },
  hasSubscriptionForEventIds: async (
    eventIds: string[],
    kinds: NEVENT_KIND[]
  ) => {
    return get().store.hasSubscriptionForEventIds(eventIds, kinds);
  },

  hasViewSubscription: async (view: string) => {
    const subs = await get().getSubscriptions();
    return subs.some((s) => s.options && s.options.view === view);
  },

  /**
   * Setup a subscription related to a view
   * @param view
   * @param filters
   * @returns
   */
  setViewSubscription: async (view: string, filters: NFilters) => {
    const subs = await get().getSubscriptions();

    const sameView = subs.find((s) => s.options && s.options.view === view);
    if (sameView) {
      console.log(`Already subscribed to view ${view}`);
      return;
    }

    for (const sub of subs) {
      if (sub.options && sub.options.view) {
        await get().unsubscribe(sub.subscriptionId);
      }
    }

    await get().subscribe({
      filters,
      options: {
        view,
        timeout: 0,
        timeoutAt: 0,
      },
    });

    const infoRequestPromises = [];

    const eventUserPubkeys = get()
      .events.filter((e) => !e.user?.pubkey)
      .map((e) => e.event.pubkey);

    const eventIds = get()
      .events.filter((e) => !e.reactions)
      .map((e) => e.event.id);

    if (eventUserPubkeys.length > 0) {
      infoRequestPromises.push(
        get().requestInformation("users", eventUserPubkeys)
      );
    }

    if (eventIds.length > 0) {
      infoRequestPromises.push(get().requestInformation("events", eventIds));
    }

    await Promise.all(infoRequestPromises);
  },

  /**
   * Remove a subscription related to a view
   * @param view
   * @returns
   */
  removeViewSubscription: async (view?: string) => {
    const subs = await get().getSubscriptions();

    if (!view) {
      const unsubPromises = subs.map((sub) =>
        get().unsubscribe(sub.subscriptionId)
      );
      await Promise.all(unsubPromises);
      return;
    }

    const subsToUnsubscribe = subs.filter(
      (sub) => sub.options && sub.options.view === view
    );

    const unsubPromises = subsToUnsubscribe.map((sub) =>
      get().unsubscribe(sub.subscriptionId)
    );

    await Promise.all(unsubPromises);
  },
}));
