import {
  EventBase,
  ExternalIdentityClaimBase,
  IDENTITY_CLAIM_TYPE,
} from "../types";
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
    if (!isValidExternalIdentityClaim(tag)) {
      return;
    }
    this.type = tag[1].split(":")[0] as IDENTITY_CLAIM_TYPE;
    this.identity = tag[1].split(":")[1];
    this.proof = tag[2];
    return this;
  }
}

/**
 * Check tag if NIP-41
 * @param tag
 * @returns
 */
export function isValidExternalIdentityClaim(tag: string[]) {
  if (tag.length !== 3) {
    return false;
  }
  const typeIsValid = Object.values(IDENTITY_CLAIM_TYPE).includes(
    tag[1].split(":")[0] as IDENTITY_CLAIM_TYPE
  );
  if (!typeIsValid) {
    return false;
  }
  const identityIsValid = isValidProviderName(tag[1].split(":")[1]);
  if (!identityIsValid) {
    return false;
  }
  return true;
}

/**
 * Check array of tags if any are NIP-41
 * @param tags
 * @returns
 */
export function eventHasExternalIdentityClaim(
  event: EventBase
): ExternalIdentityClaim[] | undefined {
  const identityClaimTags = event.tags.filter(
    (tag) => tag[0] === "i" && isValidExternalIdentityClaim(tag)
  );
  if (identityClaimTags.length === 0) {
    return undefined;
  }
  const identityClaims: ExternalIdentityClaim[] = [];
  for (const tag of identityClaimTags) {
    const claim = new ExternalIdentityClaim();
    claim.fromTag(tag);
    identityClaims.push(claim);
  }
  return identityClaims;
}
