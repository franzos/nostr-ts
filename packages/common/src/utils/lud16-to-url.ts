export function isTorOnionAddress(address: string) {
  return address.endsWith(".onion");
}

/**
 * Lud16 to URL
 *
 * > Upon seeing such an address,
 * > WALLET makes a GET request to https://<domain>/.well-known/lnurlp/<username> endpoint
 * > if domain is clearnet or http://<domain>/.well-known/lnurlp/<username> if domain is onion.
 * > For example, if the address is satoshi@bitcoin.org,
 * > the request is to be made to https://bitcoin.org/.well-known/lnurlp/satoshi.
 * @param lud16 <username>@<domainname>
 */
export function lud16ToUrl(lud16: string) {
  const [username, domain] = lud16.split("@");
  const isOnion = isTorOnionAddress(domain);
  const protocol = isOnion ? "http" : "https";
  const url = `${protocol}://${domain}/.well-known/lnurlp/${username}`;
  return url;
}
