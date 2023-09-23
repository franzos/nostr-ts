import { EventBase, NEVENT_KIND } from "../types";
import { NEventContact } from "../types/event-contacts";

export function eventHasContacts(
  event: EventBase
): NEventContact[] | undefined {
  if (event.kind !== NEVENT_KIND.CONTACTS) {
    return;
  }
  const tags = event.tags.filter((tag) => tag[0] === "p");
  if (tags.length === 0) {
    return;
  }
  return tags.map((tag) => {
    let contact: NEventContact;
    if (tag.length === 2) {
      contact = {
        key: tag[1],
      };
      return contact;
    } else if (tag.length === 3) {
      contact = {
        key: tag[1],
        relayUrl: tag[2],
      };
      return contact;
    } else if (tag.length === 4) {
      contact = {
        key: tag[1],
        relayUrl: tag[2],
        petname: tag[3],
      };
      return contact;
    }
  });
}
