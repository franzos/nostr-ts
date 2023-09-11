import { EventBaseSigned } from "./event";
import { FiltersBase } from "./filter";
import { UserBase } from "./user";

/**
 * Relay message to client
 * https://github.com/nostr-protocol/nips/blob/master/README.md#relay-to-client
 */
export enum RELAY_MESSAGE_TYPE {
  /**
   * used to send authentication challenges
   */
  AUTH = "AUTH",
  /**
   * used to send requested event counts to clients
   */
  COUNT = "COUNT",
  /**
   * used to send requested event counts to clients
   */
  EOSE = "EOSE",
  /**
   * used to send requested event counts to clients
   */
  EVENT = "EVENT",
  /**
   * used to send requested event counts to clients
   */
  NOTICE = "NOTICE",
  /**
   * used to notify clients if an EVENT was successful
   */
  OK = "OK",
}

/**
 * Relay authentication challenge
 * https://github.com/nostr-protocol/nips/blob/master/42.md
 */
export interface RelayAuth extends Array<string> {
  0: RELAY_MESSAGE_TYPE.AUTH;
  /**
   * Auth challenge
   */
  1: string;
}

/**
 * Relay event count
 * https://github.com/nostr-protocol/nips/blob/master/45.md
 */
export interface RelayCount extends Array<string | { count: number }> {
  0: RELAY_MESSAGE_TYPE.COUNT;
  /**
   * Subscription ID
   */
  1: string;
  /**
   * Event count
   */
  2: { count: number };
}

/**
 * Relay end of stream
 */
export interface RelayEose extends Array<string | FiltersBase> {
  0: RELAY_MESSAGE_TYPE.EOSE;
  /**
   * Subscription ID
   */
  1: string;
}

/**
 * Relay event
 */
export interface RelayEvent extends Array<string | EventBaseSigned> {
  0: RELAY_MESSAGE_TYPE.EVENT;
  /**
   * Subscription ID
   */
  1: string;
  2: EventBaseSigned;
}

/**
 * Relay notice
 */
export interface RelayNotice extends Array<string | FiltersBase> {
  0: RELAY_MESSAGE_TYPE.NOTICE;
  /**
   * Message
   */
  1: string;
}

/**
 * Relay command result
 * https://github.com/nostr-protocol/nips/blob/master/20.md
 */
export interface RelayOK extends Array<string | boolean> {
  0: RELAY_MESSAGE_TYPE.OK;
  /**
   * Event ID
   */
  1: string;
  /**
   * Success or failure
   */
  2: boolean;
  /**
   * Message
   */
  3: string;
}

/**
 * Probably unnecessary helper, to ensure relay messages are properly formatted
 * @param data
 * @returns
 */
export function extractRelayMessage(data: any) {
  const [type, ...rest] = data;
  switch (type) {
    case RELAY_MESSAGE_TYPE.AUTH:
      return [type, rest[0] as string] as RelayAuth;
    case RELAY_MESSAGE_TYPE.COUNT:
      return [
        type,
        rest[0] as string,
        rest[1] as { count: number },
      ] as RelayCount;
    case RELAY_MESSAGE_TYPE.EOSE:
      return [type, rest[0] as string] as RelayEose;
    case RELAY_MESSAGE_TYPE.EVENT:
      return [
        type,
        rest[0] as string,
        rest[1] as EventBaseSigned,
      ] as RelayEvent;
    case RELAY_MESSAGE_TYPE.NOTICE:
      return [type, rest[0] as string] as RelayNotice;
    case RELAY_MESSAGE_TYPE.OK:
      return [
        type,
        rest[0] as string,
        rest[1] as boolean,
        rest[2] as string,
      ] as RelayOK;

    default:
      throw new Error(`Unknown message type ${type}`);
  }
}

/**
 * Format relay message for logging
 * @param data
 */
export function logRelayMessage(
  data: RelayAuth | RelayCount | RelayEose | RelayEvent | RelayNotice | RelayOK,
  user?: UserBase
) {
  const [type, ...rest] = data;
  switch (type) {
    case RELAY_MESSAGE_TYPE.AUTH:
      console.log(`RECEIVED AUTH CHALLENGE: ${data[1]}`);
      break;
    case RELAY_MESSAGE_TYPE.COUNT:
      console.log(`RECEIVED COUNT: ${data[2].count}`, ...rest);
      break;
    case RELAY_MESSAGE_TYPE.EOSE:
      console.log(`RECEIVED EOSE: ${data[1]}`);
      break;
    case RELAY_MESSAGE_TYPE.EVENT:
      console.log(`RECEIVED EVENT: ${data[2].id}`, ...rest);
      if (user) {
        console.log(`USER ########`);
        console.log(user);
      }
      break;
    case RELAY_MESSAGE_TYPE.NOTICE:
      console.log(`RECEIVED NOTICE: ${data[1]}`);
      break;
    case RELAY_MESSAGE_TYPE.OK:
      console.log(`RECEIVED OK: ${data[1]}`, ...rest);
      break;

    default:
      throw new Error(`Unknown message type ${type}`);
  }
}
