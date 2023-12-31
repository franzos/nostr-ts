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
  webSocketUrl: string
): Promise<RelayInformationDocument> {
  // Replace "wss://" with "https://"
  let httpsUrl = webSocketUrl.replace(/^wss:\/\//i, "https://");

  console.log("###############");
  console.log("Fetching relay information from", httpsUrl);
  console.log("###############");

  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, 5000);

  const headers = {
    Accept: "application/nostr+json",
  };

  return makeRequest(httpsUrl, {
    headers,
  });
}
