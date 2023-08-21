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
  Relay,
  Subscribe,
  SubscriptionOptions,
  WebSocketClientConfig,
  WebSocketEvent,
} from "../types/index";
import { RelayConnection } from "./relay-connection";

export class RelayClientBase {
  public relays: RelayConnection[] = [];

  constructor(seedRelays?: Relay[]) {
    this.addInitialRelays(seedRelays);
  }

  /**
   * Only to be used if you want to initialize Relay Client manually
   */
  public addInitialRelays(seedRelays?: Relay[]) {
    if (seedRelays && (!this.relays || this.relays.length === 0)) {
      for (const relay of seedRelays) {
        this.relays.push(new RelayConnection(relay));
      }
    }
  }

  private sendSubscribe(
    message: ClientRequest | ClientCount,
    subscriptionId: string,
    options?: SubscriptionOptions
  ) {
    const data = JSON.stringify([
      message.type,
      message.subscriptionId,
      message.filters,
    ]);

    const newSubscriptions: ClientSubscription[] = [];

    for (const relay of this.relays) {
      if (relay.isEnabled && relay.read) {
        if (message.type === CLIENT_MESSAGE_TYPE.COUNT) {
          const nips = relay.info?.supported_nips;
          if (nips && !nips.includes(45)) {
            console.warn(`Relay ${relay.id} does not support count command.`);
            continue;
          }
        }

        try {
          relay.ws.sendMessage(data);
          const sub = {
            url: relay.url,
            connectionId: relay.id,
            subscriptionId,
            type: message.type,
            filters: message.filters,
            options: {
              timeoutAt: options?.timeoutAt,
              timeout: options?.timeout,
              view: options?.view,
            },
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
    const subscriptionId = payload?.subscriptionId || uuidv4();
    const filters = payload?.filters ? payload.filters.toJson() : {};

    console.log("=> Subscribing to events", payload, subscriptionId);

    const message: ClientRequest = {
      type: CLIENT_MESSAGE_TYPE.REQ,
      subscriptionId,
      filters,
    };

    return this.sendSubscribe(message, subscriptionId, payload?.options);
  }

  count(payload?: Count) {
    const subscriptionId = payload?.subscriptionId || uuidv4();
    const filters = payload?.filters ? payload.filters.toJson() : {};

    const message: ClientCount = {
      type: CLIENT_MESSAGE_TYPE.COUNT,
      subscriptionId,
      filters,
    };

    const subscriptions = this.sendSubscribe(
      message,
      subscriptionId,
      payload?.options
    );

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
        const subscription = relay.getSubscription(subscriptionId);
        if (subscription) {
          if (subscription.options && subscription.options.timeout) {
            clearTimeout(subscription.options.timeout);
          }
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
   * Send an event to the relay network
   * @param event
   */
  sendEvent(event: NEvent, relayIds?: string[]) {
    const message: ClientEvent = {
      type: CLIENT_MESSAGE_TYPE.EVENT,
      data: event,
    };
    const data = JSON.stringify([message.type, message.data]);

    const send: {
      eventId: string;
      relay: WebSocketClientConfig;
      error: string | null;
    }[] = [];

    const selectedRelays = relayIds
      ? this.relays.filter((r) => relayIds.includes(r.id))
      : this.relays;
    const enabledRelays = selectedRelays.filter((r) => r.isEnabled && r.write);

    if (enabledRelays.length === 0) {
      console.log("No relays enabled, not sending event", event);
      return;
    }

    console.log(
      `Sending event ${event.id} to ${enabledRelays.length} relays`,
      event
    );

    for (const relay of enabledRelays) {
      if (relay.isEnabled) {
        if (relay.supportsEvent(event)) {
          relay.ws.sendMessage(data);

          relay.addCommand({
            connectionId: relay.id,
            eventId: event.id,
            request: message,
          });

          send.push({
            eventId: event.id,
            relay: relay.getInfo("default"),
            error: null,
          });

          console.log(`Sent event to ${relay.url}`, message);
        } else {
          console.log(
            `Event ${event.id} not published to ${relay.url} because not all needed NIPS are supported`,
            message
          );

          send.push({
            eventId: event.id,
            relay: relay.getInfo("withInfo"),
            error: `Event ${event.id} not published to ${relay.url} because not all needed NIPS are supported`,
          });
        }
      }
    }

    if (send.length === 0) {
      return;
    }

    return send;
  }

  /**
   * Listen to relay events
   * Important: You need to subscribe to receive events
   * @param onMessage
   */
  listen(onMessage: (payload: WebSocketEvent) => void) {
    for (const relay of this.relays) {
      if (relay.isEnabled) {
        relay.ws.listen((data) => {
          // TODO: Kinda duplicates event queue
          relay.updateCommandFromRelayMessage({
            data,
          });
          onMessage({
            data: data,
            meta: relay.getInfo("default"),
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
