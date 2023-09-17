import { ReactionsCount } from "@nostr-ts/common";

export function filterReactions(obj?: ReactionsCount) {
  if (!obj) return {};
  return Object.keys(obj)
    .filter((key) => key !== "+" && key !== "-")
    .reduce((newObj: ReactionsCount, key) => {
      newObj[key] = obj[key];
      return newObj;
    }, {});
}
