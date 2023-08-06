import { v4 as uuidv4 } from "uuid";
import { NEvent } from "./event";
import {
  CLIENT_MESSAGE_TYPE,
  ClientClose,
  ClientCount,
  ClientEvent,
  ClientRequest,
  ClientSubscription,
  Count,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  Subscribe,
  WebSocketClientConfig,
} from "../types/index";
import { RelayConnection } from "./relay-connection";

export class RelayClientBase {
  public relays: RelayConnection[] = [];

  constructor(urls?: string[]) {
    this.addInitialRelays(urls);
  }

  /**
   * Only to be used if you want to initialize Relay Client manually
   */
  public addInitialRelays(urls?: string[]) {
    if (urls && (!this.relays || this.relays.length === 0)) {
      for (const url of urls) {
        this.relays.push(new RelayConnection({ url }));
      }
    }
  }

  private sendSubscribe(
    message: ClientRequest | ClientCount,
    subscriptionId: string
  ) {
    const data = JSON.stringify([
      message.type,
      message.subscriptionId,
      message.filters,
    ]);

    const newSubscriptions: ClientSubscription[] = [];

    for (const relay of this.relays) {
      if (relay.isEnabled) {
        try {
          relay.ws.sendMessage(data);
          const sub = {
            url: relay.url,
            connectionId: relay.id,
            subscriptionId,
            type: message.type,
            filters: message.filters,
          };
          relay.addSubscription(sub);
          newSubscriptions.push(sub);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return newSubscriptions;
  }

  /**
   * Subscribe to receive events
   * Use filters to specify which events you want to receive
   * @param payload
   * @returns
   */
  subscribe(payload?: Subscribe): ClientSubscription[] {
    console.log("=> Subscribing to events", payload);
    const subscriptionId = payload?.subscriptionId || uuidv4();
    const filters = payload?.filters ? payload.filters.toJson() : {};

    const message: ClientRequest = {
      type: CLIENT_MESSAGE_TYPE.REQ,
      subscriptionId,
      filters,
    };

    return this.sendSubscribe(message, subscriptionId);
  }

  count(payload?: Count) {
    const subscriptionId = payload?.subscriptionId || uuidv4();
    const filters = payload?.filters ? payload.filters.toJson() : {};

    const message: ClientCount = {
      type: CLIENT_MESSAGE_TYPE.COUNT,
      subscriptionId,
      filters,
    };

    const subscriptions = this.sendSubscribe(message, subscriptionId);

    for (const sub of subscriptions) {
      const relay = this.relays.find((r) => r.id === sub.connectionId);
      if (relay) {
        relay.addCommand({
          connectionId: sub.connectionId,
          subscriptionId: sub.subscriptionId,
          request: message,
        });
      }
    }

    return subscriptions;
  }

  /**
   * Unsubscribe from receiving events
   * @param subscriptionId
   * @param relayId: if unsubscribing from a specific relay
   */
  unsubscribe(subscriptionId: string, relayId?: string) {
    const message: ClientClose = {
      type: CLIENT_MESSAGE_TYPE.CLOSE,
      subscriptionId,
    };
    const data = JSON.stringify([message.type, message.subscriptionId]);

    for (const relay of this.relays) {
      if (!relay.isEnabled) {
        continue;
      }

      if ((relayId && relay.id === relayId) || !relayId) {
        // Relay ID given and matches
        // No relay ID given, remove from all relays
        const hasSubscription = relay.hasSubscription(subscriptionId);
        if (hasSubscription) {
          try {
            relay.ws.sendMessage(data);
            relay.removeSubscription(subscriptionId);
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
  }

  unsubscribeAll() {
    for (const relay of this.relays) {
      if (relay.isConnected()) {
        continue;
      }

      const subscriptions = relay.subscriptions.map(
        (sub) => sub.subscriptionId
      );

      for (const subscriptionId of subscriptions) {
        this.unsubscribe(subscriptionId, relay.id);
      }
    }
  }

  getSubscriptions() {
    const subscriptions: ClientSubscription[] = [];
    for (const relay of this.relays) {
      subscriptions.push(...relay.subscriptions);
    }
    return subscriptions;
  }

  countSubscriptions() {
    let total = 0;
    for (const relay of this.relays) {
      total += relay.subscriptions.length;
    }
    return total;
  }

  countConnections() {
    let total = 0;
    for (const relay of this.relays) {
      if (relay.isConnected()) {
        total++;
      }
    }
    return total;
  }

  countCommands(): {
    total: number;
    completed: number;
  } {
    let total = 0;
    let completed = 0;
    for (const relay of this.relays) {
      total += relay.commands.length;
      completed += relay.commands.filter((c) => c.response !== null).length;
    }
    return {
      total,
      completed,
    };
  }

  /**
   * Send an event to the relay
   * @param event
   */
  sendEvent(event: NEvent) {
    event.isReadyToPublishOrThrow();

    const message: ClientEvent = {
      type: CLIENT_MESSAGE_TYPE.EVENT,
      data: event,
    };
    const data = JSON.stringify([message.type, message.data]);

    let isSent = false;

    for (const relay of this.relays) {
      if (relay.isEnabled) {
        if (relay.supportsEvent(event)) {
          relay.ws.sendMessage(data);

          relay.addCommand({
            connectionId: relay.id,
            eventId: event.id,
            request: message,
          });

          console.log(`Sent event to ${relay.url}`, message);
          isSent = true;
        } else {
          console.log(
            `Event ${event.id} not published to ${relay.url} because not all needed NIPS are supported`,
            message
          );
        }
      }
    }

    if (!isSent) {
      console.log(
        `Event ${event.id} not published because no supported relay is available.`
      );
    }
  }

  /**
   * Listen to relay events
   * Important: You need to subscribe to receive events
   * @param onMessage
   */
  listen(
    onMessage: (payload: {
      data:
        | RelayAuth
        | RelayCount
        | RelayEose
        | RelayEvent
        | RelayNotice
        | RelayOK;
      meta: WebSocketClientConfig;
    }) => void
  ) {
    for (const relay of this.relays) {
      if (relay.isEnabled) {
        relay.ws.listen((data) => {
          relay.updateCommandFromRelayMessage({
            data,
          });
          onMessage({
            data: data,
            meta: {
              id: relay.id,
              url: relay.url,
              info: relay.info,
            },
          });
        });
      }
    }
  }

  disconnect() {
    const { completed, total } = this.countCommands();

    const stats = {
      commands: {
        total,
        completed,
      },
      subscriptions: this.countSubscriptions(),
      connections: this.countConnections(),
    };

    console.log(`
Stats:
- Commands: ${stats.commands.completed}/${stats.commands.total}
- Subscriptions: ${stats.subscriptions}
- Connections: ${stats.connections}
    `);

    for (const relay of this.relays) {
      relay.ws?.disconnect();
    }
  }
}
