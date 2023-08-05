export interface EventEventTag {
  eventId: string;
  relayUrl?: string;
  marker?: "reply" | "root" | "mention";
}
