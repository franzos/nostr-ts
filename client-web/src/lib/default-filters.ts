import { NFilters, NEVENT_KIND } from "@nostr-ts/common";

export function filterDefault(limit?: number) {
  const filters = new NFilters({
    kinds: [
      NEVENT_KIND.SHORT_TEXT_NOTE,
      NEVENT_KIND.LONG_FORM_CONTENT,
      NEVENT_KIND.REPOST,
    ],
  });
  if (limit) {
    filters.limit = limit;
  }
  return filters;
}

export function filterByAuthor(pubKeys: string[], limit?: number) {
  const filters = new NFilters({
    kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.LONG_FORM_CONTENT],
    authors: pubKeys,
  });
  if (limit) {
    filters.limit = limit;
  }
  return filters;
}

export function filterByMentions(pubKeys: string[], limit?: number) {
  const filters = new NFilters({
    kinds: [
      NEVENT_KIND.SHORT_TEXT_NOTE,
      NEVENT_KIND.LONG_FORM_CONTENT,
      NEVENT_KIND.REPOST,
    ],
    "#p": pubKeys,
  });
  if (limit) {
    filters.limit = limit;
  }
  return filters;
}

export function filterByRelatedEvents(id: string, limit?: number) {
  const filters = new NFilters({
    kinds: [
      NEVENT_KIND.SHORT_TEXT_NOTE,
      NEVENT_KIND.REPOST,
      NEVENT_KIND.REACTION,
      NEVENT_KIND.ZAP_RECEIPT,
    ],
    "#e": [id],
  });
  if (limit) {
    filters.limit = limit;
  }
  return filters;
}
