import { ExternalIdentityClaim, NFilters } from "../classes";
import { EventBase, iNewZAPRequest } from "./event";
import { IdentifierWellKnownResponse } from "./identifier-well-known";
import { LnurlEndpointResponse, UserZapRequestResponse } from "./lnurl-invoice";
import { UserMetadata } from "./user-metadata";

export interface UserBase {
  pubkey: string;
  claims?: ExternalIdentityClaim[];
  data?: UserMetadata;

  /**
   * Set from successfull makeZapRequest
   */
  lightningZapInfo?: LnurlEndpointResponse;
  lastUpdated?: number;

  /**
   * Set after checking https://<domain>/.well-known/nostr.json?name=<local-part>
   * https://github.com/nostr-protocol/nips/blob/master/05.md
   */
  nip05isValid?: boolean;

  loaded?(): boolean;
  hasZapInfo?(): boolean;

  fromPublicKey?: (pubkey: string) => UserBase;

  /**
   *
   * @param event
   * @returns undefined if invalid
   */
  fromEvent?: (event: EventBase) => UserBase;

  /**
   * Url to check user identifier
   * https://<domain>/.well-known/nostr.json?name=<local-part>
   * @returns
   */
  getNip05Url?: () => string;

  /**
   * Pass response from https://<domain>/.well-known/nostr.json?name=<local-part>
   * to validate nip05
   * @param payload
   * @returns
   */
  validateWellKnown?: (payload: IdentifierWellKnownResponse) => boolean;

  /**
   * Url to send payment request
   * http://<domain>/.well-known/lnurlp/<username>
   * @returns
   */
  getLud16Url?: () => string;

  /**
   * Url to send payment request
   * http://<domain>/.well-known/lnurlp/<username>
   * @returns
   */
  getLud06Url?: () => string;

  /**
   * Shortcut; returns lud16 first if found
   * @returns
   */
  getLud16Or06Url?: () => {
    type: "lud16" | "lud06";
    url: string;
  } | null;

  /**
   * A signed zap request event is not published,
   * but is instead sent using a HTTP GET request to the recipient's callback url, which was provided by the recipient's lnurl pay endpoint.
   *
   * https://github.com/nostr-protocol/nips/blob/master/57.md#appendix-b-zap-request-http-request
   * @param opts
   * @returns
   */
  makeZapRequest?: (
    opts: iNewZAPRequest,
    keypair
  ) => Promise<UserZapRequestResponse>;

  makeNIP05Request?: () => Promise<IdentifierWellKnownResponse>;

  /**
   * - Author: user publiv key
   * - Kind: 0
   * @returns
   */
  getMetadataFilter?: () => NFilters;
}
