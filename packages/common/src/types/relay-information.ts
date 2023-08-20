/**
 * Server limitations
 * https://github.com/nostr-protocol/nips/blob/master/11.md#extra-fields
 */
export interface ServerLimitations {
  /**
   * this is the maximum number of bytes for incoming JSON that the relay will attempt to decode and act upon
   */
  max_message_length: number;
  /**
   * total number of subscriptions that may be active on a single websocket connection to this relay
   */
  max_subscriptions: number;
  /**
   * maximum number of filter values in each subscription. Must be one or higher.
   */
  max_filters: number;
  /**
   * max_limit: the relay server will clamp each filter's limit value to this number.
   */
  max_limit: number;
  /**
   * maximum length of subscription id as a string.
   */
  max_subid_length: number;
  /**
   * for authors and ids filters which are to match against a hex prefix, you must provide at least this many hex digits in the prefix.
   */
  min_prefix: number;
  /**
   * in any event, this is the maximum number of elements in the tags list.
   */
  max_event_tags: number;
  /**
   * maximum number of characters in the content field of any event.
   */
  max_content_length: number;
  /**
   * new events will require at least this difficulty of PoW, based on NIP-13, or they will be rejected by this server.
   */
  min_pow_difficulty: number;
  /**
   * this relay requires NIP-42 authentication to happen before a new connection may perform any other action
   */
  auth_required: boolean;
  /**
   * this relay requires payment before a new connection may perform any action.
   */
  payment_required: boolean;
}

export interface Fee {
  amount: number;
  unit: string;
}

export interface Fees {
  admission: Fee[];
}

/**
 * Relay information document
 * https://github.com/nostr-protocol/nips/blob/master/11.md
 */
export interface RelayInformationDocument {
  name?: string;
  description?: string;
  fees?: Fees;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitations?: ServerLimitations;
  payments_url?: string;
}

// TODO: Implement extra fields
