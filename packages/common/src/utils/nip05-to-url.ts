import { isTorOnionAddress } from "./lud16-to-url";

/**
 * Nip05 to URL
 *
 * > Upon seeing that,
 * > the client splits the identifier into <local-part> and <domain> and use these values to
 * > make a GET request to https://<domain>/.well-known/nostr.json?name=<local-part>.
 *
 * https://github.com/nostr-protocol/nips/blob/master/05.md
 *
 * @param nip05
 * @returns
 */
export function nip05ToUrl(nip05: string) {
  const [username, domain] = nip05.split("@");
  const isOnion = isTorOnionAddress(domain);
  const protocol = isOnion ? "http" : "https";
  const url = `${protocol}://${domain}/.well-known/nostr.json?name=${username}`;
  return url;
}
