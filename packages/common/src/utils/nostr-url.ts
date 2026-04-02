import { BECH32_PREFIX } from "../types";
import { decodeBech32, encodeBech32 } from "./bech32";

export const NOSTR_URL_REGEX =
  /(?:nostr:)?(npub|nsec|note|lnurl|nprofile|nevent|naddr|nrelay)([a-zA-Z0-9]+)/;

export const NOSTR_URL_REGEX_GLOBAL =
  /(?:nostr:)?(npub|nsec|note|lnurl|nprofile|nevent|naddr|nrelay)([a-zA-Z0-9]+)/g;

export enum NOSTR_URL_PREFIX {
  npub = "npub",
  nsec = "nsec",
  note = "note",
  lnurl = "lnurl",
  nprofile = "nprofile",
  nevent = "nevent",
  naddr = "naddr",
  nrelay = "nrelay",
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

// -- nevent (full TLV) --

/**
 * Encode a full nevent with optional relay hints, author, and kind
 * @param eventId - hex-encoded event ID
 * @param relayUrls - optional relay URLs where the event may be found
 * @param authorPubkey - optional hex-encoded author pubkey
 * @param kind - optional event kind number
 * @returns bech32-encoded nevent string
 */
export function bechEncodeEvent(
  eventId: string,
  relayUrls?: string[],
  authorPubkey?: string,
  kind?: number
) {
  const tlvItems: Array<{
    type: number;
    value: string | number;
    encoding?: "text";
  }> = [{ type: 0, value: eventId }];

  if (relayUrls) {
    for (const url of relayUrls) {
      tlvItems.push({ type: 1, value: url });
    }
  }

  if (authorPubkey) {
    tlvItems.push({ type: 2, value: authorPubkey });
  }

  if (kind !== undefined) {
    tlvItems.push({ type: 3, value: kind });
  }

  return encodeBech32(BECH32_PREFIX.Event, tlvItems);
}

/**
 * Decode an nevent bech32 or nostr: string into structured data
 * @returns eventId, relays, author, kind — or null
 */
export function decodeNostrEventString(nostrUrl: string) {
  const decoded = decodeNostrUrl(nostrUrl);
  if (decoded === null) {
    return null;
  }

  const result: {
    eventId: string;
    relays: string[];
    author?: string;
    kind?: number;
  } = { eventId: "", relays: [] };

  for (const item of decoded.tlvItems) {
    if (item.type === 0) result.eventId = item.value as string;
    else if (item.type === 1) result.relays.push(item.value as string);
    else if (item.type === 2) result.author = item.value as string;
    else if (item.type === 3) result.kind = item.value as number;
  }

  return result;
}

// -- naddr (event coordinates) --

/**
 * Encode an naddr (addressable event coordinate)
 * @param identifier - the "d" tag value (use empty string for normal replaceable events)
 * @param pubkey - hex-encoded author pubkey (required)
 * @param kind - event kind number (required)
 * @param relayUrls - optional relay URLs
 * @returns bech32-encoded naddr string
 */
export function bechEncodeEventCoordinate(
  identifier: string,
  pubkey: string,
  kind: number,
  relayUrls?: string[]
) {
  const tlvItems: Array<{
    type: number;
    value: string | number;
    encoding?: "text";
  }> = [{ type: 0, value: identifier, encoding: "text" }];

  if (relayUrls) {
    for (const url of relayUrls) {
      tlvItems.push({ type: 1, value: url });
    }
  }

  tlvItems.push({ type: 2, value: pubkey });
  tlvItems.push({ type: 3, value: kind });

  return encodeBech32(BECH32_PREFIX.EventCoordinate, tlvItems);
}

/**
 * nostr:naddr
 */
export function makeNostrEventCoordinateString(
  identifier: string,
  pubkey: string,
  kind: number,
  relayUrls?: string[]
) {
  return makeNostrString(
    bechEncodeEventCoordinate(identifier, pubkey, kind, relayUrls)
  );
}

/**
 * Decode an naddr bech32 or nostr: string into structured data
 * @returns identifier (d-tag), pubkey, kind, relays — or null
 */
export function decodeNostrEventCoordinateString(nostrUrl: string) {
  const decoded = decodeNostrUrl(nostrUrl);
  if (decoded === null) {
    return null;
  }

  const result: {
    identifier: string;
    pubkey: string;
    kind: number;
    relays: string[];
  } = { identifier: "", pubkey: "", kind: 0, relays: [] };

  for (const item of decoded.tlvItems) {
    if (item.type === 0) result.identifier = item.value as string;
    else if (item.type === 1) result.relays.push(item.value as string);
    else if (item.type === 2) result.pubkey = item.value as string;
    else if (item.type === 3) result.kind = item.value as number;
  }

  return result;
}

// -- nrelay (deprecated per NIP-19) --

/**
 * Encode an nrelay
 * @deprecated NIP-19 marks nrelay as deprecated
 * @param relayUrl - the relay URL
 * @returns bech32-encoded nrelay string
 */
export function bechEncodeRelay(relayUrl: string) {
  return encodeBech32(BECH32_PREFIX.Relay, [
    { type: 0, value: relayUrl, encoding: "text" },
  ]);
}

/**
 * nostr:nrelay
 * @deprecated NIP-19 marks nrelay as deprecated
 */
export function makeNostrRelayString(relayUrl: string) {
  return makeNostrString(bechEncodeRelay(relayUrl));
}

/**
 * Decode an nrelay bech32 or nostr: string
 * @deprecated NIP-19 marks nrelay as deprecated
 * @returns relay URL string — or null
 */
export function decodeNostrRelayString(nostrUrl: string) {
  const decoded = decodeNostrUrl(nostrUrl);
  if (decoded === null) {
    return null;
  }

  for (const item of decoded.tlvItems) {
    if (item.type === 0) return item.value as string;
  }

  return null;
}
