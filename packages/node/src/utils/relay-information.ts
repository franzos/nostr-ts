import { RelayInformationDocument } from "@nostr-ts/common";
import { makeRequest } from "./make-request";

/**
 * Get relay information document
 * https://github.com/nostr-protocol/nips/blob/master/11.md
 *
 * Note: Some relays may not support this
 * @param webSocketUrl
 * @returns
 */
export async function getRelayInformationDocument(
  webSocketUrl: string,
  options?: {
    rejectUnauthorized?: boolean;
  }
): Promise<RelayInformationDocument> {
  // Replace "wss://" with "https://"
  let httpsUrl = webSocketUrl.replace(/^wss:\/\//i, "https://");

  console.log("###############");
  console.log("Fetching relay information from", httpsUrl);
  console.log("###############");

  const headers = {
    Accept: "application/nostr+json",
  };

  // Use inline import for 'node-fetch'
  return makeRequest(httpsUrl, headers, options);
}
