/**
 * Check array of tags if any are NIP-32
 * https://github.com/nostr-protocol/nips/blob/master/32.md
 *
 * @returns label tags or undefined
 */
export function eventHasLabels(tags: string[][]):
  | {
      labelTags: string[][];
      labelNamespace: string[][];
    }
  | undefined {
  const labelTags = tags.filter((tag) => tag[0] === "l");
  const labelNamespace = tags.filter((tag) => tag[0] === "L");
  if (labelTags.length === 0 && labelNamespace.length === 0) {
    return;
  }
  return {
    labelTags,
    labelNamespace,
  };
}
