import { Relay } from "@nostr-ts/common";

export type RelayProps = {
  read: boolean;
  write: boolean;
};

export type Relays = {
  [key: string]: RelayProps;
};

export function objectOfRelaysToArray(relays: Relays): Relay[] {
  return Object.entries(relays).map(([url, { read, write }]) => ({
    url,
    read,
    write,
  }));
}
