import { BECH32_PREFIX } from "../types";
import { decodeBech32, encodeBech32 } from "./bech32";

export const NOSTR_URL_REGEX =
  /(?:nostr:)?(npub|nsec|note|lnurl|nprofile|nevent)([a-zA-Z0-9]+)/;

export const NOSTR_URL_REGEX_GLOBAL =
  /(?:nostr:)?(npub|nsec|note|lnurl|nprofile|nevent)([a-zA-Z0-9]+)/g;

export enum NOSTR_URL_PREFIX {
  npub = "npub",
  nsec = "nsec",
  note = "note",
  lnurl = "lnurl",
  nprofile = "nprofile",
  nevent = "nevent",
}

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
export function encodeNostrString(
  prefix: BECH32_PREFIX,
  tlvItems: {
    type: number;
    value: string | number;
  }[]
) {
  return `nostr:${encodeBech32(prefix, tlvItems)}`;
}

function makeNostrString(value: string) {
  return `nostr:${value}`;
}

/**
 * Encode a private key as nostr url
 * @param publicKey
 * @returns
 */
export function encodePublicKeyToNostrUrl(publicKey: string) {
  return encodeNostrString(BECH32_PREFIX.PublicKeys, [
    {
      type: 0,
      value: publicKey,
    },
  ]);
}

export function bechEncodeEventId(eventId: string) {
  return encodeBech32(BECH32_PREFIX.Event, [{ type: 0, value: eventId }]);
}

/**
 * nostr:nevent
 * @param eventId
 * @returns
 */
export function makeNostrEventString(eventId: string) {
  return makeNostrString(bechEncodeEventId(eventId));
}

export function bechEncodeProfile(pubkey: string, relayUrls?: string[]) {
  const tlvItems = [
    {
      type: 0,
      value: pubkey,
    },
  ];

  if (relayUrls && relayUrls.length > 0) {
    for (const relayUrl of relayUrls) {
      tlvItems.push({
        type: 1,
        value: relayUrl,
      });
    }
  }

  return encodeBech32(BECH32_PREFIX.Profile, tlvItems);
}

/**
 * nostr:profile
 * @param pubkey
 * @param relayUrls
 * @returns
 */
export function makeNostrProfileString(pubkey: string, relayUrls?: string[]) {
  return makeNostrString(bechEncodeProfile(pubkey, relayUrls));
}

/**
 * npub
 * @param pubkey
 * @returns
 */
export function bechEncodePublicKey(pubkey: string) {
  return encodeBech32(BECH32_PREFIX.PublicKeys, [
    {
      type: 0,
      value: pubkey,
    },
  ]);
}

/**
 * nostr:npub
 * @param pubkey
 * @returns
 */
export function makeNostrPublicKeyString(pubkey) {
  return makeNostrString(bechEncodePublicKey(pubkey));
}

export function bechEncodePrivateKey(privkey: string) {
  return encodeBech32(BECH32_PREFIX.PrivateKeys, [
    {
      type: 0,
      value: privkey,
    },
  ]);
}

export function makeNostrPrivateKeyString(privkey: string) {
  return makeNostrString(bechEncodePrivateKey(privkey));
}

export function decodeNostrPublicKeyString(nostrUrl: string) {
  const decoded = decodeNostrUrl(nostrUrl);
  if (decoded === null) {
    return null;
  }
  return decoded.tlvItems[0].value;
}

export function decodeNostrPrivateKeyString(nostrUrl: string) {
  const decoded = decodeNostrUrl(nostrUrl);
  if (decoded === null) {
    return null;
  }
  return decoded.tlvItems[0].value;
}

export function decodeNostrProfileString(nostrUrl: string) {
  const decoded = decodeNostrUrl(nostrUrl);
  if (decoded === null) {
    return null;
  }
  return decoded.tlvItems;
}
