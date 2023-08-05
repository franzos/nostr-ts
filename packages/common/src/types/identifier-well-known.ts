/**
 * Identifier Well-Known Response
 *
 * https://<domain>/.well-known/nostr.json?name=<local-part>
 * https://github.com/nostr-protocol/nips/blob/master/05.md
 */
export interface IdentifierWellKnownResponse {
  names: { [name: string]: string };
  relays?: { [pubKey: string]: string[] };
}
