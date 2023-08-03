import {
  CLIENT_MESSAGE_TYPE,
  ClientCount,
  ClientEvent,
  ClientRequest,
} from "./client-message";
import { FiltersBase } from "./filter";

export interface ClientSubscription {
  url: string;
  connectionId: string;
  subscriptionId: string;
  type: CLIENT_MESSAGE_TYPE;
  filters: FiltersBase;
}

export interface ClientCommands {
  connectionId: string;
  subscriptionId?: string;
  eventId?: string;
  request?: ClientRequest | ClientCount | ClientEvent;
  response?: string | {};
  success?: boolean;
}
