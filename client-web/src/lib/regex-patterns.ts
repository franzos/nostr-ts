/**
 * Static regex patterns for parsing event content
 * These patterns are used to identify URLs, Nostr entities, and hashtags in text
 */

export const CONTENT_REGEX_PATTERNS = {
  url: /(https?:\/\/[^\s]+)/g,
  note: /(?:nostr:)?(note[0-9a-zA-Z]+|nevent[0-9a-zA-Z]+)/g,
  profile: /(?:nostr:)?(npub[0-9a-zA-Z]+|nprofile[0-9a-zA-Z]+)/g,
  tags: /#[a-zA-Z0-9]+/g,
} as const;

/**
 * Combined regex pattern for splitting text into tokens
 * Used to split content into processable chunks
 */
export const CONTENT_SPLIT_PATTERN = /(https?:\/\/[^\s]+|(?:nostr:)?note[0-9a-zA-Z]+|(?:nostr:)?npub[0-9a-zA-Z]+|(?:nostr:)?nprofile[0-9a-zA-Z]+|(?:nostr:)?nevent[0-9a-zA-Z]+|#[a-zA-Z0-9]+)/g;