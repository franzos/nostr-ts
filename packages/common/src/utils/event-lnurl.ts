import { EventBase } from "../types";

export function eventHasLnurlTags(event: EventBase): string[] | undefined {
  const tags = event.tags.filter((tag) => tag[0] === "lnurl");
  if (tags.length === 0) {
    return;
  }
  const lnurls = [];
  for (const tag of tags) {
    if (tag.length > 0) {
      lnurls.push(tag[1]);
    }
  }
  return lnurls && lnurls.length > 0 ? lnurls : undefined;
}

export function makeEventLnurlTag(lnurl: string) {
  return ["lnurl", lnurl];
}
