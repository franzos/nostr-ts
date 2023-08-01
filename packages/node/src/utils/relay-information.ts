import { RelayInformationDocument } from "@nostr-ts/common";

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

  // Use inline import for 'node-fetch'
  const fetch = (await import("node-fetch")).default;

  let response = await fetch(httpsUrl, {
    headers: {
      Accept: "application/nostr+json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
