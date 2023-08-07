import {
  EventBase,
  IdentifierWellKnownResponse,
  LnurlEndpointResponse,
  UserBase,
  UserMetadata,
} from "../types";
import { NEvent } from "./event";
import {
  ExternalIdentityClaim,
  eventHasExternalIdentityClaim,
} from "./identity-claim";
import {
  nip05ToUrl,
  decodeLnurl,
  loadFromUserMetadataString,
  lud16ToUrl,
} from "../utils";
import { NFilters } from "./filter";

/**
 * User information is available from kind 0 events
 */
export class NUserBase implements UserBase {
  pubkey: string;
  claims?: ExternalIdentityClaim[];
  data?: UserMetadata;

  lightningZapInfo: LnurlEndpointResponse;
  lastUpdated?: number;
  nip05isValid?: boolean;

  constructor(data?: UserBase) {
    this.pubkey = data?.pubkey || undefined;
    this.claims = data?.claims || [];
    this.data = data?.data || {};
    this.lastUpdated = data?.lastUpdated || 0;
  }

  public loaded(): boolean {
    return this.data !== undefined;
  }

  public hasZapInfo(): boolean {
    return this.lightningZapInfo !== undefined;
  }

  public fromPublicKey(pubkey: string): UserBase {
    this.pubkey = pubkey;
    return this;
  }

  public fromEvent(event: EventBase, raise: boolean = true): UserBase {
    const ev = new NEvent(event);
    if (ev.kind !== 0) {
      if (raise) {
        throw new Error("wrong event kind");
      } else {
        return undefined;
      }
    }
    if (this.pubkey && this.pubkey !== "" && ev.pubkey !== this.pubkey) {
      if (raise) {
        throw new Error("wrong event pubkey");
      } else {
        return undefined;
      }
    }

    this.pubkey = ev.pubkey;
    this.lastUpdated = ev.created_at;

    if (ev.content && ev.content !== "") {
      const data = loadFromUserMetadataString(ev.content);
      if (data) {
        this.data = data;
      }
    }

    const hasClaims = eventHasExternalIdentityClaim(event);
    if (hasClaims) {
      this.claims = hasClaims;
    }

    return this;
  }

  getNip05Url(): string | undefined {
    const nip05 = this.data?.nip05 || undefined;
    if (!nip05) {
      return undefined;
    }
    return nip05ToUrl(nip05);
  }

  validateWellKnown(payload: IdentifierWellKnownResponse) {
    if (!payload) {
      return false;
    }

    const publicKeyMatch = Object.keys(payload.names).find(
      (key) => payload.names[key] === this.pubkey
    );

    if (publicKeyMatch) {
      this.nip05isValid = true;
      return true;
    } else {
      this.nip05isValid = false;
      return false;
    }
  }

  getLud16(): string | undefined {
    return this.data?.lud16 || undefined;
  }

  getLud16Url(): string | undefined {
    const lud16 = this.getLud16();
    if (!lud16) {
      return undefined;
    }
    return lud16ToUrl(lud16);
  }

  getLud06(): string | undefined {
    return this.data?.lud06 || undefined;
  }

  getLud06Url(): string | undefined {
    const lud06 = this.getLud06();
    if (!lud06) {
      return undefined;
    }
    return decodeLnurl(lud06);
  }

  getLud16Or06():
    | {
        type: "lud16" | "lud06";
        url: string;
      }
    | undefined {
    const lud06 = this.getLud06();
    if (lud06) {
      return {
        type: "lud06",
        url: lud06,
      };
    }

    const lud16 = this.getLud16();
    if (lud16) {
      return {
        type: "lud16",
        url: lud16,
      };
    }

    return undefined;
  }

  getLud16Or06Url():
    | {
        type: "lud16" | "lud06";
        url: string;
      }
    | undefined {
    const lud06 = this.getLud06Url();
    if (lud06) {
      return {
        type: "lud06",
        url: lud06,
      };
    }

    const lud16 = this.getLud16Url();
    if (lud16) {
      return {
        type: "lud16",
        url: lud16,
      };
    }

    return undefined;
  }

  getMetadataFilter() {
    const filters = new NFilters();
    filters.addAuthor(this.pubkey);
    filters.addKind(0);
    return filters;
  }

  /**
   * Mostly used for DB storage
   */
  toJson() {
    return {
      pubkey: this.pubkey,
      claims: this.claims,
      data: this.data,
      lightningZapInfo: this.lightningZapInfo,
      lastUpdated: this.lastUpdated,
      nip05isValid: this.nip05isValid,
    };
  }

  /**
   * Mostly used for DB storage
   */
  fromJson(data: {
    pubkey: string;
    claims: ExternalIdentityClaim[];
    data: UserMetadata;
    lightningZapInfo: LnurlEndpointResponse;
    lastUpdated: number;
    nip05isValid: boolean;
  }) {
    this.pubkey = data.pubkey;
    this.claims = data.claims;
    this.data = data.data;
    this.lightningZapInfo = data.lightningZapInfo;
    this.lastUpdated = data.lastUpdated;
    this.nip05isValid = data.nip05isValid;
    return this;
  }
}
