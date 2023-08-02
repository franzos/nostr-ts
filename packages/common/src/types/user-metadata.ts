/**
 * User metadata for event content field
 *
 * Some of these are official
 * other's I've seen in the wild
 *
 * https://github.com/nostr-protocol/nips/blob/master/01.md#basic-event-kinds
 * > stringified JSON object {name: <username>, about: <string>, picture: <url, string>}
 * > describing the user who created the event
 */
export interface UserMetadata {
  name?: string;
  display_name?: string;
  picture?: string;
  banner?: string;
  /**
   * https://github.com/nostr-protocol/nips/blob/master/05.md
   */
  nip05?: string;
  website?: string;
  about?: string;
  image?: string;
}
