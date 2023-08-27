import { NEVENT_KIND, NEventContent } from "../types";
import {
  NOSTR_URL_REGEX_GLOBAL,
  decodeNostrUrl,
  encodePublicKeyToNostrUrl,
  isNostrUrl,
} from "./nostr-url";
import { isValidWebSocketUrl } from "./websocket-url";

/**
 * Extract information from content
 * - for ex "wss://relay.example.com"
 * - for ex "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - for ex "Checkout nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - for ex "Gracias nostr:npub1kade5vf37snr4hv5hgstav6j5ygry6z09kkq0flp47p8cmeuz5zs7zz2an ! ⚡️⚡️⚡️";
 * - for ex "Checkout nostr:2234567890123456789012345678901234567890123456789012345678901234 nostr:2234567890123456789012345678901234567890123456789012345678901234"
 * - for ex. "Checkout this pic" // no match
 * @param content
 */
export function extractEventContent(
  content: string,
  kind?: NEVENT_KIND
): NEventContent | undefined {
  const validationResult = isValidEventContent(content, kind);

  if (!validationResult.isValid) {
    return undefined;
  }

  const urlRegex = /(.*)?(wss:\/\/[a-zA-Z0-9.-]+)/;
  const evc: NEventContent = {
    message: undefined,
    relayUrl: undefined,
    nurls: [],
  };

  const urlMatch = urlRegex.exec(content);
  if (urlMatch) {
    evc.message = urlMatch[1] ? urlMatch[1].trim() : undefined;
    evc.relayUrl = urlMatch[2];
    return evc;
  }

  const publicKeys: string[] = [];
  const relayUrls: string[] = [];
  let prefix;
  let nostrMatch;
  const replaceIndexes = [];

  while ((nostrMatch = NOSTR_URL_REGEX_GLOBAL.exec(content)) !== null) {
    const item = nostrMatch[0];
    if (isNostrUrl(item)) {
      const decoded = decodeNostrUrl(item);
      prefix = decoded.prefix;
      if (prefix === "npub" && decoded.tlvItems.length > 0) {
        const match = decoded.tlvItems.filter((i) => i.type === 0);
        if (match.length === 0) continue;
        const publicKey = match[0].value as string;
        publicKeys.push(publicKey);
        replaceIndexes.push({
          index: nostrMatch.index,
          length: item.length,
          replaceWith: publicKey,
        });
      } else if (prefix === "nprofile") {
        const match = decoded.tlvItems.filter((i) => i.type === 0);
        if (match.length === 0) continue;
        const publicKey = match[0].value as string;
        publicKeys.push(publicKey);
        replaceIndexes.push({
          index: nostrMatch.index,
          length: item.length,
          replaceWith: publicKey,
        });
        const relayMatches = decoded.tlvItems.filter((i) => i.type === 1);
        if (relayMatches.length === 0) continue;
        for (const relayUrl of relayMatches) {
          if (isValidWebSocketUrl(relayUrl.value as string)) {
            relayUrls.push(relayUrl.value as string);
          } else {
            console.error(`Invalid relay url ${relayUrl.value}`);
          }
        }
      }
    }
  }

  let offset = 0;
  for (const { index, length, replaceWith } of replaceIndexes) {
    const realIndex = index + offset;
    content =
      content.slice(0, realIndex) +
      replaceWith +
      content.slice(realIndex + length);
    offset += replaceWith.length - length;
  }

  if (publicKeys.length > 0 && prefix) {
    evc.message = content.trim();
    evc.nurls = [
      {
        type: "npub",
        publicKeys,
        relayUrls,
      },
    ];
    return evc;
  }

  return undefined;
}

export function createEventContent(content: NEventContent) {
  if (!content) return "";
  let newContent = content.message ? `${content.message} ` : "";
  if (content.relayUrl) return `${newContent} ${content.relayUrl}`.trim();
  if (!content.nurls || content.nurls.length === 0) return newContent.trim();
  for (const nurl of content.nurls) {
    if (nurl.type === "npub") {
      // TODO: handle multiple npub
      newContent += `${encodePublicKeyToNostrUrl(nurl.publicKeys[0])} `;
    } else {
      throw new Error(`Unsupported nurl type ${nurl.type}`);
    }
  }
  return newContent.trim();
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

  // TODO: Many users use line breaks to format their content.
  // if (containsLineBreaks(content)) {
  //   return { isValid: false, error: "Line breaks are not allowed" };
  // }

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
