import { v4 as uuidv4 } from "uuid";
import {
  CLIENT_MESSAGE_TYPE,
  ClientClose,
  ClientCount,
  ClientEvent,
  ClientRequest,
  CountRequest,
  PublishingQueueItem,
  PublishingRequest,
  Relay,
  RelaySubscription,
  SubscriptionRequest,
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

  private sendSubscribe(request: SubscriptionRequest): RelaySubscription[] {
    const newSubscriptions: RelaySubscription[] = [];
    const relays = request?.relayIds
      ? this.relays.filter((r) => request.relayIds.includes(r.id))
      : this.relays;

    // Always read since we are not posting anything
    const opt = "read";
    for (const relay of relays) {
      if (relay.isReady(opt)) {
        const { relayIds, ...restOfRequest } = request;
        const subscription: RelaySubscription = {
          ...restOfRequest,
          id: uuidv4(),
          relayId: relay.id,
          connectionId: relay.id,
          created: Date.now(),
          isActive: true,
        };

        let message: ClientRequest | ClientCount;

        if (request.type === CLIENT_MESSAGE_TYPE.REQ) {
          message = {
            type: CLIENT_MESSAGE_TYPE.REQ,
            subscriptionId: subscription.id,
            filters: JSON.parse(JSON.stringify(subscription.filters)),
          };
        } else if (request.type === CLIENT_MESSAGE_TYPE.COUNT) {
          const nips = relay.info?.supported_nips;
          if (nips && !nips.includes(45)) {
            console.warn(`Relay ${relay.id} does not support count command.`);
            subscription.error = `Relay ${relay.id} does not support count command.`;
            continue;
          }
          message = {
            type: CLIENT_MESSAGE_TYPE.COUNT,
            subscriptionId: subscription.id,
            filters: JSON.parse(JSON.stringify(subscription.filters)),
          };
        } else {
          throw new Error("Invalid subscription type.");
        }

        const data = JSON.stringify([
          message.type,
          message.subscriptionId,
          message.filters,
        ]);

        try {
          relay.ws.sendMessage(data);
          relay.addSubscription(subscription);
        } catch (e) {
          console.error(e);
        }
      } else {
        console.warn(
          `Relay ${relay.id} is not ready for ${opt} operations. Skipping...`
        );
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

  subscribe(payload: SubscriptionRequest): RelaySubscription[] {
    if (payload.type !== CLIENT_MESSAGE_TYPE.REQ) {
      throw new Error("Invalid subscription type. Expected REQ.");
    }

    return this.sendSubscribe(payload);
  }

  count(payload: CountRequest) {
    if (payload.type !== CLIENT_MESSAGE_TYPE.COUNT) {
      throw new Error("Invalid subscription type. Expected COUNT.");
    }

    const subscriptions = this.sendSubscribe(payload);
    return subscriptions;
  }

  /**
   * Unsubscribe from receiving events
   * @param subscriptionId
   * @param relayId: if unsubscribing from a specific relay
   */
  unsubscribe(subscriptionIds: string[]) {
    for (const relay of this.relays) {
      if (!relay.isReady("read")) {
        continue;
      }

      const subs = relay.getSubscriptions();
      if (!subs || subs.length === 0) {
        continue;
      }

      const filtered = subs.filter((s) => subscriptionIds.includes(s.id));

      for (const sub of filtered) {
        const message: ClientClose = {
          type: CLIENT_MESSAGE_TYPE.CLOSE,
          subscriptionId: sub.id,
        };

        if (sub.options && sub.options.timeout) {
          clearTimeout(sub.options.timeout);
        }
        try {
          relay.ws.sendMessage(
            JSON.stringify([message.type, message.subscriptionId])
          );
          relay.removeSubscription(sub.id);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  unsubscribeAll() {
    for (const relay of this.relays) {
      if (relay.isReady("read")) {
        continue;
      }
      const subs = relay.getSubscriptions();
      if (subs && subs.length > 0) {
        this.unsubscribe(subs.map((s) => s.id));
      }
    }
  }

  getSubscription(id: string): RelaySubscription | undefined {
    for (const relay of this.relays) {
      const sub = relay.getSubscription(id);
      if (sub) {
        return sub;
      }
    }
  }

  getSubscriptions(): RelaySubscription[] | undefined {
    return this.relays.map((relay) => relay.getSubscriptions()).flat();
  }

  countSubscriptions() {
    return this.relays
      .map((relay) => relay.getSubscriptions().length)
      .reduce((a, b) => a + b, 0);
  }

  updateSubscription(sub: RelaySubscription) {
    for (const relay of this.relays) {
      if (relay.id === sub.relayId) {
        relay.updateSubscription(sub);
      }
    }
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

  /**
   * Send an event to the relay network
   * @param event
   */
  sendEvent(payload: PublishingRequest): PublishingQueueItem[] | undefined {
    const message: ClientEvent = {
      type: CLIENT_MESSAGE_TYPE.EVENT,
      data: payload.event,
    };
    const data = JSON.stringify([message.type, message.data]);

    const published: PublishingQueueItem[] = [];
    const relays = payload.relayIds
      ? this.relays.filter((r) => payload.relayIds.includes(r.id))
      : this.relays;

    for (const relay of relays) {
      if (relay.isReady("write")) {
        const { relayIds, ...restOfRequest } = payload;

        const publish = {
          id: uuidv4(),
          ...restOfRequest,
          relayId: relay.id,
          send: true,
          error: undefined,
        };

        const supportsEvent = relay.supportsEvent(payload.event);
        if (!supportsEvent) {
          console.log(
            `Event ${payload.event.id} not published to ${relay.url} because not all needed NIPS are supported`,
            message
          );
          publish.send = false;
          publish.error = `Event ${payload.event.id} not published to ${relay.url} because not all needed NIPS are supported`;

          published.push(publish);
          continue;
        }

        relay.ws.sendMessage(data);
        published.push(publish);
      } else {
        console.warn(
          `Relay ${relay.id} is not ready for write operations. Skipping...`
        );
      }
    }

    return published.length > 0 ? published : undefined;
  }

  sendQueueItems(items: PublishingQueueItem[]) {
    const message = {
      type: CLIENT_MESSAGE_TYPE.EVENT,
      data: items.find((i) => i.event)?.event,
    };
    const data = JSON.stringify([message.type, message.data]);

    console.log("Sending queue items", items);
    for (const item of items) {
      const relay = this.relays.find((r) => r.id === item.relayId);
      if (relay) {
        relay.ws.sendMessage(data);
        item.send = true;
      }
    }

    return items;
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
          onMessage({
            data: data,
            meta: relay.getInfo("default"),
          });
        });
      }
    }
  }

  disconnect() {
    const stats = {
      subscriptions: this.countSubscriptions(),
      connections: this.countConnections(),
    };

    console.log(`
Stats:
- Subscriptions: ${stats.subscriptions}
- Connections: ${stats.connections}
    `);

    for (const relay of this.relays) {
      relay.ws?.disconnect();
    }
  }
}
