import { decodeBech32 } from "./bech32";

export function parseNostrURL(input: string) {
  const regex =
    /(?:nostr:)?(npub|nsec|note|lnurl|nprofile|nevent)([a-zA-Z0-9]+)/;

  const match = input.match(regex);

  if (match && match.length === 3) {
    return {
      prefix: match[1],
      bech32: `${match[1]}${match[2]}`,
    };
  } else {
    return null;
  }
}

export function isNostrUrl(url: string) {
  return parseNostrURL(url) !== null;
}

export function decodeNostrUrl(url: string) {
  const decoded = parseNostrURL(url);
  if (decoded === null) {
    return null;
  }
  return decodeBech32(decoded.bech32);
}
