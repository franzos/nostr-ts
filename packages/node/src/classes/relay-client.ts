import {
  RelayClientBase,
  WebSocketClientInfo,
  DiscoveredRelay,
  Relay,
} from "@nostr-ts/common";
import { WebSocketClient } from "../utils/ws";
import { getRelayInformationDocument } from "../utils/relay-information";

/**
 * The RelayClient is responsible for connecting to relays
 */
export class RelayClient extends RelayClientBase {
  constructor(
    initRelays?: Relay[],
    options?: {
      /**
       * If you want to connect to relays manually, set this to true
       * then use connectRelays
       */
      connectManually?: boolean;
    }
  ) {
    super(initRelays);
    if (
      (!options && initRelays) ||
      (initRelays && options.connectManually !== true)
    ) {
      this.connectRelays();
    }
  }

  /**
   * Initiates the connection to all relays
   */
  public connectRelays() {
    console.log(`=> Connecting to ${this.relays.length} relay(s) ...`);
    for (const relay of this.relays) {
      if (!relay.isConnected()) {
        console.log(`=> Connecting to ${relay.url} ...`);
        try {
          relay.ws = new WebSocketClient();
          relay.ws.connect(relay.url);
          relay.ws.connection.onopen = () => {
            `Websocket ID ${relay.id} connected to ${relay.url}`;
          };
          relay.ws.connection.onclose = (event: Event) => {
            console.log(`WebSocket ID ${relay.id} error: `, event);
          };
          relay.ws.connection.onerror = (event: CloseEvent) => {
            console.log(
              `WebSocket ID ${relay.id} disconnected from ${relay.url}`,
              event.code,
              event.reason
            );
          };
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
    this.addInitialRelays(
      relays.flatMap((r) => {
        return {
          url: r.url,
          read: true,
          write: true,
        };
      })
    );
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
