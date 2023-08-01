import { RelayClientBase } from "@nostr-ts/common";
import { WebSocketClient } from "./ws";

export class RelayClient extends RelayClientBase {
  constructor(urls: string[]) {
    super(urls);
    this.connectClients();
  }

  private connectClients() {
    for (const client of this.clients) {
      if (!client.connection) {
        try {
          client.connection = new WebSocketClient(client);
        } catch (e) {
          console.error("Error connecting to relay", e);
        }
      }
    }
  }
}
