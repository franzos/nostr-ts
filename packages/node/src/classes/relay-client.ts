import {
  RelayClientBase,
  WebSocketClientInfo,
  DiscoveredRelay,
} from "@nostr-ts/common";
import { WebSocketClient } from "../utils/ws";
import { getRelayInformationDocument } from "../utils/relay-information";

/**
 * The RelayClient is responsible for connecting to relays
 */
export class RelayClient extends RelayClientBase {
  constructor(urls?: string[]) {
    super(urls);
    if (urls) {
      this.connectClients();
    }
  }

  /**
   * Initiates the connection to all relays
   */
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

  /**
   * If you use RelayDiscovery, you can use this method to load the discovered relays manually
   * 1. Load relays
   * 2. Run getRelayInformation
   */
  public loadFromDiscovered(relays: DiscoveredRelay[]) {
    this.addInitialClients(relays.flatMap((r) => r.url));
    this.connectClients();
  }

  /**
   * Get information about all active relays
   * You should run this, after initializng RelayClient
   *
   * Without this information:
   * - You won't be able to send messages with special properties (NIP) to relays
   * - You won't know which relays are active, their limits, and whether they require payment
   * @returns
   */
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
