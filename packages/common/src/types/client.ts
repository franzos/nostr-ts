import { ClientCount, ClientEvent, ClientRequest } from "./client-message";

export interface ClientSubscription {
  url: string;
  connectionId: string;
  subscriptionId: string;
}

export interface ClientCommands {
  connectionId: string;
  subscriptionId?: string;
  eventId?: string;
  request?: ClientRequest | ClientCount | ClientEvent;
  response?: string | {};
  success?: boolean;
}
