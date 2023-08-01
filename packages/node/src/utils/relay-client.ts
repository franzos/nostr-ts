import { RelayClientBase } from "@nostr-ts/common";
import { WebSocketClient } from "./ws";
import { getRelayInformationDocument } from "./relay-information";
import { WebSocketClientInfo } from "@nostr-ts/common";

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

  public async getRelayInformation(): Promise<WebSocketClientInfo[]> {
    const info: WebSocketClientInfo[] = [];
    for (const client of this.clients) {
      if (!client.info) {
        try {
          client.info = await getRelayInformationDocument(client.url);
          console.log(`Relay ${client.url} information`, client.info);
          info.push({
            id: client.id,
            url: client.url,
            info: client.info,
          });
        } catch (e) {
          console.error("Error getting relay information", e);
        }
      }
    }
    return info;
  }
}
