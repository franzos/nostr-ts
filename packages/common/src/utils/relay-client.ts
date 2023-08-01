import { NewEvent } from "../classes/event.js";
import {
  CLIENT_MESSAGE_TYPE,
  ClientClose,
  ClientEvent,
  ClientRequest,
  Subscribe,
} from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

export interface WebSocketClientBase {
  config: WebSocketClientConfig;
  sendMessage: (data: string) => void;
  listen: (
    onMessage: (payload: { data: any; meta: WebSocketClientConfig }) => void
  ) => void;
  closeConnection: () => void;
}

export interface WebSocketClientConfig {
  id: string;
  url: string;
}

export interface WebSocketClientConnection extends WebSocketClientConfig {
  id: string;
  url: string;
  connection?: WebSocketClientBase;
}

export interface ClientSubscription {
  url: string;
  connectionId: string;
  subscriptionId: string;
}

export class RelayClientBase {
  public clients: WebSocketClientConnection[] = [];
  private subscriptions: ClientSubscription[] = [];

  constructor(urls: string[]) {
    for (const url of urls) {
      this.clients.push({
        id: uuidv4(),
        url,
      });
    }
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
  sendEvent(event: NewEvent) {
    const message: ClientEvent = {
      type: CLIENT_MESSAGE_TYPE.EVENT,
      data: event,
    };
    const data = JSON.stringify([message.type, message.data]);

    for (const relay of this.clients) {
      if (relay.connection) {
        relay.connection.sendMessage(data);
        console.log(`Sent event to ${relay.url}`, message);
      }
    }
  }

  /**
   * Listen to relay events
   * Important: You need to subscribe to receive events
   * @param onMessage
   */
  listen(
    onMessage: (payload: { data: any; meta: WebSocketClientConfig }) => void
  ) {
    for (const relay of this.clients) {
      if (relay.connection) {
        relay.connection.listen(onMessage);
      }
    }
  }

  closeConnection() {
    const activeSubscriptions = this.subscriptions.filter(
      (sub) => sub.subscriptionId
    );
    console.log(
      `Closing ${activeSubscriptions.length} active subscriptions ...`
    );
    this.subscriptions.forEach((sub) => this.unsubscribe(sub.subscriptionId));
    const activeConnections = this.clients.filter(
      (client) => client.connection
    );
    console.log(`Closing ${activeConnections.length} active connections ...`);
    this.clients.forEach((client) => client.connection?.closeConnection());
  }
}
