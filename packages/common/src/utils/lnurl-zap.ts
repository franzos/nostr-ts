/**
 * Make Lnurl Invoice URL
 * https://github.com/nostr-protocol/nips/blob/master/57.md#appendix-b-zap-request-http-request
 * @returns
 */

import { NEvent } from "../classes";
import {
  EventBase,
  LnurlEndpointResponse,
  LnurlInvoiceResponse,
  NEVENT_KIND,
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

export function makeZapReceiptDescription(event: EventBase) {
  const ev = new NEvent(event);
  const pubkeys = ev.hasPublicKeyTags();
  if (!pubkeys) {
    throw new Error("No pubkey tags found");
  }

  if (event.kind !== NEVENT_KIND.ZAP_REQUEST) {
    throw new Error("Event is not a zap request");
  }

  const pubkey = pubkeys[0];
  const relays = ev.hasRelaysTag();

  const description = {
    pubkey,
    content: "",
    id: ev.id,
    sig: ev.sig,
    kind: ev.kind,
    tags: ev.tags,
    relays,
  };

  return JSON.stringify(description);
}
