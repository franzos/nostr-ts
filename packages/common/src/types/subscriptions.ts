import { CLIENT_MESSAGE_TYPE } from "./client-message";
import { FiltersBase } from "./filter";

export interface SubscriptionOptions {
  /**
   * Set when the subscription is supposed to timeout
   */
  timeoutAt: number;
  /**
   * Set an associated timeout
   */
  timeout: number;
  /**
   * If the subscription is associated with a view
   * for ex. `welcome` or `profile:<uuid>
   */
  view?: string;
  unsubscribeOnEose?: boolean;
}

/**
 * Request a new subscription
 */
export interface SubscriptionRequest {
  type: CLIENT_MESSAGE_TYPE;
  options?: SubscriptionOptions;
  relayUrls?: string[];
}

export interface EventsRequest extends SubscriptionRequest {
  type: CLIENT_MESSAGE_TYPE.REQ;
  filters: FiltersBase;
  options: SubscriptionOptions;
}

export interface CountRequest extends SubscriptionRequest {
  type: CLIENT_MESSAGE_TYPE.COUNT;
  filters: FiltersBase;
}

export interface AuthRequest extends SubscriptionRequest {
  type: CLIENT_MESSAGE_TYPE.AUTH;
  signedEvent: string;
}

export interface CloseRequest extends SubscriptionRequest {
  type: CLIENT_MESSAGE_TYPE.CLOSE;
  subscriptionId: string;
}

/**
 * Active subscription
 */
export interface Subscription extends Omit<SubscriptionRequest, "relayUrls"> {
  id: string;
  type: CLIENT_MESSAGE_TYPE;
  filters?: FiltersBase;
  options?: SubscriptionOptions;
  created: number;
  eose?: boolean;
  isActive: boolean;
  result?: string | number;
  error?: string;
}

export interface RelaySubscription extends Subscription {
  relayUrl: string;
}
