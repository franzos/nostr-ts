import { NEvent } from "../classes";

export interface PublishingRequest {
  id?: string;
  event: NEvent;
  /**
   * Manually set the POW value
   */
  pow?: number;
  relayUrls?: string[];
}

export interface PublishingQueueItem
  extends Omit<PublishingRequest, "relayUrls"> {
  id: string;
  relayUrl: string;
  send: boolean;
  accepted?: boolean;
  powStart?: number;
  powDone?: number;
  error?: string;
}
