import { v4 as uuidv4 } from "uuid";
import {
  ClientCommands,
  ClientSubscription,
  RELAY_MESSAGE_TYPE,
  RelayAuth,
  RelayCount,
  RelayEose,
  RelayEvent,
  RelayInformationDocument,
  RelayNotice,
  RelayOK,
  WebSocketClientBase,
  WebSocketClientConfig,
  WebSocketClientConnection,
  WebSocketClientInfo,
} from "../types";
import { NEvent } from "./event";

export class RelayConnection implements WebSocketClientConnection {
  id: string;
  url: string;
  read: boolean;
  write: boolean;

  /**
   * Set to true if relay requires POW
   * This is sometimes not included in the server info but only available upon request
   */
  requiresPOW: number;

  info?: RelayInformationDocument;
  ws?: WebSocketClientBase;
  /**
   * Whether connection is in use; defaults to true for now
   */
  isEnabled: boolean;

  /**
   * Commands that have been send to the relay
   * also includes events
   */
  commands: ClientCommands[] = [];
  subscriptions: ClientSubscription[] = [];

  constructor(conf: WebSocketClientConfig) {
    this.id = conf.id ? conf.id : uuidv4();
    this.url = conf.url;
    this.read = conf.read;
    this.write = conf.write;
    this.requiresPOW = 0;
    this.info = conf.info;
    // TODO: Implement limits
    this.isEnabled = true;
  }

  public isConnected() {
    return this.ws !== undefined && this.ws.isConnected();
  }

  /**
   * Check if relay supports event
   * @param event
   * @returns
   */
  public supportsEvent(event: NEvent): boolean {
    const neededNips = event.determineRequiredNIP();
    console.log(`Required NIP: ${neededNips.join(", ")}`);
    const supportedNips = this.info?.supported_nips || [];
    console.log(`Supported NIP: ${supportedNips.join(", ")}`);

    const allNipsSupported = neededNips.every((nip) =>
      supportedNips.includes(nip)
    );

    return allNipsSupported;
  }

  public supportsEventOrThrow(event: NEvent) {
    if (!this.supportsEvent(event)) {
      throw new Error(`Event ${event.id} is not supported by relay ${this.id}`);
    }
  }

  public addCommand(command: ClientCommands) {
    this.commands.push(command);
  }

  public updateCommandFromRelayMessage(payload: {
    data:
      | RelayAuth
      | RelayCount
      | RelayEose
      | RelayEvent
      | RelayNotice
      | RelayOK;
  }) {
    if (payload.data[0] === RELAY_MESSAGE_TYPE.COUNT) {
      const index = this.commands.findIndex(
        (command) =>
          command.subscriptionId === (payload.data as RelayCount)[1] &&
          command.response == null
      );
      if (index !== -1) {
        this.commands[index].response = payload.data[2];
        this.commands[index].success = true;
      }
    } else if (payload.data[0] === RELAY_MESSAGE_TYPE.NOTICE) {
      // TODO: This is not exact ...
      const index = this.commands.findIndex(
        (command) => command.eventId && command.response == null
      );
      if (index !== -1) {
        this.commands[index].response = payload.data[1];
        // TODO: Success / Error
      }
    } else if (payload.data[0] === RELAY_MESSAGE_TYPE.OK) {
      const index = this.commands.findIndex(
        (command) =>
          command.eventId === (payload.data as RelayOK)[1] &&
          command.response == null
      );
      if (index !== -1) {
        this.commands[index].response = payload.data[3];
        this.commands[index].success = payload.data[2];
      }
    }
  }

  /**
   * This only adds a new subscription
   * To unsubscribe, use relay client
   */
  public addSubscription(subscription: ClientSubscription) {
    this.subscriptions.push(subscription);
  }

  /**
   * This only removes a subscription
   * To unsubscribe, use relay client
   */
  public removeSubscription(subscriptionId: string) {
    this.subscriptions = this.subscriptions.filter(
      (sub) => sub.subscriptionId !== subscriptionId
    );
  }

  public hasSubscription(subscriptionId: string): boolean {
    return (
      this.subscriptions.find(
        (sub) => sub.subscriptionId === subscriptionId
      ) !== undefined
    );
  }

  public getSubscription(subscriptionId: string): ClientSubscription | null {
    const sub = this.subscriptions.find(
      (sub) => sub.subscriptionId === subscriptionId
    );
    return sub ? sub : null;
  }

  public getInfo(fields: "default" | "withInfo"): WebSocketClientInfo {
    if (fields === "default") {
      return {
        id: this.id,
        url: this.url,
        read: this.read,
        write: this.write,
        powRequired: this.requiresPOW,
      };
    } else {
      return {
        id: this.id,
        url: this.url,
        read: this.read,
        write: this.write,
        powRequired: this.requiresPOW,
        info: this.info,
      };
    }
  }
}
