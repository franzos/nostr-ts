/**
 * Filters for the search
 *
 */
export interface FiltersBase {
  /**
   * a list of event ids or prefixes
   */
  ids?: string[];
  /**
   * a list of pubkeys or prefixes, the pubkey of an event must be one of these
   */
  authors?: string[];
  /**
   * a list of a kind numbers
   */
  kinds?: number[];
  /**
   * a list of event ids that are referenced in an "e" tag
   */
  "#e"?: string[];
  /**
   * a list of pubkeys that are referenced in a "p" tag
   */
  "#p"?: string[];
  /**
   * a list of tags that are referenced in a "t" tag
   */
  "#t"?: string[];
  /**
   * an integer unix timestamp in seconds, events must be newer than this to pass
   */
  since?: number;
  /**
   * an integer unix timestamp in seconds, events must be older than this to pass
   */
  until?: number;
  /**
   * maximum number of events to be returned in the initial query
   */
  limit?: number;
}
