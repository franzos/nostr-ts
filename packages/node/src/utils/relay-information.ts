import { RelayInformationDocument } from "@nostr-ts/common";
import type { Response } from "node-fetch";

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

  let response = (await Promise.race([
    fetch(httpsUrl, {
      headers: {
        Accept: "application/nostr+json",
      },
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 5000)
    ),
  ])) as Response;

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}
