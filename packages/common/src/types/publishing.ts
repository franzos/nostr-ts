import { NEvent } from "../classes";

export interface PublishingRequest {
  id?: string;
  event: NEvent;
  /**
   * Manually set the POW value
   */
  pow?: number;
  relayIds?: string[];
}

export interface PublishingQueueItem
  extends Omit<PublishingRequest, "relayIds"> {
  id: string;
  relayId: string;
  send: boolean;
  accepted?: boolean;
  powStart?: number;
  powDone?: number;
  error?: string;
}
