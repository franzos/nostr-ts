/**
 * Filters for the search
 * 
 */
export interface Filters {
    /**
     * a list of event ids or prefixes
     */
    ids?: string[]
    /**
     * a list of pubkeys or prefixes, the pubkey of an event must be one of these
     */
    authors?: string[]
    kinds?: number[]
    '#e'?: string[]
    '#p'?: string[]
    since?: number
    until?: number
    limit?: number
}