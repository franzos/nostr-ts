/**
 * Work with event content
 * - for ex. "Profile is impersonating nostr:<victim bech32 pubkey>"
 * https://github.com/nostr-protocol/nips/blob/master/56.md#example-events
 */
export interface NEventContent {
  message?: string;
  type?: "nostr" | "relayUrl";
  publicKeys?: string[];
  relayUrl?: string;
}
