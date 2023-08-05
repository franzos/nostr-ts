/**
 * Make Lnurl Invoice URL
 * https://github.com/nostr-protocol/nips/blob/master/57.md#appendix-b-zap-request-http-request
 * @returns
 */

import {
  LnurlEndpointResponse,
  LnurlInvoiceResponse,
  iNewZAPRequest,
} from "../types";
import { decodeLightnightPayRequest } from "./bolt11";

export function makeLnurlZapRequestUrl({
  callback,
  amount,
  event,
  lnurl,
}: {
  callback: string;
  amount: number;
  event: string;
  lnurl: string;
}) {
  return `${callback}?amount=${amount}&nostr=${event}&lnurl=${lnurl}`;
}

export function isValidLnurlEndpointResponse(info: LnurlEndpointResponse) {
  if (info.allowsNostr && info.nostrPubkey) {
    // TODO: Check if key is valid (valid BIP 340 public key in hex)
    return true;
  }
}

export function isValidLnurlInvoiceResponse(
  request: iNewZAPRequest,
  response: LnurlInvoiceResponse
) {
  const reqAmount = request.amount ? request.amount : undefined;
  const reqLnurl = request.lnurl ? request.lnurl : undefined;

  // If the user didn't specify an amount or lnurl, we can't validate
  if (!reqAmount || !reqLnurl) {
    return true;
  }

  const invoice = decodeLightnightPayRequest(response.pr);

  if (reqAmount && reqAmount.toString() !== invoice.millisatoshis) {
    return false;
  }

  // TODO: Check if lnurl is valid (invoice.tags)

  return true;
}
