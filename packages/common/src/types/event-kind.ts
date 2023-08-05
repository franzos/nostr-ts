/**
 * Event kinds
 * https://github.com/nostr-protocol/nips/blob/master/README.md#event-kinds
 * https://github.com/nostr-protocol/nips/blob/master/33.md
 */
export enum NEVENT_KIND {
  METADATA = 0,
  SHORT_TEXT_NOTE = 1,
  RECOMMEND_RELAY = 2,
  CONTACTS = 3,
  ENCRYPTED_DIRECT_MESSAGES = 4,
  EVENT_DELETION = 5,
  REPOST = 6,
  REACTION = 7,
  BADGE_AWARD = 8,
  GENERIC_REPOST = 16,
  CHANNEL_CREATION = 40,
  CHANNEL_METADATA = 41,
  CHANNEL_MESSAGE = 42,
  CHANNEL_HIDE_MESSAGE = 43,
  CHANNEL_MUTE_USER = 44,

  /**
   * Regular event (NIP 16)
   */
  FILE_METADATA = 1063,

  /**
   * Regular event (NIP 16)
   */
  LIVE_CHAT_MESSAGE = 1311,

  /**
   * Regular event (NIP 16)
   */
  REPORTING = 1984,

  /**
   * Regular event (NIP 16)
   */
  LABEL = 1985,

  /**
   * Regular event (NIP 16)
   */
  ZAP_REQUEST = 9734,

  /**
   * Regular event (NIP 16)
   */
  ZAP_RECEIPT = 9735,

  /**
   * Replaceable event (NIP 16)
   */
  MUTE_LIST = 10000,

  /**
   * Replaceable event (NIP 16)
   */
  PIN_LIST = 10001,

  /**
   * Replaceable event (NIP 16)
   */
  RELAY_LIST_METADATA = 10002,

  /**
   * Replaceable event (NIP 16)
   */
  WALLET_INFO = 13194,

  /**
   * Replaceable event (NIP 16)
   */
  CLIENT_AUTHENTICATION = 22242,

  /**
   * Replaceable event (NIP 16)
   */
  WALLET_REQUEST = 23194,

  /**
   * Replaceable event (NIP 16)
   */
  WALLET_RESPONSE = 23195,

  /**
   * Replaceable event (NIP 16)
   */
  NOSTR_CONNECT = 24133,

  /**
   * Replaceable event (NIP 16)
   */
  HTTP_AUTH = 27235,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  CATEGORIZED_PEOPLE_LIST = 30000,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  CATEGORIZED_BOOKMARK_LIST = 30001,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  PROFILE_BADGES = 30008,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  BADGE_DEFINITION = 30009,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  CREATE_OR_UPDATE_A_STALL = 30017,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  CREATE_OR_UPDATE_A_PRODUCT = 30018,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  LONG_FORM_CONTENT = 30023,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  DRAFT_LONG_FORM_CONTENT = 30024,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  APPLICATION_SPECIFIC_DATA = 30078,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  LIVE_EVENT = 30311,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  CLASSIFIED_LISTING = 30402,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  DRAFT_CLASSIFIED_LISTING = 30403,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  HANDLER_RECOMMENDATION = 31989,

  /**
   * Parameterized Replaceable event (NIP 33)
   */
  HANDLER_INFORMATION = 31990,
}
