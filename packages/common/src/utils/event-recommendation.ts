import { NEVENT_KIND, EventBase } from "../types";
import { isValidWebSocketUrl } from "./websocket-url";

export function eventHasRelayRecommendation(
  event: EventBase
): string | undefined {
  if (event.kind !== NEVENT_KIND.RECOMMEND_RELAY) {
    return;
  }
  const relayUrl = event.content;
  if (isValidWebSocketUrl(relayUrl)) {
    return relayUrl;
  }
}
