import { NEventContent } from "../types";

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
  content: string
): NEventContent | undefined {
  if (!isValidEventContent(content)) {
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
export function isValidEventContent(content: string): boolean {
  // No content is valid content
  if (!content || content === "") {
    return true;
  }

  // Does not contain HTML
  const htmlRegex = /<[^>]*>/;
  if (htmlRegex.test(content)) {
    return false;
  }

  // Does not contain line breaks
  if (content.includes("\n")) {
    return false;
  }

  // Adheres to one of the accepted formats
  const validUrlRegex = /^(.*)(wss:\/\/[a-zA-Z0-9.-]+)/;
  const validNostrRegex = /^(.*)(nostr:[a-fA-F0-9]{64})/;
  const markdownLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/; // matches markdown links like [picture](https://picture.com/pic.jpg)

  if (
    validUrlRegex.test(content) ||
    validNostrRegex.test(content) ||
    markdownLinkRegex.test(content)
  ) {
    return true;
  }

  // If none of the conditions are met
  return false;
}
