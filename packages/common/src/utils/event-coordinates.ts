import { EventBase, EventCoordinatesTag } from "../types";

/**
 * Extract event coordinates from tags
 *
 * ["a", "<kind>:<pubkey>:<d-identifier>"]
 * ["a", "<kind>:<pubkey>:<d-identifier>", "<relay>"]
 */
function eventCoordinatesFromTags(
  tags: any[]
): EventCoordinatesTag[] | undefined {
  if (!tags) {
    return;
  }
  // Define result array
  let result: EventCoordinatesTag[] = [];

  // Loop through each tag
  for (let tag of tags) {
    // Check that the tag is an array and has the correct length
    if (!Array.isArray(tag) || tag.length < 2 || tag.length > 3) {
      continue;
    }

    // Check that the first element of the tag array is the string "a"
    if (tag[0] !== "a") {
      continue;
    }

    // Split the second element of the tag array on ":" to get kind, pubkey, and identifier
    let parts = tag[1].split(":");

    // Check that the split operation produced exactly 3 parts
    if (parts.length !== 3) {
      continue;
    }

    // Extract kind, pubkey, and identifier from parts
    let kind = parts[0];
    let pubkey = parts[1];
    let identifier = parts[2];

    // Initialize relay as undefined
    let relay;

    // If there is a third element in the tag array, set relay to that element
    if (tag.length === 3) {
      relay = tag[2];
    }

    // Add this tag to the result array
    result.push({
      kind: kind,
      pubkey: pubkey,
      identifier: identifier,
      relay: relay,
    });
  }

  if (result.length === 0) {
    return;
  }

  // Return result array
  return result;
}

/**
 * Get event coordinates or undefined
 */
export function eventHasEventCoordinatesTags(
  event: EventBase
): EventCoordinatesTag[] | undefined {
  const coordinates = eventCoordinatesFromTags(event.tags);
  if (!coordinates) {
    return;
  }
  return coordinates;
}

/**
 * Make event coordinates tag
 * @param opts
 * @returns
 */
export function makeEventCoordinatesTag(opts: EventCoordinatesTag) {
  const { kind, pubkey, identifier, relay } = opts;
  if (relay) {
    return [`a:${kind}:${pubkey}:${identifier}, ${relay}`];
  } else {
    return [`a:${kind}:${pubkey}:${identifier}`];
  }
}
