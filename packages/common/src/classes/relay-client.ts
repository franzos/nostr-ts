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

  private relaysForRequest(payloadRelays: string[] | undefined) {
    return payloadRelays && payloadRelays.length > 0
      ? this.relays.filter((r) => payloadRelays.includes(r.url))
      : this.relays;
  }

  private async waitForRelayToBeReady(relay, retryCount = 0): Promise<boolean> {
    if (relay.isReady("read")) {
      return true;
    }
    if (retryCount >= 5) {
      console.warn(
        `Relay ${relay.url} is not ready after 5 retries. Skipping...`
      );

      console.log(
        `RELAY CLIENT: Relay ${relay.url} is not ready. Skipping... (${retryCount})`
      );
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    return this.waitForRelayToBeReady(relay, retryCount + 1);
  }

  /**
   * Subscribe to receive events
   * Use filters to specify which events you want to receive
   * @param payload
   * @returns
   */

  subscribe(
    request: CountRequest | AuthRequest | EventsRequest | CloseRequest,
    retryCount = 0
  ): RelaySubscription[] {
    // Filter relays if specified
    const relays = this.relaysForRequest(request.relayUrls);

    const newSubscriptions: RelaySubscription[] = [];

    /**
     * Track number of relays that are not ready or have errors
     */
    let notReadyOrError = 0;
    for (const relay of relays) {
      this.waitForRelayToBeReady(relay).then((isReady) => {
        if (!isReady) {
          return;
        }

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
          /**
           * Request events
           */
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
          /**
           * Count events
           */
          const nips = relay.info?.supported_nips;
          if (nips && !nips.includes(45)) {
            console.warn(`Relay ${relay.url} does not support count command.`);
            subscription.error = `Relay ${relay.url} does not support count command.`;
            return;
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
          /**
           * Authenticate
           */
          message = {
            type: CLIENT_MESSAGE_TYPE.AUTH,
            signedEvent: request.signedEvent,
          };
          data = JSON.stringify([message.type, message.signedEvent]);
        } else {
          throw new Error(`Invalid subscription type: ${request.type}`);
        }

        try {
          relay.ws.sendMessage(data);
          relay.addSubscription(subscription);

          /**
           * Set timeout if specified
           */
          if (request.type === CLIENT_MESSAGE_TYPE.REQ && request.options) {
            const timeoutIn = request.options.timeoutIn;
            if (timeoutIn) {
              subscription.options = {
                ...request.options,
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
          notReadyOrError++;
        }
      });
    }

    return newSubscriptions;
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

  getSubscriptions(options?: {
    isActive?: boolean;
  }): RelaySubscription[] | undefined {
    return this.relays.map((relay) => relay.getSubscriptions(options)).flat();
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

    // Use provided relay, or all relays
    const relays = this.relaysForRequest(payload.relayUrls);
    console.log("RELAY CLIENT: Sending event", message.data, relays);

    const published: PublishingQueueItem[] = [];
    const data = JSON.stringify([message.type, message.data]);

    for (const relay of relays) {
      const { relayUrls, ...restOfRequest } = payload;

      const publish = {
        id: nanoid(),
        ...restOfRequest,
        relayUrl: relay.url,
        send: true,
        error: undefined,
      };

      const writeEnabled = relay.isReady("write");
      const supportsEvent = relay.supportsEvent(payload.event);
      if (!writeEnabled || !supportsEvent) {
        const errorMsg = !writeEnabled
          ? `Relay ${relay.url} is not ready for write operations. Skipping...`
          : `Event ${payload.event.id} was not published because not all needed NIPS are supported`;
        publish.send = false;
        publish.error = errorMsg;

        published.push(publish);
        continue;
      }

      console.log(
        `RELAY CLIENT: Sending event ${payload.event.id} to ${relay.url}.`,
        data
      );

      relay.ws.sendMessage(data);
      published.push(publish);
    }

    return published.length > 0 ? published : undefined;
  }

  /**
   * These should relate to the same event
   */
  sendQueueItems(items: PublishingQueueItem[]) {
    // TODO: Add checks to make sure all items relate to the same event
    const message = {
      type: CLIENT_MESSAGE_TYPE.EVENT,
      data: items.find((i) => i.event)?.event,
    };
    const data = JSON.stringify([message.type, message.data]);

    for (const item of items) {
      const relay = this.relays.find((r) => r.url === item.relayUrl);
      if (relay) {
        console.log(
          `Sending queued event ${item.event.id} to ${relay.url}.`,
          data
        );
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
