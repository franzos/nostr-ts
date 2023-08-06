import {
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  WebSocketClientBase,
  WebSocketClientConfig,
} from "@nostr-ts/common";

export class WebSocketClient implements WebSocketClientBase {
  connection: WebSocket;
  error: {
    error: any;
    message: string;
    type: string;
  } | null;

  public config: WebSocketClientConfig;

  constructor() {}

  connect(url: string) {
    this.connection = new WebSocket(url);
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
      onMessage(JSON.parse(event.data));
    };
  }

  disconnect() {
    this.connection.close();
  }
}
