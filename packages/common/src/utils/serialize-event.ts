import { EventBase } from "../types";

/**
 * Serialize an event
 * @param event
 * @returns
 */
export function serializeEvent(event: EventBase) {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  return serialized;
}
