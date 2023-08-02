import { EVENT_KIND, Event } from "../types";
import { isValidWebSocketUrl } from "./websocket-url";

export function eventHasRelayRecommendation(event: Event): string | undefined {
  if (event.kind !== EVENT_KIND.RECOMMEND_RELAY) {
    return;
  }
  const relayUrl = event.content;
  if (isValidWebSocketUrl(relayUrl)) {
    return relayUrl;
  }
}
