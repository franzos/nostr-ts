export enum NNIP {
  /**
   * Basic protocol flow description
   */
  NIP_01 = 1,
  /**
   * Contact List and Petnames
   */
  NIP_02 = 2,
  /**
   * OpenTimestamps Attestations for Events
   */
  NIP_03 = 3,
  /**
   * Encrypted Direct Message
   */
  NIP_04 = 4,
  /**
   * Mapping Nostr keys to DNS-based internet identifiers
   */
  NIP_05 = 5,
  /**
   * Basic key derivation from mnemonic seed phrase
   */
  NIP_06 = 6,
  /**
   * window.nostr capability for web browsers
   */
  NIP_07 = 7,
  /**
   * Handling Mentions --- unrecommended: deprecated in favor of NIP-27
   */
  NIP_08 = 8,
  /**
   * Event Deletion
   */
  NIP_09 = 9,
  /**
   * Conventions for clients' use of e and p tags in text events
   */
  NIP_10 = 10,
  /**
   * Relay Information Document
   */
  NIP_11 = 11,
  /**
   * Generic Tag Queries
   */
  NIP_12 = 12,
  /**
   * Proof of Work
   */
  NIP_13 = 13,
  /**
   * Subject tag in text events
   */
  NIP_14 = 14,
  /**
   * Nostr Marketplace (for resilient marketplaces)
   */
  NIP_15 = 15,
  /**
   * Event Treatment
   */
  NIP_16 = 16,
  /**
   * Reposts
   */
  NIP_18 = 18,
  /**
   * bech32-encoded entities
   */
  NIP_19 = 19,
  /**
   * Command Results
   */
  NIP_20 = 20,
  /**
   * nostr: URI scheme
   */
  NIP_21 = 21,
  /**
   * Event created_at Limits
   */
  NIP_22 = 22,
  /**
   * Long-form Content
   */
  NIP_23 = 23,
  /**
   * Reactions
   */
  NIP_25 = 25,
  /**
   * Delegated Event Signing
   */
  NIP_26 = 26,
  /**
   * Text Note References
   */
  NIP_27 = 27,
  /**
   * Public Chat
   */
  NIP_28 = 28,
  /**
   * Custom Emoji
   */
  NIP_30 = 30,
  /**
   * Dealing with Unknown Events
   */
  NIP_31 = 31,
  /**
   * Labeling
   */
  NIP_32 = 32,
  /**
   * Parameterized Replaceable Events
   */
  NIP_33 = 33,
  /**
   * Sensitive Content
   */
  NIP_36 = 36,
  /**
   * External Identities in Profiles
   */
  NIP_39 = 39,
  /**
   * Expiration Timestamp
   */
  NIP_40 = 40,
  /**
   * Authentication of clients to relays
   */
  NIP_42 = 42,
  /**
   * Counting results
   */
  NIP_45 = 45,
  /**
   * Nostr Connect
   */
  NIP_46 = 46,
  /**
   * Wallet Connect
   */
  NIP_47 = 47,
  /**
   * Keywords filter
   */
  NIP_50 = 50,
  /**
   * Lists
   */
  NIP_51 = 51,
  /**
   * Calendar Events
   */
  NIP_52 = 52,
  /**
   * Live Activities
   */
  NIP_53 = 53,
  /**
   * Reporting
   */
  NIP_56 = 56,
  /**
   * Lightning Zaps
   */
  NIP_57 = 57,
  /**
   * Badges
   */
  NIP_58 = 58,
  /**
   * Relay List Metadata
   */
  NIP_65 = 65,
  /**
   * Application-specific data
   */
  NIP_78 = 78,
  /**
   * Recommended Application Handlers
   */
  NIP_89 = 89,
  /**
   * File Metadata
   */
  NIP_94 = 94,
  /**
   * HTTP Auth
   */
  NIP_98 = 98,
  /**
   * Classified Listings
   */
  NIP_99 = 99,
}

export const NNips = [
  {
    name: "Basic protocol flow description",
    nip: 1,
  },
  {
    name: "Contact List and Petnames",
    nip: 2,
  },
  {
    name: "OpenTimestamps Attestations for Events",
    nip: 3,
  },
  {
    name: "Encrypted Direct Message",
    nip: 4,
  },
  {
    name: "Mapping Nostr keys to DNS-based internet identifiers",
    nip: 5,
  },
  {
    name: "Basic key derivation from mnemonic seed phrase",
    nip: 6,
  },
  {
    name: "window.nostr capability for web browsers",
    nip: 7,
  },
  {
    name: "Handling Mentions --- unrecommended: deprecated in favor of NIP-27",
    nip: 8,
  },
  {
    name: "Event Deletion",
    nip: 9,
  },
  {
    name: "Conventions for clients' use of e and p tags in text events",
    nip: 10,
  },
  {
    name: "Relay Information Document",
    nip: 11,
  },
  {
    name: "Generic Tag Queries",
    nip: 12,
  },
  {
    name: "Proof of Work",
    nip: 13,
  },
  {
    name: "Subject tag in text events",
    nip: 14,
  },
  {
    name: "Nostr Marketplace (for resilient marketplaces)",
    nip: 15,
  },
  {
    name: "Event Treatment",
    nip: 16,
  },
  {
    name: "Reposts",
    nip: 18,
  },
  {
    name: "bech32-encoded entities",
    nip: 19,
  },
  {
    name: "Command Results",
    nip: 20,
  },
  {
    name: "nostr: URI scheme",
    nip: 21,
  },
  {
    name: "Event created_at Limits",
    nip: 22,
  },
  {
    name: "Long-form Content",
    nip: 23,
  },
  {
    name: "Reactions",
    nip: 25,
  },
  {
    name: "Delegated Event Signing",
    nip: 26,
  },
  {
    name: "Text Note References",
    nip: 27,
  },
  {
    name: "Public Chat",
    nip: 28,
  },
  {
    name: "Custom Emoji",
    nip: 30,
  },
  {
    name: "Dealing with Unknown Events",
    nip: 31,
  },
  {
    name: "Labeling",
    nip: 32,
  },
  {
    name: "Parameterized Replaceable Events",
    nip: 33,
  },
  {
    name: "Sensitive Content",
    nip: 36,
  },
  {
    name: "External Identities in Profiles",
    nip: 39,
  },
  {
    name: "Expiration Timestamp",
    nip: 40,
  },
  {
    name: "Authentication of clients to relays",
    nip: 42,
  },
  {
    name: "Counting results",
    nip: 45,
  },
  {
    name: "Nostr Connect",
    nip: 46,
  },
  {
    name: "Wallet Connect",
    nip: 47,
  },
  {
    name: "Keywords filter",
    nip: 50,
  },
  {
    name: "Lists",
    nip: 51,
  },
  {
    name: "Calendar Events",
    nip: 52,
  },
  {
    name: "Live Activities",
    nip: 53,
  },
  {
    name: "Reporting",
    nip: 56,
  },
  {
    name: "Lightning Zaps",
    nip: 57,
  },
  {
    name: "Badges",
    nip: 58,
  },
  {
    name: "Relay List Metadata",
    nip: 65,
  },
  {
    name: "Application-specific data",
    nip: 78,
  },
  {
    name: "Recommended Application Handlers",
    nip: 89,
  },
  {
    name: "File Metadata",
    nip: 94,
  },
  {
    name: "HTTP Auth",
    nip: 98,
  },
  {
    name: "Classified Listings",
    nip: 99,
  },
];

export function nNipToMessage(nip: NNIP) {
  return NNips.find((n) => n.nip === nip).name;
}
