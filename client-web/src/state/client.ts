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
} from "@nostr-ts/common";
import { RelayClient } from "@nostr-ts/web";
import { NEventWithUserBase } from "@nostr-ts/common";

export interface NClientStore {
  client: RelayClient | null;
  relayCount: number;
  subscriptions: ClientSubscription[];
  connected: boolean;
  connect: () => void;
  initUsers: () => void;
  disconnect: () => void;
  subscribe: (filters: NFilters) => void;
  unsubscribe: (id: string) => void;
  keypair: { pub: string; priv: string };
  events: NEventWithUserBase[];
  userCount: number;
  users: NUserStoreMemory | null;
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
}

export const useNClient = create<NClientStore>((set, get) => ({
  client: null,
  relayCount: 0,
  subscriptions: [],
  connected: false,
  connect: () => {
    const client = new RelayClient(["wss://nos.lol"]);
    client.listen(async (payload) => {
      console.log(`Event ${payload.meta.id} on ${payload.meta.url}.`);
      get().addEvent(payload);
    });

    get().initUsers();

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
  initUsers: () => {
    set({ users: new NUserStoreMemory() });
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
  users: null,
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

        // Add the event and make sure the events array does not exceed 30 elements
        if (currentEvents.length >= 31) {
          currentEvents.shift();
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

            currentEvents.push({
              event: new NEvent(event),
              user: user,
            });
          }

          set(() => ({ events: currentEvents }));
        }
      } else if (kind === NEVENT_KIND.METADATA) {
        get().users?.addFromEvent(payload.data[2]);
        const userCount = get().users?.users.length || 0;
        set(() => ({ userCount }));
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
}));
