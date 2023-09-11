export const MAX_EVENTS = 100;
export const EVENTS_PER_PAGE = 25;
export const DEFAULT_RELAYS = {
  "wss://relay.shitforce.one": {
    read: true,
    write: true,
  },
  "wss://relay.nostr.band": {
    read: true,
    write: true,
  },
  "wss://offchain.pub": {
    read: true,
    write: false,
  },
  "wss://nos.lol": {
    read: true,
    write: false,
  },
  "wss://relay.snort.social": {
    read: true,
    write: false,
  },
  "wss://relay.damus.io": {
    read: true,
    write: false,
  },
  "wss://soloco.nl": {
    read: true,
    write: false,
  },
  "wss://eden.nostr.land": {
    read: true,
    write: false,
  },
};
