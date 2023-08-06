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
  NUserStoreMemory,
  NEVENT_KIND,
  NUserBase,
} from "@nostr-ts/common";
import { NUser, RelayClient } from "@nostr-ts/web";
import { NEventWithUserBase } from "@nostr-ts/common";

export interface NClientStore {
  client: RelayClient | null;
  relayCount: number;
  subscriptions: ClientSubscription[];
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (filters: NFilters) => void;
  unsubscribe: (id: string) => void;
  keypair: { pub: string; priv: string };
  events: NEventWithUserBase[];
  userCount: number;
  users: NUserStoreMemory | null;
  followingUsers: NUserBase[];
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
  clearEvents: () => void;
  followUser(pubkey: string): void;
  unfollowUser(pubkey: string): void;
  loadFollowing(): void;
  following(pubkey: string): boolean;
  updateFollowing(user: NUserBase): void;
}

export const useNClient = create<NClientStore>((set, get) => ({
  client: null,
  relayCount: 0,
  subscriptions: [],
  connected: false,
  connect: () => {
    const client = new RelayClient(["wss://nos.lol"]);

    get().loadFollowing();

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
      relayCount: get().client?.relays.length || 0,
      subscriptions: get().client?.getSubscriptions(),
    });
  },
  disconnect: () => {
    get().client?.disconnect();
    set({
      relayCount: 0,
      subscriptions: [],
    });
    get().clearEvents();
    set({
      connected: false,
      relayCount: get().client?.relays.length || 0,
      subscriptions: [],
    });
  },
  subscribe: (filters: NFilters) => {
    get().client?.subscribe({ filters });
    set({
      subscriptions: get().client?.getSubscriptions(),
    });
  },
  unsubscribe: (id: string) => {
    get().client?.unsubscribe(id);
    set({
      subscriptions: get().client?.getSubscriptions(),
    });
  },
  keypair: { pub: "", priv: "" },
  events: [],
  userCount: 0,
  users: new NUserStoreMemory(),
  followingUsers: [],
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
      const kind = payload.data[2].kind;
      if (
        kind === NEVENT_KIND.SHORT_TEXT_NOTE ||
        kind === NEVENT_KIND.LONG_FORM_CONTENT
      ) {
        const event: EventBase = payload.data[2];
        const currentEvents = get().events;

        // if more than 50 elements, remove the last 20
        if (currentEvents.length >= 50) {
          currentEvents.splice(30, 20);
        }

        // Check if event already exists
        const eventExists = currentEvents.some(
          (ev) => ev.event.id === event.id
        );

        if (!eventExists) {
          if (event.pubkey) {
            const user = get().users?.byPubkey(event.pubkey);
            if (user) {
              console.log(`Adding user to event: ${user.pubkey}`);
            } else {
              console.log(`User not found: ${event.pubkey}`);
            }

            get().users?.trackKey(event.pubkey);

            currentEvents.push({
              event: new NEvent(event),
              user: user,
            });
          }

          set(() => ({ events: currentEvents }));
        }
      } else if (kind === NEVENT_KIND.METADATA) {
        if (get().users?.maxUsers) {
          const user = get().users?.addFromEvent(payload.data[2]);
          if (user) {
            get().updateFollowing(user);
            const userCount = get().users?.users
              ? get().users?.users.length
              : 0;
            console.log(`Users count: ${userCount}`);
            set(() => ({ userCount }));
          } else {
            console.log(`Users not initialized`);
            set({
              users: new NUserStoreMemory(),
            });
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
  clearEvents: () => {
    set(() => ({ events: [] }));
  },
  followUser: (pubkey: string) => {
    const user = get().users?.byPubkey(pubkey);
    if (user) {
      const userExists = get().followingUsers.some(
        (u) => u.pubkey === user.pubkey
      );
      if (!userExists) {
        const followingUsers = [...get().followingUsers, user];
        set(() => ({ followingUsers }));

        // Save to local storage
        const followingPubkeys = followingUsers.map((u) => u.pubkey);
        localStorage.setItem(
          "followingPubkeys",
          JSON.stringify(followingPubkeys)
        );
      }
    } else {
      const newFollowing = new NUserBase({
        pubkey,
      });
      const followingUsers = [...get().followingUsers, newFollowing];
      set(() => ({ followingUsers }));

      // Save to local storage
      const followingPubkeys = followingUsers.map((u) => u.pubkey);
      localStorage.setItem(
        "followingPubkeys",
        JSON.stringify(followingPubkeys)
      );
    }

    get().users?.pinKey(pubkey);
  },
  unfollowUser: (pubkey: string) => {
    const userExists = get().followingUsers.some((u) => u.pubkey === pubkey);
    if (userExists) {
      const followingUsers = get().followingUsers.filter(
        (u) => u.pubkey !== pubkey
      );
      set(() => ({ followingUsers }));

      // Update local storage
      const followingPubkeys = followingUsers.map((u) => u.pubkey);
      localStorage.setItem(
        "followingPubkeys",
        JSON.stringify(followingPubkeys)
      );

      get().users?.unpinKey(pubkey);
    }
  },
  loadFollowing: () => {
    const followingStore = localStorage.getItem("followingPubkeys");
    if (followingStore) {
      const savedFollowingPubkeys: string[] = JSON.parse(followingStore);
      if (followingStore) {
        const followingUsers = savedFollowingPubkeys.map((pubkey) => {
          const index = get().users?.users.findIndex(
            (u) => u.pubkey === pubkey
          );
          if (index !== undefined && index !== -1) {
            get().users?.pinKey(pubkey);
            const user = get().users?.users[index] as NUserBase;
            return user;
          }
          const user = new NUser({ pubkey });
          return user;
        });
        set({ followingUsers });
      }
    } else {
      set(() => ({ followingUsers: [] }));
    }
  },
  following: (pubkey: string) => {
    const followingUsers = get().followingUsers;
    const index = followingUsers.findIndex((u) => u.pubkey === pubkey);
    if (index !== undefined && index !== -1) {
      return true;
    }
    return false;
  },
  updateFollowing: (user: NUserBase) => {
    const index = get().followingUsers.findIndex(
      (u) => u.pubkey === user.pubkey
    );
    if (index !== undefined && index !== -1) {
      const followingUsers = get().followingUsers;
      followingUsers[index] = user;
      set({ followingUsers });
    }
  },
}));
