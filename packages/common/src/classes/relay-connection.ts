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
} from "../types";
import { NEvent } from "./event";

export class RelayConnection implements WebSocketClientConnection {
  id: string;
  url: string;
  info?: RelayInformationDocument;
  connection?: WebSocketClientBase;

  /**
   * Commands that have been send to the relay
   * also includes events
   */
  commands: ClientCommands[] = [];
  subscriptions: ClientSubscription[] = [];

  constructor(conf: WebSocketClientConfig) {
    this.id = conf.id ? conf.id : uuidv4();
    this.url = conf.url;
  }

  public isConnected() {
    return this.connection !== undefined;
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

  public addSubscription(subscription: ClientSubscription) {
    this.subscriptions.push(subscription);
  }

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
}
