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
} from "@nostr-ts/common";
import { NUser } from "@nostr-ts/web";

export interface NClientStore {
  keypair: { pub: string; priv: string };
  events: NEvent[];
  users: NUser[];
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
  getEvents: (limit?: number, offset?: number) => void;
  getEventByPubkey: (pubkey: string) => void;
  clearEvents: () => void;
}

export const useNClient = create<NClientStore>((set, get) => ({
  keypair: { pub: "", priv: "" },
  events: [],
  users: [],
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
      const event: EventBase = payload.data[2];
      const currentEvents = get().events;

      // Check if event already exists
      const eventExists = currentEvents.some(
        (ev) => ev.pubkey === event.pubkey
      );
      if (!eventExists) {
        // Add the event and make sure the events array does not exceed 30 elements
        if (currentEvents.length >= 30) {
          currentEvents.shift();
        }
        currentEvents.push(new NEvent(event));

        set(() => ({ events: currentEvents }));
      }
    }
  },
  getEvents: (limit: number = 10, offset: number = 0) => {
    const allEvents = get().events;
    const events = allEvents.slice(offset, offset + limit);

    set(() => ({ events: events.map((ev) => new NEvent(ev)) }));
  },
  getEventByPubkey: (pubkey: string) => {
    const allEvents = get().events;
    const event = allEvents.find((ev) => ev.pubkey === pubkey);
    return event;
  },
  clearEvents: () => {
    set(() => ({ events: [] }));
  },
}));
