import { nanoid } from "nanoid";
import {
  AuthRequest,
  CLIENT_MESSAGE_TYPE,
  ClientAuth,
  ClientClose,
  ClientCount,
  ClientEvent,
  ClientRequest,
  CloseRequest,
  CountRequest,
  EventsRequest,
  PublishingQueueItem,
  PublishingRequest,
  RELAY_MESSAGE_TYPE,
  Relay,
  RelaySubscription,
  WebSocketEvent,
} from "../types/index";
import { RelayConnection } from "./relay-connection";

export class RelayClientBase {
  public relays: RelayConnection[] = [];

  options?: {
    /**
     * Use websocket with self-signed cert for development (disable verification)
     */
    rejectUnauthorized?: boolean;
  };

  constructor(initRelays?: Relay[]) {
    this.addInitialRelays(initRelays);
  }

  /**
   * Only to be used if you want to initialize Relay Client manually
   */
  public addInitialRelays(initRelays?: Relay[]) {
    if (initRelays && (!this.relays || this.relays.length === 0)) {
      for (const relay of initRelays) {
        this.relays.push(new RelayConnection(relay));
      }
    }
  }

  private sendSubscribe(
    request: CountRequest | AuthRequest | EventsRequest | CloseRequest
  ): RelaySubscription[] {
    const newSubscriptions: RelaySubscription[] = [];

    // Filter relays if specified
    const relays =
      request?.relayUrls?.length > 0
        ? this.relays.filter((r) => request.relayUrls.includes(r.url))
        : this.relays;

    // Always read since we are not posting anything
    const opt = "read";
    for (const relay of relays) {
      if (relay.isReady(opt)) {
        const { relayUrls, ...restOfRequest } = request;
        const subscription: RelaySubscription = {
          ...restOfRequest,
          id: nanoid(),
          relayUrl: relay.url,
          created: Date.now(),
          isActive: true,
        };

        let data;
        let message: ClientRequest | ClientCount | ClientAuth;

        if (request.type === CLIENT_MESSAGE_TYPE.REQ) {
          message = {
            type: CLIENT_MESSAGE_TYPE.REQ,
            subscriptionId: subscription.id,
            filters: JSON.parse(JSON.stringify(subscription.filters)),
          };
          data = JSON.stringify([
            message.type,
            message.subscriptionId,
            message.filters,
          ]);
        } else if (request.type === CLIENT_MESSAGE_TYPE.COUNT) {
          const nips = relay.info?.supported_nips;
          if (nips && !nips.includes(45)) {
            console.warn(`Relay ${relay.url} does not support count command.`);
            subscription.error = `Relay ${relay.url} does not support count command.`;
            continue;
          }
          message = {
            type: CLIENT_MESSAGE_TYPE.COUNT,
            subscriptionId: subscription.id,
            filters: JSON.parse(JSON.stringify(subscription.filters)),
          };
          data = JSON.stringify([
            message.type,
            message.subscriptionId,
            message.filters,
          ]);
        } else if (request.type === CLIENT_MESSAGE_TYPE.AUTH) {
          message = {
            type: CLIENT_MESSAGE_TYPE.AUTH,
            signedEvent: request.signedEvent,
          };
          data = JSON.stringify([message.type, message.signedEvent]);
        } else {
          throw new Error("Invalid subscription type.");
        }

        try {
          relay.ws.sendMessage(data);
          relay.addSubscription(subscription);

          if (request.type === CLIENT_MESSAGE_TYPE.REQ && request.options) {
            const timeoutIn = request.options.timeoutIn;
            if (timeoutIn) {
              subscription.options = {
                view:
                  request.options && request.options.view
                    ? request.options.view
                    : "",
                timeoutIn,
                timeoutAt: Date.now() + timeoutIn,
                timeout: setTimeout(() => {
                  this.unsubscribe([subscription.id]);
                }, timeoutIn),
              };
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        console.warn(
          `Relay ${relay.url} is not ready for ${opt} operations. Skipping...`
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

  subscribe(
    payload: CountRequest | AuthRequest | EventsRequest | CloseRequest
  ): RelaySubscription[] {
    return this.sendSubscribe(payload);
  }

  /**
   * @deprecated
   */
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
   * @param relayUrl: if unsubscribing from a specific relay
   */
  unsubscribe(subscriptionIds: string[]) {
    for (const relay of this.relays) {
      if (!relay.isConnected()) {
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
    this.relays.map((relay) => {
      const subs = relay.getSubscriptions();
      if (subs && subs.length > 0) {
        this.unsubscribe(subs.map((s) => s.id));
      }
    });
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
    this.relays.map((relay) => {
      if (relay.url === sub.relayUrl) {
        relay.updateSubscription(sub);
      }
    });
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

  getAuthChallenge(relayUrls: string[]) {
    const relays = this.relays.filter((r) => relayUrls.includes(r.url));
    return relays.map((r) => {
      return {
        relayUrl: r.url,
        challenge: r.authChallenge,
      };
    });
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
    const relays = payload.relayUrls
      ? this.relays.filter((r) => payload.relayUrls.includes(r.url))
      : this.relays;

    for (const relay of relays) {
      if (relay.isReady("write")) {
        const { relayUrls, ...restOfRequest } = payload;

        const publish = {
          id: nanoid(),
          ...restOfRequest,
          relayUrl: relay.url,
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
          `Relay ${relay.url} is not ready for write operations. Skipping...`
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

    for (const item of items) {
      const relay = this.relays.find((r) => r.url === item.relayUrl);
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
          if (data[0] === RELAY_MESSAGE_TYPE.AUTH) {
            console.log(
              `Received auth challenge ${data[1]} from ${relay.url}.`
            );
            relay.authChallenge = data[1];
          }
          onMessage({
            data: data,
            meta: relay.getInfo("default"),
          });
        });
      }
    }
  }

  disconnect() {
    this.unsubscribeAll();

    setTimeout(() => {
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
      this.relays = [];
    }, 1000);
  }
}
