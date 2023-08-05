import { NEvent } from "../classes";

/**
 * Lnurl response
 *
 * This is the first hit on Lud16 / Lud06 URL
 * https://github.com/lnurl/luds/blob/luds/06.md#pay-to-static-qrnfclink
 */
export interface LnurlEndpointResponse {
  /**
   * The URL from LN SERVICE which will accept the pay request parameters
   */
  callback: string;

  /**
   * Max millisatoshi amount LN SERVICE is willing to receive
   */
  maxSendable: number;

  /**
   * Min millisatoshi amount LN SERVICE is willing to receive, can not be less than 1 or more than `maxSendable`
   */
  minSendable: number;

  /**
   * Metadata json which must be presented as raw string here, this is required to pass signature verification at a later step
   */
  metadata: string;

  /**
   * Type of LNURL
   */
  tag: "payRequest";

  /**
   * Whether the service accepts Nostr payments
   */
  allowsNostr: boolean;

  /**
   * BIP 340 public key in hex
   */
  nostrPubkey: string;

  // ??
  disposable?: boolean | undefined;

  payerData?: {
    name: {
      mandatory: boolean;
    };
    identifier: {
      mandatory: boolean;
    };
  };
}

/**
 * Lnurl invoice response
 *
 * This is the 2nd hit on new callback URL with invoice params
 */
export interface LnurlInvoiceResponse {
  /**
   * bech32-serialized lightning invoice
   */
  pr: string;

  /**
   * an empty array
   */
  relays?: string[];

  // TODO: Check if this is correct (from actual response)
  routes?: string[];

  // ?
  disposable?: boolean | undefined;

  status?: string;
  error?: string;
  successAction?: {
    tag: string;
    message: string;
  };
}

/**
 * Function result when calling makeZapRequest on user
 */
export interface UserZapRequestResponse extends LnurlInvoiceResponse {
  event: NEvent;
}
