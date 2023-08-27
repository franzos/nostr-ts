import { NREPORT_KIND } from "./report-types";

/**
 * Reporting
 * https://github.com/nostr-protocol/nips/blob/master/56.md
 */
export interface EventReport {
  /**
   * If reporting a note, an e tag MUST also be included referencing the note id.
   */
  eventId?: string;
  /**
   * A report type string MUST be included as the 3rd entry to the e or p tag being reported,
   */
  kind: NREPORT_KIND;
  /**
   * The report event MUST include a p tag referencing the pubkey of the user you are reporting.
   */
  publicKey: string;
  content?: string;
}
