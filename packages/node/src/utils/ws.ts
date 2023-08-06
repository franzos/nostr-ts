import { WebSocket, CloseEvent, MessageEvent, ErrorEvent } from "ws";
import {
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  WebSocketClientBase,
} from "@nostr-ts/common";

export class WebSocketClient implements WebSocketClientBase {
  connection: WebSocket;
  error: {
    error: any;
    message: string;
    type: string;
  } | null;

  constructor() {}

  connect(url: string) {
    this.connection = new WebSocket(url);

    this.connection.onopen = () => {
      console.log(`Websocket connected to ${url}`);
    };
    this.connection.onclose = (event: CloseEvent) => {
      console.log(
        `WebSocket disconnected from ${url}`,
        event.code,
        event.reason
      );
    };
    this.connection.onerror = (event: ErrorEvent) => {
      console.log(`WebSocket error: ${event.message}`);
      this.error = {
        error: event.error,
        message: event.message,
        type: event.type,
      };
    };
  }

  isConnected() {
    return (
      this.connection && this.connection.readyState === this.connection.OPEN
    );
  }

  sendMessage(
    data: string,
    options?: {
      retries: number;
      retryTimeout: number;
      retryCount: number;
    }
  ) {
    // Wait until the connection is open
    const opts = options
      ? options
      : { retries: 10, retryTimeout: 100, retryCount: 0 };

    if (!this.isConnected()) {
      const count = opts.retryCount + 1;
      if (count === 10) {
        throw new Error(`Could not send message after ${count} retries`);
      }
      setTimeout(() => this.sendMessage(data, opts), 100);
    } else {
      this.connection.send(data);
    }
  }

  listen(
    onMessage: (
      data:
        | RelayAuth
        | RelayCount
        | RelayEose
        | RelayEvent
        | RelayNotice
        | RelayOK
    ) => void
  ) {
    this.connection.onmessage = (event: MessageEvent) => {
      onMessage(JSON.parse(event.data as string));
    };
  }

  disconnect() {
    this.connection.close();
  }
}
