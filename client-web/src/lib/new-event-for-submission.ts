import {
  EventBaseSigned,
  NEvent,
  NewLongFormContent,
  NewQuoteRepost,
  NewRecommendRelay,
  NewShortTextNote,
  NewShortTextNoteResponse,
} from "@nostr-ts/common";

export function createNewEventForSubmission(
  eventKind: string,
  eventContent: string,
  relayUrl: string,
  props: {
    inResponseTo?: EventBaseSigned;
  }
): {
  event?: NEvent;
  error?: string;
} {
  switch (eventKind) {
    case "NewShortTextNote":
      return {
        event: NewShortTextNote({
          text: eventContent,
        }),
      };
    case "NewLongFormContent":
      return {
        event: NewLongFormContent({
          text: eventContent,
        }),
      };
    case "NewShortTextNoteResponse":
      if (!props.inResponseTo) {
        return {
          error: "Response requires inResponseTo",
        };
      }
      return {
        event: NewShortTextNoteResponse({
          text: eventContent,
          inResponseTo: props.inResponseTo,
        }),
      };
    case "NewRecommendRelay":
      return {
        event: NewRecommendRelay({
          relayUrl: relayUrl,
        }),
      };
    case "NewQuoteRepost":
      if (!props.inResponseTo) {
        return {
          error: "Quote repost requires inResponseTo",
        };
      }
      return {
        event: NewQuoteRepost({
          inResponseTo: props.inResponseTo,
          relayUrl: relayUrl,
        }),
      };
    default:
      return {
        error: "Invalid event type",
      };
  }
}
