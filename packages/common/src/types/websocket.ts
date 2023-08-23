import { Relay } from "./relay";
import { RelayInformationDocument } from "./relay-information";
import {
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
} from "./relay-message";

export interface WebSocketEvent {
  data: RelayAuth | RelayCount | RelayEose | RelayEvent | RelayNotice | RelayOK;
  meta: WebSocketClientConfig;
}

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

export interface WebSocketClientConfig extends Relay {
  id?: string;
  url: string;
  read: boolean;
  write: boolean;
  info?: RelayInformationDocument;
}

export interface WebSocketClientInfo extends WebSocketClientConfig {
  id: string;
  url: string;
  /**
   * Undefined or 0 means no PoW required
   * This is a manual overwrite if the relay has a POW requirement but doesn't publish it
   */
  powRequired?: number;
  isReady: boolean;
}

export interface WebSocketClientConnection extends WebSocketClientConfig {
  id: string;
  url: string;
  ws?: WebSocketClientBase;

  isEnabled: boolean;
}
