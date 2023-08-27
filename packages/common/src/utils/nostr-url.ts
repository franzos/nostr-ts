import { BECH32_PREFIX } from "../types";
import { decodeBech32, encodeBech32 } from "./bech32";

export const NOSTR_URL_REGEX =
  /(?:nostr:)?(npub|nsec|note|lnurl|nprofile|nevent)([a-zA-Z0-9]+)/;

export const NOSTR_URL_REGEX_GLOBAL =
  /(?:nostr:)?(npub|nsec|note|lnurl|nprofile|nevent)([a-zA-Z0-9]+)/g;
// /(nostr:npub[0-9a-fA-F]{64})/g;

function parseNostrURL(input: string) {
  if (typeof input !== "string") {
    return null;
  }

  const match = input.match(NOSTR_URL_REGEX);

  if (match && match.length === 3) {
    return {
      prefix: match[1],
      bech32: `${match[1]}${match[2]}`,
    };
  } else {
    return null;
  }
}

/**
 * Check if string is a nostr url
 * @param url nostr:npub1kade5vf37snr4hv5hgstav6j5ygry6z09kkq0flp47p8cmeuz5zs7zz2an
 * @returns
 */
export function isNostrUrl(url: string) {
  return parseNostrURL(url) !== null;
}

/**
 * Decode nostr url
 * @param url nostr:npub1kade5vf37snr4hv5hgstav6j5ygry6z09kkq0flp47p8cmeuz5zs7zz2an
 * @returns
 */
export function decodeNostrUrl(url: string) {
  const decoded = parseNostrURL(url);
  if (decoded === null) {
    return null;
  }
  return decodeBech32(decoded.bech32);
}

/**
 * Encode nostr url
 * @param prefix
 * @param tlvItems
 * @returns
 */
export function encodeNostrUrl(
  prefix: BECH32_PREFIX,
  tlvItems: {
    type: number;
    value: string | number;
  }[]
) {
  return `nostr:${encodeBech32(prefix, tlvItems)}`;
}

/**
 * Encode a private key as nostr url
 * @param publicKey
 * @returns
 */
export function encodePublicKeyToNostrUrl(publicKey: string) {
  return encodeNostrUrl(BECH32_PREFIX.PublicKeys, [
    {
      type: 0,
      value: publicKey,
    },
  ]);
}
