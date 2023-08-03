import { RelayInformationDocument } from "./relay-information";
import {
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
} from "./relay-message";

export interface WebSocketClientBase {
  config: WebSocketClientConfig;
  sendMessage: (data: string) => void;
  listen: (
    onMessage: (payload: {
      data:
        | RelayAuth
        | RelayCount
        | RelayEose
        | RelayEvent
        | RelayNotice
        | RelayOK;
      meta: WebSocketClientConfig;
    }) => void
  ) => void;
  closeConnection: () => void;
}

export interface WebSocketClientConfig {
  id: string;
  url: string;
}

export interface WebSocketClientInfo extends WebSocketClientConfig {
  id: string;
  url: string;
  info?: RelayInformationDocument;
}

export interface WebSocketClientConnection extends WebSocketClientInfo {
  connection?: WebSocketClientBase;
}
