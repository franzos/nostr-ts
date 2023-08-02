export enum IDENTITY_CLAIM_TYPE {
  GITHUB = "github",
  TWITTER = "twitter",
  MASTODON = "mastodon",
  TELEGRAM = "telegram",
}

/**
 * For more details see
 * https://github.com/nostr-protocol/nips/blob/master/39.md#claim-types
 */
export interface ExternalIdentityClaimBase {
  type: IDENTITY_CLAIM_TYPE;
  /**
   * Usually the username
   * - github: username
   * - twitter: username
   * - mastodon: domain.com/@username
   * - telegram: user ID
   */
  identity: string;
  /**
   * Proof of ownership of the identity
   * - github: A GitHub Gist ID
   * - twitter: A tweet ID
   * - mastodon: A Mastodon post ID
   * - telegram: Channel / Message ID (ref/id)
   */
  proof: string;
}
