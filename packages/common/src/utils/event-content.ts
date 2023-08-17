import { NEVENT_KIND, NEventContent } from "../types";
import { isValidWebSocketUrl } from "./websocket-url";

/**
 * Extract information from content
 * - for ex "wss://relay.example.com"
 * - for ex "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - for ex "Checkout nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - for ex "Checkout nostr:2234567890123456789012345678901234567890123456789012345678901234 nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - for ex. "Checkout this pic" // no match
 * @param content
 */
export function extractEventContent(
  content: string,
  kind?: NEVENT_KIND
): NEventContent | undefined {
  if (!isValidEventContent(content, kind)) {
    return;
  }

  const urlRegex = /(.*)?(wss:\/\/[a-zA-Z0-9.-]+)/;
  const nostrRegex = /(nostr:[a-fA-F0-9]{64})/g;

  let match;

  match = urlRegex.exec(content);
  if (match) {
    const message = match[1] ? match[1].trim() : undefined;
    return { type: "relayUrl", relayUrl: match[2], message };
  }

  let result;
  let publicKeys = [];
  while ((result = nostrRegex.exec(content)) !== null) {
    publicKeys.push(result[1].split(":")[1]);
  }

  if (publicKeys.length > 0) {
    const message = content.replace(nostrRegex, "").trim();
    return { type: "nostr", publicKeys, message };
  }

  // If there was no match, return undefined
  return;
}

export function createEventContent(content: NEventContent) {
  if (!content.type) {
    return content.message;
  } else if (content.type === "relayUrl") {
    return content.relayUrl;
  } else if (content.type === "nostr") {
    if (!content.publicKeys) return content.message;

    for (const key of content.publicKeys) {
      // check length
      if (key.length !== 64) {
        throw new Error(`Invalid key length: ${key}`);
      }
    }

    const publicKeysStr = content.publicKeys
      .map((key) => `nostr:${key}`)
      .join(" ");
    return content.message
      ? `${content.message} ${publicKeysStr}`
      : publicKeysStr;
  }
}

/**
 * Validate event content
 *
 * Accepts:
 * - "wss://relay.example.com"
 * - "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - "Checkout nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - "Checkout nostr:2234567890123456789012345678901234567890123456789012345678901234 nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - "Checkout [picture](https://picture.com/pic.jpg)"
 *
 * Specifically does not accept
 * - HTML
 * - Line breaks
 *
 * @param content
 */
export function isValidEventContent(
  content: string,
  kind?: NEVENT_KIND
): { isValid: boolean; error?: string } {
  // No content is valid content
  if (!content || content === "") return { isValid: true };

  if (kind === NEVENT_KIND.REPOST) {
    // Expect empty or json
    try {
      JSON.parse(content);
      return { isValid: true };
    } catch (e) {
      console.error(e);
      return { isValid: false, error: "Invalid JSON format" };
    }
  } else if (kind === NEVENT_KIND.RECOMMEND_RELAY) {
    if (!isValidWebSocketUrl(content)) {
      return {
        isValid: false,
        error: `Expected a valid websocket URL, got ${content}.`,
      };
    }
  }

  if (containsHTML(content)) {
    return { isValid: false, error: "HTML tags are not allowed" };
  }

  if (containsLineBreaks(content)) {
    return { isValid: false, error: "Line breaks are not allowed" };
  }

  // If none of the negative conditions are met
  return { isValid: true };
}

function containsHTML(content: string): boolean {
  const htmlRegex = /<[^>]*>/;
  return htmlRegex.test(content);
}

function containsLineBreaks(content: string): boolean {
  return content.includes("\n");
}
