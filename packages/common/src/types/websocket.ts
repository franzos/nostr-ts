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
  /**
   * Websocket
   * Plugin from WebSocketClient
   * Init from RelayClient
   */
  connection: any;
  error: {
    error: any;
    message: string;
    type: string;
  } | null;

  /**
   * Actually make the connection
   */
  connect: (url: string) => void;

  /**
   * Check if WS is connected
   * This should query the actual connection status
   * connection.readyState === connection.OPEN
   */
  isConnected: () => boolean;

  sendMessage: (
    data: string,
    options?: {
      retries: number;
      retryTimeout: number;
      retryCount: number;
    }
  ) => void;
  listen: (
    onMessage: (
      data:
        | RelayAuth
        | RelayCount
        | RelayEose
        | RelayEvent
        | RelayNotice
        | RelayOK
    ) => void
  ) => void;
  disconnect: () => void;
}

export interface WebSocketClientConfig {
  id?: string;
  url: string;
  info?: RelayInformationDocument;
}

export interface WebSocketClientInfo extends WebSocketClientConfig {
  id: string;
  url: string;
}

export interface WebSocketClientConnection extends WebSocketClientConfig {
  id: string;
  url: string;
  ws?: WebSocketClientBase;

  isEnabled: boolean;
}
