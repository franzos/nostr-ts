import { NEVENT_KIND } from "@nostr-ts/common";

export const nEventKindArray = Object.keys(NEVENT_KIND).map((k) => {
  return {
    name: k,
    value: NEVENT_KIND[k as keyof typeof NEVENT_KIND],
  };
});

const kindToName = (kind: NEVENT_KIND) => {
  const kindObj = nEventKindArray.find((k) => k.value === kind);
  if (kindObj) {
    return kindObj.name;
  }
  return "Unknown";
};

export const nEventKindToName = (kinds: NEVENT_KIND[]) => {
  return kinds.map(kindToName).join(", ");
};
