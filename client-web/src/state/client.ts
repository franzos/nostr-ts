import { create } from "zustand";
import {
  NEvent,
  RELAY_MESSAGE_TYPE,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  WebSocketClientConfig,
  EventBase,
  NFilters,
  ClientSubscription,
  NEVENT_KIND,
  NUserBase,
  UserBase,
} from "@nostr-ts/common";
import { RelayClient } from "@nostr-ts/web";
import { NEventWithUserBase } from "@nostr-ts/common";
import { IDBPDatabase, openDB } from "idb";
import { Pagination } from "../lib/pagination";

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

function shuffle(array: string[]) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

interface NClientDB {
  users: {
    key: string;
    value: UserBase;
    indexes: { pubkey: string };
  };
  following: {
    key: string;
    value: UserBase;
    indexes: { pubkey: string };
  };
}

export interface NClientStore {
  db: IDBPDatabase<NClientDB> | null;
  init(config?: { maxEvents?: number }): Promise<void>;
  client: RelayClient | null;
  connected: boolean;
  connect: (relayUrls?: string[]) => void;
  disconnect: () => void;
  subscribe: (filters: NFilters) => ClientSubscription[] | undefined;
  unsubscribe: (id: string) => void;
  keystore: "none" | "localstore" | "nos2x" | "download";
  loadKeyStore: () => void;
  saveKeyStore: () => void;
  setKeyStore: (config: NClientCKeystore) => void;
  keypair?: { publicKey: string; privateKey: string };
  keypairIsLoaded: boolean;
  eventsPagination: Pagination;
  newEvent: NEvent | null;
  setNewEvent: (event: NEvent | null) => void;
  newEventName: string;
  setNewEventName: (name: string) => void;
  events: NEventWithUserBase[];
  maxEvents: number;
  setMaxEvents: (max: number) => void;
  skippedEvents: number;
  countUsers: () => Promise<number>;
  addEvent: (payload: {
    data:
      | RelayAuth
      | RelayCount
      | RelayEose
      | RelayEvent
      | RelayNotice
      | RelayOK;
    meta: WebSocketClientConfig;
  }) => void;
  getEventById: (id: string) => void;
  sendEvent: (event: NEvent) => void;
  signAndSendEvent: (event: NEvent) => void;
  clearEvents: () => void;
  followUser(pubkey: string): void;
  unfollowUser(pubkey: string): void;
  followingUser(pubkey: string): Promise<boolean>;
  getAllUsersFollowing(): Promise<NUserBase[] | undefined>;
  updateUserFollowing(user: NUserBase): Promise<void>;
  checkedUsers: string[];
  getUserInformation(publicKeys: string[]): void;
}

export const useNClient = create<NClientStore>((set, get) => ({
  db: null,
  init: async (config?: { maxEvents?: number }) => {
    set({
      db: await openDB("nostr-client", 1, {
        upgrade(db) {
          db.createObjectStore("users", { keyPath: "pubkey" });
          // db.createObjectStore("subscriptions", { keyPath: "subscriptionId" });
          db.createObjectStore("following", { keyPath: "pubkey" });
        },
      }),
    });
    get().loadKeyStore();
    if (config?.maxEvents) {
      get().setMaxEvents(config.maxEvents);
    }
  },
  client: null,
  connected: false,
  connect: (relayUrls?: string[]) => {
    if (get().connected) {
      return;
    }
    const client = new RelayClient(relayUrls);

    client.listen(async (payload) => {
      console.log(`Event ${payload.meta.id} on ${payload.meta.url}.`);
      get().addEvent(payload);
    });

    client.subscribe({
      filters: new NFilters({
        limit: 10,
        kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
      }),
    });
    client?.subscribe({
      filters: new NFilters({
        kinds: [NEVENT_KIND.METADATA],
      }),
    });
    set({ client });
    set({
      connected: true,
    });
  },
  disconnect: () => {
    get().client?.disconnect();
    get().clearEvents();
    set({
      connected: false,
    });
  },
  subscribe: (filters: NFilters) => {
    return get().client?.subscribe({ filters });
  },
  unsubscribe: (id: string) => {
    console.log(`Unsubscribing ${id}`);
    get().client?.unsubscribe(id);
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
    }
  },
  keypair: { publicKey: "", privateKey: "" },
  keypairIsLoaded: false,
  eventsPagination: { limit: 10, offset: 0 },
  newEvent: new NEvent({
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
  }),
  setNewEvent: (event: NEvent | null) => {
    set({ newEvent: event });
  },
  newEventName: "NewShortTextNote",
  setNewEventName: (name: string) => {
    set({ newEventName: name });
  },
  events: [],
  maxEvents: 100,
  setMaxEvents: (max: number) => {
    console.log(`Setting max events to ${max}`);
    set({ maxEvents: max });
  },
  skippedEvents: 0,
  countUsers: async () => {
    const db = await get().db;
    if (!db) {
      throw new Error("DB not initialized");
    }
    return db.count("users");
  },
  userCount: 0,
  addEvent: async (payload: {
    data:
      | RelayAuth
      | RelayCount
      | RelayEose
      | RelayEvent
      | RelayNotice
      | RelayOK;
    meta: WebSocketClientConfig;
  }) => {
    if (payload.data[0] === RELAY_MESSAGE_TYPE.EVENT) {
      const db = await get().db;
      if (!db) {
        throw new Error("DB not initialized");
      }

      const kind = payload.data[2].kind;
      if (
        kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
        kind === NEVENT_KIND.LONG_FORM_CONTENT
      ) {
        const event: EventBase = payload.data[2];
        const currentEvents = get().events;

        if (currentEvents.length >= get().maxEvents) {
          console.log(`Exceeded limit; ignoring new events`);
          set({
            skippedEvents: get().skippedEvents + 1,
          });
          // TODO: Cancel subscription
          return;
        }

        // Check if event already exists
        const eventExists = currentEvents.some(
          (ev) => ev.event.id === event.id
        );

        if (!eventExists) {
          if (event.pubkey) {
            const user = await db.get("users", event.pubkey);
            if (user) {
              console.log(`Adding user to event: ${user.pubkey}`);
              currentEvents.push({
                event: new NEvent(event),
                user: user,
              });
            } else {
              console.log(`User not found: ${event.pubkey}`);
              currentEvents.push({
                event: new NEvent(event),
              });
            }
          }

          set(() => ({ events: currentEvents }));
        }
      } else if (kind === NEVENT_KIND.METADATA) {
        const newUser = new NUserBase();
        newUser.fromEvent(payload.data[2]);

        const user = await db.get("users", newUser.pubkey);
        if (user) {
          await db.put("users", newUser);
          await get().updateUserFollowing(user);
        } else {
          await db.add("users", newUser);
          await get().updateUserFollowing(newUser);
        }

        for (const event of get().events) {
          if (event.event.pubkey === newUser.pubkey) {
            event.user = newUser;
          }
        }
      }
    }
  },
  getEventById: (id: string) => {
    const allEvents = get().events;
    const event = allEvents.find((ev) => ev.event.id === id);
    return event;
  },
  sendEvent: async (event: NEvent) => {
    const client = get().client;
    if (!client) {
      throw new Error("Client not initialized");
    }
    const result = client.sendEvent(event);
    if (
      event.kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
      event.kind === NEVENT_KIND.LONG_FORM_CONTENT ||
      event.kind === NEVENT_KIND.RECOMMEND_RELAY
    ) {
      set({
        events: [
          {
            event: event.toJson(),
          },
          ...get().events,
        ],
      });
    }
    return result;
  },
  signAndSendEvent: async (event: NEvent) => {
    const client = get().client;
    if (!client) {
      throw new Error("Client not initialized");
    }
    const keypair = get().keypair;
    if (!keypair) {
      throw new Error("Keypair not initialized");
    }
    event.signAndGenerateId(keypair);
    get().sendEvent(event);
  },
  clearEvents: () => {
    set(() => ({ events: [] }));
    set(() => ({ skippedEvents: 0 }));
  },
  /**
   * Follow a user
   */
  followUser: async (pubkey: string) => {
    const db = get().db;
    if (!db) {
      throw new Error("DB not initialized");
    }
    const user = await db.get("users", pubkey);
    const following = await db.get("following", pubkey);
    if (user && !following) {
      await db.add("following", user);
    } else if (!user && !following) {
      const newFollowing = new NUserBase({
        pubkey,
      });
      db.put("following", newFollowing);
      get().getUserInformation([pubkey]);
    }
  },
  /**
   * Unfollow a user
   */
  unfollowUser: async (pubkey: string) => {
    const db = get().db;
    if (!db) {
      throw new Error("DB not initialized");
    }
    await db.delete("following", pubkey);
  },
  /**
   * Check if following user
   */
  followingUser: async (pubkey: string) => {
    const db = get().db;
    if (!db) {
      throw new Error("DB not initialized");
    }
    const following = await db.get("following", pubkey);
    if (following) {
      return true;
    }
    return false;
  },
  getAllUsersFollowing: async () => {
    const db = get().db;
    if (!db) {
      throw new Error("DB not initialized");
    }
    const users = await db.getAll("following");
    if (users) {
      return users.map((user) => new NUserBase(user));
    }
  },
  /**
   * Update information of user we are following
   * @param user
   */
  updateUserFollowing: async (user: NUserBase) => {
    const db = get().db;
    if (!db) {
      throw new Error("DB not initialized");
    }
    const following = await db.get("following", user.pubkey);
    if (following) {
      await db.put("following", user);
    }
  },
  checkedUsers: [],
  getUserInformation: (publicKeys: string[]) => {
    if (publicKeys.length === 0) {
      return;
    }

    const filteredPublicKeys = publicKeys.filter(
      (pubkey) => !get().checkedUsers.includes(pubkey)
    );

    if (filteredPublicKeys.length === 0) {
      return;
    }

    // if more than 20 publicKeys, randomize and select 20; otherwise use all
    const keys =
      filteredPublicKeys.length > 20
        ? shuffle(filteredPublicKeys).slice(0, 20)
        : filteredPublicKeys;

    if (keys.length === 0) {
      return;
    }

    console.log(`=> Getting information for ${keys.length} users`);
    const filters = new NFilters({
      kinds: [NEVENT_KIND.METADATA],
      authors: keys,
    });
    set({
      checkedUsers: [...get().checkedUsers, ...keys],
    });
    const subscriptions = get().subscribe(filters);
    if (subscriptions) {
      setTimeout(() => {
        for (const subscription of subscriptions) {
          get().unsubscribe(subscription.subscriptionId);
        }
      }, 10000);
    }
  },
}));
