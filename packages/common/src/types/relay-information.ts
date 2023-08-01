/**
 * Relay information document
 * https://github.com/nostr-protocol/nips/blob/master/11.md
 */
export interface RelayInformationDocument {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
}

// TODO: Implement extra fields
