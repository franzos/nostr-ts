import { EventBase, NEVENT_KIND, NEvent } from "@nostr-ts/common";
import { makeRequest } from "../utils/make-request";

export interface SCDNTerms {
  // Not clear; in docs: const payment = await window.nostr.signEvent(service.payment);
  // but in types missing
  payment: EventBase;
  callback: string;
  // In millisatoshi
  amount: number;
  rateFiat: {
    usd: number;
  };
  offer: any;
}

export interface SCDNAccountInfo {
  storageTotal: number;
  creditTotal: number;
  usageTotal: number;
  paidThrough: number;
  timeRemaining: number;
  rateFiat: {
    usd: number;
  };
  exchangeFiat: {
    usd: number;
  };
  files: any[];
  transactions: any[];
  order: any;
  payment: any;
  receipt: any;
}

export interface SCDNUploadResult {
  created: number;
  sha256: string;
  name: string;
  url: string;
  infohash: string;
  magnet: string;
  size: number;
  type: string;
  nip94: string[][];
}

export interface SCDNInvoice {
  status: string;
  successAction: { tag: "message"; message: "Thanks, sats received!" };
  verify: string;
  routes: any[];
  /**
   * Lightning invoice
   */
  pr: string;
}

/**
 * Credit request
 * https://github.com/lovvtide/satellite-web/blob/master/docs/cdn.md?ref=nobsbitcoin.com#step-1-obtain-a-lightning-invoice-to-buy-storage
 *
 * amount: GB months credit
 */
export const sCDNCreditRequest = (amount: number): NEvent => {
  return new NEvent({
    created_at: Math.ceil(Date.now() / 1000),
    content: "Request Storage",
    kind: 22242,
    tags: [["gb_months", amount.toString()]],
  });
};

/**
 * Get terms
 *
 * returns:
 * - 200: success
 * - 403: unauthorized
 */
export const sCDNGetTerms = async (
  signedCreditRequest: NEvent
): Promise<SCDNTerms> => {
  return makeRequest(
    `https://api.satellite.earth/v1/media/account/credit?auth=${encodeURIComponent(
      JSON.stringify(signedCreditRequest)
    )}`
  );
};

/**
 * Get invoice
 * - signedTermsPayment is the response from sCDNGetTerms (terms.payment), signed by the user
 *
 * return: LN invoice
 */
export const sCDNGetInvoice = async (
  terms: SCDNTerms,
  signedTermsPayment: any
): Promise<SCDNInvoice> => {
  return makeRequest(
    terms.callback +
      `?amount=${terms.amount}&nostr=${encodeURIComponent(
        JSON.stringify(signedTermsPayment)
      )}`
  );
};

export const sCDNAccountInfoRequest = (): NEvent => {
  return new NEvent({
    created_at: Math.ceil(Date.now() / 1000),
    content: "Authenticate User",
    kind: NEVENT_KIND.CLIENT_AUTHENTICATION,
    tags: [],
  });
};

/**
 * Get account info
 *
 * returns:
 * - 200: success
 * - 403: unauthorized
 */
export const sCDNGetAccountInfo = async (
  signedAccountInfoRequest: NEvent
): Promise<SCDNAccountInfo> => {
  return makeRequest(
    `https://api.satellite.earth/v1/media/account?auth=${encodeURIComponent(
      JSON.stringify(signedAccountInfoRequest)
    )}`
  );
};

/**
 * Upload request to be signed by the user
 */
export const sCDNAccountUploadRequest = (filename: string): NEvent => {
  return new NEvent({
    created_at: Math.ceil(Date.now() / 1000),
    content: "Authorize Upload",
    kind: NEVENT_KIND.CLIENT_AUTHENTICATION,
    tags: [["name", filename]],
  });
};

/**
 * Upload file
 *
 * returns:
 * - 200: success
 * - 400: bad request
 * - 402: payment required
 * - 403: unauthorized
 */
export const sCDNUploadFile = async (
  signedAccountUploadRequest: NEvent,
  file: any
): Promise<SCDNUploadResult> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("auth", JSON.stringify(signedAccountUploadRequest));
  return makeRequest(
    `https://api.satellite.earth/v1/media/item?auth=${encodeURIComponent(
      JSON.stringify(signedAccountUploadRequest)
    )}`,
    {
      method: "PUT",
      body: formData,
    }
  );
};

/**
 * File deletion request to be signed by the user
 */
export const sCDNDeletionRequest = (sha256: string): NEvent => {
  return new NEvent({
    kind: NEVENT_KIND.CLIENT_AUTHENTICATION,
    created_at: Math.ceil(Date.now() / 1000),
    content: "Delete Item",
    tags: [["sha256", sha256]],
  });
};

/**
 * Delete file
 *
 * returns:
 * - 200: success
 * - 400: bad request
 * - 403: unauthorized
 */
export const sCDNDeleteFile = async (
  signedDeletionRequest: NEvent
): Promise<number> => {
  return makeRequest(
    `https://api.satellite.earth/v1/media/item?auth=${encodeURIComponent(
      JSON.stringify(signedDeletionRequest)
    )}`,
    {
      method: "DELETE",
    }
  );
};
