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

  connect(
    url: string,
    options?: {
      rejectUnauthorized?: boolean;
    }
  ) {
    this.connection = new WebSocket(url, {
      rejectUnauthorized: options && options.rejectUnauthorized ? true : false,
    });
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
