import {
  RelayInformationDocument,
  RelaySubscription,
  Subscription,
  WebSocketClientBase,
  WebSocketClientConfig,
  WebSocketClientConnection,
  WebSocketClientInfo,
} from "../types";
import { NEvent } from "./event";

export class RelayConnection implements WebSocketClientConnection {
  url: string;

  read: boolean;
  write: boolean;
  isEnabled: boolean;

  /**
   * Latest auth challenge received from the relay (if any)
   */
  authChallenge?: string;

  /**
   * Set to true if relay requires POW
   * This is sometimes not included in the server info but only available upon request
   */
  requiresPOW: number;

  info?: RelayInformationDocument;
  ws?: WebSocketClientBase;

  private subscriptions: Subscription[] = [];

  constructor(conf: WebSocketClientConfig) {
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

  public isReady(opt: "read" | "write" | "any") {
    if (!this.isConnected() || !this.isEnabled) return false;

    switch (opt) {
      case "read":
        return this.read;
      case "write":
        return this.write;
      case "any":
        return this.read || this.write;
      default:
        return false;
    }
  }

  /**
   * Check if relay supports event
   * @param event
   * @returns
   */
  public supportsEvent(event: NEvent): boolean {
    const neededNips = event.determineRequiredNIP();
    const supportedNips = this.info?.supported_nips || [];
    console.log(
      `Required NIP: ${neededNips.join(", ")}`,
      `Supported NIP: ${supportedNips.join(", ")}`
    );

    const allNipsSupported = neededNips.every((nip) =>
      supportedNips.includes(nip)
    );

    return allNipsSupported;
  }

  public supportsEventOrThrow(event: NEvent) {
    if (!this.supportsEvent(event)) {
      throw new Error(
        `Event ${event.id} is not supported by relay ${this.url}`
      );
    }
  }

  /**
   * This only adds a new subscription
   */
  public addSubscription(subscription: Subscription) {
    this.subscriptions.push(subscription);
  }

  public updateSubscription(subscription: RelaySubscription) {
    const index = this.subscriptions.findIndex(
      (sub) => sub.id === subscription.id
    );
    if (index !== -1) {
      this.subscriptions[index] = subscription;
    }
  }

  /**
   * This only removes a subscription
   * To unsubscribe, use relay client
   */
  public removeSubscription(id: string) {
    this.subscriptions = this.subscriptions.filter((sub) => sub.id !== id);
  }

  public getSubscription(id: string): RelaySubscription | null {
    const sub = this.subscriptions.find((sub) => sub.id === id);
    return sub
      ? {
          ...sub,
          relayUrl: this.url,
        }
      : null;
  }

  public getSubscriptions(): RelaySubscription[] {
    return this.subscriptions.map((sub) => ({
      ...sub,
      relayUrl: this.url,
    }));
  }

  public getInfo(fields: "default" | "withInfo"): WebSocketClientInfo {
    if (fields === "default") {
      return {
        url: this.url,
        read: this.read,
        write: this.write,
        powRequired: this.requiresPOW,
        isReady: this.isReady("any"),
      };
    } else {
      return {
        url: this.url,
        read: this.read,
        write: this.write,
        powRequired: this.requiresPOW,
        info: this.info,
        isReady: this.isReady("any"),
      };
    }
  }
}
