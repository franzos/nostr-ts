import { NEVENT_KIND, EventBase } from "../types";
import { isValidWebSocketUrl } from "./websocket-url";

/**
 * Check if the event is / has a relay recommentation
 *
 */
export function eventHasRelayRecommendation(
  event: EventBase
): string | undefined {
  if (event.kind !== NEVENT_KIND.RECOMMEND_RELAY) {
    return;
  }

  return isValidWebSocketUrl(event.content) ? event.content : undefined;
}
