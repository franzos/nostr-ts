import { WebSocketClientBase, WebSocketClientConfig } from "@nostr-ts/common";

export class WebSocketClient implements WebSocketClientBase {
  private connection: WebSocket;

  public config: WebSocketClientConfig;

  constructor(conf: WebSocketClientConfig) {
    this.connection = new WebSocket(conf.url);
    this.config = conf;

    this.connection.onopen = () => {
      console.log(
        `Websocket ID ${this.config.id} connected to ${this.config.url}`
      );
    };

    this.connection.onerror = (event: Event) => {
      console.log(`WebSocket ID ${this.config.id} error: `, event);
    };

    this.connection.onclose = (event: CloseEvent) => {
      console.log(
        `WebSocket ID ${this.config.id} disconnected from ${this.config.url}`,
        event.code,
        event.reason
      );
    };
  }

  sendMessage(data: string) {
    // Wait until the connection is open
    if (this.connection.readyState !== this.connection.OPEN) {
      setTimeout(() => this.sendMessage(data), 100);
    } else {
      this.connection.send(data);
    }
  }

  listen(
    onMessage: (payload: { data: any; meta: WebSocketClientConfig }) => void
  ) {
    this.connection.onmessage = (event: MessageEvent) => {
      onMessage({
        data: JSON.parse(event.data),
        meta: this.config,
      });
    };
  }

  closeConnection() {
    this.connection.close();
  }
}
