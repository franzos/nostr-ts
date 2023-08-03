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
      this.connectRelays();
    }
  }

  /**
   * Initiates the connection to all relays
   */
  private connectRelays() {
    for (const relay of this.relays) {
      if (!relay.isConnected()) {
        try {
          relay.connection = new WebSocketClient(relay);
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
    this.addInitialRelays(relays.flatMap((r) => r.url));
    this.connectRelays();
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
    for (const relay of this.relays) {
      if (!relay.info) {
        try {
          relay.info = await getRelayInformationDocument(relay.url);
          console.log(`Relay ${relay.url} information`, relay.info);
          info.push({
            id: relay.id,
            url: relay.url,
            info: relay.info,
          });
        } catch (e) {
          console.error("Error getting relay information", e);
        }
      }
    }
    return info;
  }
}
