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

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 5000);

  let response;
  try {
    response = await fetch(httpsUrl, {
      headers: {
        Accept: "application/nostr+json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
