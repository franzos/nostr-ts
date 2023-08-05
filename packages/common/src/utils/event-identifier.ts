import { EventBase } from "../types";

export function eventHasIdentifierTags(event: EventBase): string[] | undefined {
  const identifiers: string[] = [];
  const identifierTags = event.tags.filter((tag) => tag[0] === "d");

  if (identifierTags.length === 0) {
    return undefined;
  } else {
    for (const tag of identifierTags) {
      let identifierValue = tag[1] || ""; // If value is not defined, use an empty string

      // If this identifier value is not already in the array, add it
      if (!identifiers.includes(identifierValue)) {
        identifiers.push(identifierValue);
      }
    }
  }

  return identifiers && identifiers.length > 0 ? identifiers : undefined;
}

export function makeEventIdentifierTag(identifier: string) {
  return ["d", identifier];
}
