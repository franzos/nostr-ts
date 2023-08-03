import { NEvent, NFilters } from "../classes/index";
import { FiltersBase } from "./filter";

/**
 * Client message to relay
 * https://github.com/nostr-protocol/nips/blob/master/README.md#client-to-relay
 */
export enum CLIENT_MESSAGE_TYPE {
  AUTH = "AUTH",
  CLOSE = "CLOSE",
  COUNT = "COUNT",
  EVENT = "EVENT",
  REQ = "REQ",
}

interface ClientMessageBase {
  type: CLIENT_MESSAGE_TYPE;
}

/**
 * Client close
 * Used to unsubscribe from a stream
 */
export interface ClientClose extends ClientMessageBase {
  type: CLIENT_MESSAGE_TYPE.CLOSE;
  subscriptionId: string;
}

/**
 * Client count
 * Used to get the number of events
 */
export interface ClientCount extends ClientMessageBase {
  type: CLIENT_MESSAGE_TYPE.COUNT;
  subscriptionId: string;
  filters: FiltersBase;
}

/**
 * Client event
 * Used to assemble a new event
 */
export interface ClientEvent extends ClientMessageBase {
  type: CLIENT_MESSAGE_TYPE.EVENT;
  data: NEvent;
}

/**
 * Client request
 * Used to subscribe to a stream
 */
export interface ClientRequest extends ClientMessageBase {
  type: CLIENT_MESSAGE_TYPE.REQ;
  subscriptionId: string;
  filters: FiltersBase;
}

export interface Subscribe {
  subscriptionId?: string;
  filters?: NFilters;
}

export interface Count extends Subscribe {}
