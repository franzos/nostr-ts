import { UserMetadata } from "../types";

/**
 * https://github.com/nostr-protocol/nips/blob/master/01.md#basic-event-kinds
 * > stringified JSON object {name: <username>, about: <string>, picture: <url, string>}
 * > describing the user who created the event
 * @param meta
 * @returns
 */
export function createUserMetadataString(meta?: UserMetadata) {
  if (!meta) {
    return "";
  }
  return JSON.stringify(meta);
}

export function loadFromUserMetadataString(meta: string): UserMetadata | null {
  try {
    const data = JSON.parse(meta);

    // Check if properties exist on parsed object before accessing them
    return {
      name: data.name ?? null,
      display_name: data.display_name ?? null,
      picture: data.picture ?? null,
      banner: data.banner ?? null,
      nip05: data.nip05 ?? null,
      website: data.website ?? null,
      about: data.about ?? null,
      image: data.image ?? null,
      npub: data.npub ?? null,
      lud16: data.lud16 ?? null,
      lud06: data.lud06 ?? null,
    };
  } catch (error) {
    console.error("Unable to parse user metadata string", error);
    return null;
  }
}
