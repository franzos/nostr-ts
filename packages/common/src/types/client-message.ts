import { NewEvent, NewFilters } from "../classes/index.js"
import { Filters } from "./filter.js"

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

export interface ClientMessageBase {
    type: CLIENT_MESSAGE_TYPE
}

/**
 * Client event
 * Used to assemble a new event
 */
export interface ClientEvent extends ClientMessageBase {
    type: CLIENT_MESSAGE_TYPE.EVENT
    data: NewEvent
}

/**
 * Client request
 * Used to subscribe to a stream
 */
export interface ClientRequest extends ClientMessageBase {
    type: CLIENT_MESSAGE_TYPE.REQ
    subscriptionId: string
    filters: Filters
}

/**
 * Client close
 * Used to unsubscribe from a stream
 */
export interface ClientClose extends ClientMessageBase {
    type: CLIENT_MESSAGE_TYPE.CLOSE
    subscriptionId: string
}

export interface Subscribe {
    subscriptionId?: string
    filters?: NewFilters
}