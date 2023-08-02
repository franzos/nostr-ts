import { ExternalIdentityClaimBase, IDENTITY_CLAIM_TYPE } from "../types";
import { isValidProviderName, normalizeProviderName } from "../utils";

/**
 * Class to easily create and parse external identity claims.
 */
export class ExternalIdentityClaim implements ExternalIdentityClaimBase {
  type: IDENTITY_CLAIM_TYPE;
  identity: string;
  proof: string;

  constructor(claim?: ExternalIdentityClaimBase) {
    if (claim) {
      const identityIsValid = isValidProviderName(claim.identity);
      if (!identityIsValid) {
        throw new Error("Invalid identity. Valid: a-z, 0-9, -, _, @");
      }
      this.type = claim.type;
      this.identity = normalizeProviderName(claim.identity);
      this.proof = claim.proof;
    }
  }

  /**
   * Convert an ExternalIdentityClaim to a tag
   * @returns
   */
  public toTag(): string[] {
    switch (this.type) {
      case IDENTITY_CLAIM_TYPE.GITHUB:
        return ["i", `github:${this.identity}`, this.proof];
      case IDENTITY_CLAIM_TYPE.TWITTER:
        return ["i", `twitter:${this.identity}`, this.proof];
      case IDENTITY_CLAIM_TYPE.MASTODON:
        return ["i", `mastodon:${this.identity}`, this.proof];
      case IDENTITY_CLAIM_TYPE.TELEGRAM:
        return ["i", `telegram:${this.identity}`, this.proof];
      default:
        throw new Error(
          `Unknown claim type ${this.type}. Valid: github, twitter, mastodon, telegram`
        );
    }
  }

  /**
   * Parse a tag into an ExternalIdentityClaim
   * @param tag `ex. ["i", "github:semisol", "9721ce4ee4fceb91c9711ca2a6c9a5ab"]`
   * @returns
   */
  public fromTag(tag: string[]): ExternalIdentityClaim | undefined {
    if (tag.length !== 3) {
      return;
    }
    this.type = tag[1].split(":")[0] as IDENTITY_CLAIM_TYPE;
    this.identity = tag[1].split(":")[1];
    this.proof = tag[2];
    return this;
  }
}
