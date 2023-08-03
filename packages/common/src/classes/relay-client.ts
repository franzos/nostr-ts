import { NEvent } from "./event.js";
import {
  CLIENT_MESSAGE_TYPE,
  ClientClose,
  ClientCommands,
  ClientCount,
  ClientEvent,
  ClientRequest,
  ClientSubscription,
  Count,
  RELAY_MESSAGE_TYPE,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayNotice,
  RelayOK,
  Subscribe,
  WebSocketClientConfig,
  WebSocketClientConnection,
} from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

export class RelayClientBase {
  public clients: WebSocketClientConnection[] = [];
  private subscriptions: ClientSubscription[] = [];

  public commands: ClientCommands[] = [];

  constructor(urls?: string[]) {
    this.addInitialClients(urls);
  }

  /**
   * Only to be used if you want to initialize Relay Client manually
   */
  public addInitialClients(urls?: string[]) {
    if (urls && (!this.clients || this.clients.length === 0)) {
      for (const url of urls) {
        this.clients.push({
          id: uuidv4(),
          url,
        });
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

    for (const relay of this.clients) {
      if (relay.connection) {
        relay.connection.sendMessage(data);
        newSubscriptions.push({
          url: relay.url,
          connectionId: relay.id,
          subscriptionId,
        });
      }
    }
    this.subscriptions.push(...newSubscriptions);
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
      const command: ClientCommands = {
        connectionId: sub.connectionId,
        subscriptionId: sub.subscriptionId,
        request: message,
      };
      this.commands.push(command);
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

    if (relayId) {
      const relay = this.clients.find((client) => client.id === relayId);
      if (relay && relay.connection) {
        relay.connection.sendMessage(data);
        this.subscriptions = this.subscriptions.filter(
          (sub) =>
            sub.connectionId !== relayId &&
            sub.subscriptionId !== subscriptionId
        );
      }
    } else {
      for (const relay of this.clients) {
        if (relay.connection) {
          relay.connection.sendMessage(data);
          this.subscriptions = this.subscriptions.filter(
            (sub) =>
              sub.connectionId !== relayId &&
              sub.subscriptionId !== subscriptionId
          );
        }
      }
    }
  }

  /**
   * Send an event to the relay
   * @param event
   */
  sendEvent(event: NEvent) {
    const message: ClientEvent = {
      type: CLIENT_MESSAGE_TYPE.EVENT,
      data: event,
    };
    const data = JSON.stringify([message.type, message.data]);

    let sent = false;

    for (const relay of this.clients) {
      if (relay.connection) {
        // TODO: CLeanuo logs
        const valid = event.isReadyToPublish();
        if (!valid.isReady) {
          throw new Error(
            `Event ${event.id} not published because it is not ready. Reason: ${valid.reason}.`
          );
        }
        const neededNips = event.determineRequiredNIP();
        console.log(`Required NIP: ${neededNips.join(", ")}`);
        const supportedNips = relay.info?.supported_nips || [];
        console.log(`Supported NIP: ${supportedNips.join(", ")}`);

        const allNipsSupported = neededNips.every((nip) =>
          supportedNips.includes(nip)
        );

        if (allNipsSupported) {
          relay.connection.sendMessage(data);

          const command: ClientCommands = {
            connectionId: relay.id,
            eventId: event.id,
            request: message,
          };
          this.commands.push(command);

          console.log(`Sent event to ${relay.url}`, message);
          sent = true;
        } else {
          console.log(
            `Event ${event.id} not published to ${relay.url} because not all needed NIPS are supported`,
            message
          );
        }
      }
    }

    if (!sent) {
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
    for (const relay of this.clients) {
      if (relay.connection) {
        relay.connection.listen((payload) => {
          /**
           * At this stage we match received events to expected states (published event, count, ...)
           */
          if (payload.data[0] === RELAY_MESSAGE_TYPE.COUNT) {
            const index = this.commands.findIndex(
              (cmd) =>
                cmd.connectionId === relay.id &&
                cmd.subscriptionId === (payload.data as RelayCount)[1]
            );
            if (index > 0) {
              this.commands[index].response = payload.data[2];
              this.commands[index].success = true;
            }
          } else if (payload.data[0] === RELAY_MESSAGE_TYPE.NOTICE) {
            const index = this.commands.findIndex(
              // TODO: This is not exact. How do we know what the notice is related to?
              (cmd) => cmd.connectionId === relay.id && cmd.eventId
            );
            if (index > 0) {
              this.commands[index].response = payload.data[1];
            }
          } else if (payload.data[0] === RELAY_MESSAGE_TYPE.OK) {
            const index = this.commands.findIndex(
              (cmd) =>
                cmd.connectionId === relay.id &&
                cmd.eventId === (payload.data as RelayOK)[1]
            );
            if (index > 0) {
              this.commands[index].response = payload.data[3];
              this.commands[index].success = payload.data[2];
            }
          }
          onMessage(payload);
        });
      }
    }
  }

  closeConnection() {
    const completedCommands = this.commands.filter(
      (cmd) => cmd.response !== null
    );
    console.log(
      `Completed ${completedCommands.length}/${this.commands.length} commands ...`
    );
    const activeSubscriptions = this.subscriptions.filter(
      (sub) => sub.subscriptionId
    );
    console.log(
      `-> Cancelling ${activeSubscriptions.length} active subscriptions ...`
    );
    this.subscriptions.forEach((sub) => this.unsubscribe(sub.subscriptionId));
    const activeConnections = this.clients.filter(
      (client) => client.connection
    );
    console.log(
      `-> Closing ${activeConnections.length} active connections ...`
    );
    this.clients.forEach((client) => client.connection?.closeConnection());
  }
}
