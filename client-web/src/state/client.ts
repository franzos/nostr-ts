import { create } from "zustand";
import {
  NEvent,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  WebSocketClientConfig,
  NFilters,
  NEVENT_KIND,
  NUserBase,
  Relay,
  NEventWithUserBase,
  ClientSubscription,
  Subscribe,
} from "@nostr-ts/common";
import { MAX_EVENTS } from "../defaults";
import { Remote, wrap } from "comlink";
import { NClientStoreBase, NClientStoreBaseWorker } from "../worker";

interface NClientCKeystore {
  keystore: "none" | "localstore" | "nos2x" | "download";
  publicKey?: string;
  privateKey?: string;
}

function loadKeyStoreConfig(): NClientCKeystore {
  const keystore = localStorage.getItem("nostr-client:keystore:keystore");
  if (keystore) {
    if (keystore === "localstore") {
      const publicKey = localStorage.getItem(
        "nostr-client:keystore:public-key"
      );
      const privateKey = localStorage.getItem(
        "nostr-client:keystore:private-key"
      );
      if (publicKey && privateKey) {
        return {
          keystore: "localstore",
          publicKey,
          privateKey,
        };
      }
    } else if (keystore === "nos2x") {
      return {
        keystore: "nos2x",
        publicKey: undefined,
        privateKey: undefined,
      };
    } else if (keystore === "download") {
      return {
        keystore: "download",
        publicKey: undefined,
        privateKey: undefined,
      };
    }
  }
  return {
    keystore: "none",
    publicKey: undefined,
    privateKey: undefined,
  };
}

function saveKeyStoreConfig(config: NClientCKeystore) {
  localStorage.setItem("nostr-client:keystore:keystore", config.keystore);
  if (
    config.keystore === "localstore" &&
    config.publicKey &&
    config.privateKey
  ) {
    localStorage.setItem("nostr-client:keystore:public-key", config.publicKey);
    localStorage.setItem(
      "nostr-client:keystore:private-key",
      config.privateKey
    );
  } else if (config.keystore === "nos2x") {
    // TODO: Implement
  } else if (config.keystore === "download") {
    // TODO: Implement
  }
}

export interface NClientStore extends NClientStoreBase {
  store: Remote<NClientStoreBaseWorker>;
  keystore?: "none" | "localstore" | "nos2x" | "download";
  loadKeyStore: () => void;
  saveKeyStore: () => void;
  setKeyStore: (config: NClientCKeystore) => void;
  keypair: { publicKey: string; privateKey?: string };
  keypairIsLoaded: boolean;
  newEvent: NEvent;
  signAndSendEvent: (event: NEvent) => Promise<string>;
  setNewEvent: (event: NEvent) => void;
  setMaxEvents: (max: number) => Promise<void>;
  clearEvents: () => Promise<void>;
  /**
   * Track kind name like NewShortTextNote
   */
  newEventName: string;
  setNewEventName: (name: string) => void;
  setNewEventContent: (content: string) => void;
  addEvent?: (payload: {
    data:
      | RelayAuth
      | RelayCount
      | RelayEose
      | RelayEvent
      | RelayNotice
      | RelayOK;
    meta: WebSocketClientConfig;
  }) => void;

  sendEvent: (event: NEvent) => void;

  viewerSubscription?: {
    page: string;
    subscription?: ClientSubscription;
  };
  setViewSubscription: (
    view: string,
    filters: NFilters,
    overwrite?: boolean
  ) => Promise<void>;
  removeViewSubscription: (view: string) => void;
}

const worker = new Worker(new URL("../worker.ts", import.meta.url), {
  type: "module",
});

export const useNClient = create<NClientStore>((set, get) => ({
  store: wrap<NClientStoreBaseWorker>(worker),
  init: async (config?: { maxEvents?: number }) => {
    await get().store.init(config);

    worker.addEventListener("message", (event) => {
      const payload = event.data as {
        type: "new-event" | "update-event";
        data: NEventWithUserBase;
      };
      if (payload.type === "new-event") {
        set({
          events: [...get().events, payload.data],
        });
      } else if (payload.type === "update-event") {
        const eventIndex = get().events.findIndex(
          (event) => event.event.id === payload.data.event.id
        );

        if (eventIndex !== -1) {
          const updatedEvents = [...get().events];
          updatedEvents[eventIndex] = payload.data;
          set({ events: updatedEvents });
        }
      }
    });
  },
  connected: false,
  connect: (relays?: Relay[]) => {
    if (get().connected) {
      return;
    }
    get().store.connect(relays);
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
  subscriptions: async () => {
    return get().store.subscriptions();
  },
  subscribe: (payload: Subscribe) => {
    return get().store.subscribe(payload);
  },
  unsubscribe: (id: string) => {
    return get().store.unsubscribe(id);
  },
  unsubscribeAll: () => {
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
  setKeyStore: (config: NClientCKeystore) => {
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
  sendEvent: async (event: NEvent) => {
    return get().store.sendEvent(event);
  },
  signAndSendEvent: async (event: NEvent) => {
    const keypair = get().keypair;
    if (!keypair) {
      throw new Error("Keypair not initialized");
    }

    let signedEvent: NEvent;

    const keystore = get().keystore;
    if (keystore === "localstore") {
      event.signAndGenerateId({
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

    await get().store.sendEvent(signedEvent);
    return event.id;
  },
  clearEvents: async () => {
    await get().store.clearEvents();
    set({ events: [] });
    set({ skippedEvents: 0 });
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
  checkedUsers: [],
  checkedEvents: [],
  getUserInformation: (publicKeys: string[]) => {
    return get().store.getUserInformation(publicKeys);
  },
  hasSubscriptionForEventIds: (eventIds: string[], kinds: NEVENT_KIND[]) => {
    return get().store.hasSubscriptionForEventIds(eventIds, kinds);
  },
  getEventInformation: async (
    eventIds: string[],
    options: {
      skipFilter?: boolean;
      timeout?: number;
    }
  ) => {
    get().store.getEventInformation(eventIds, options);
  },

  setViewSubscription: async (view: string, filters: NFilters) => {
    const subs = await get().store.subscriptions();

    const sameView = subs.find((s) => s.options && s.options.view === view);
    if (sameView) {
      return;
    }

    for (const sub of subs) {
      if (sub.options && sub.options.view) {
        await get().store.unsubscribe(sub.subscriptionId);
      }
    }

    await get().store.subscribe({
      filters,
      options: {
        view,
        timeout: 0,
        timeoutAt: 0,
      },
    });

    setTimeout(async () => {
      const eventUserPubkeys = get()
        .events.filter((e) => !e.user?.pubkey)
        .map((e) => e.event.pubkey);
      if (eventUserPubkeys.length > 0) {
        await get().store.getUserInformation(eventUserPubkeys);
        const eventIds = get()
          .events.filter((e) => !e.reactions)
          .map((e) => e.event.id);
        await useNClient.getState().getEventInformation(eventIds);
      }
    }, 2000);
  },
  removeViewSubscription: async (view?: string) => {
    const subs = await get().store.subscriptions();

    if (!view) {
      const unsubPromises = subs.map((sub) =>
        get().store.unsubscribe(sub.subscriptionId)
      );
      await Promise.all(unsubPromises);
      return;
    }

    const subsToUnsubscribe = subs.filter(
      (sub) => sub.options && sub.options.view === view
    );

    const unsubPromises = subsToUnsubscribe.map((sub) =>
      get().store.unsubscribe(sub.subscriptionId)
    );

    await Promise.all(unsubPromises);
  },
}));
