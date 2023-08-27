/**
 * Work with event content
 * - for ex. "Profile is impersonating nostr:<victim bech32 pubkey>"
 * - supports npub and nprofile right now
 * https://github.com/nostr-protocol/nips/blob/master/56.md#example-events
 */
export interface NEventContent {
  message?: string;
  relayUrl?: string;
  nurls?: {
    type?: "npub" | "nsec" | "note" | "lnurl" | "nprofile" | "nevent";
    // TODO: Not really accurate
    publicKeys?: string[];
    relayUrls?: string[];
  }[];
}
