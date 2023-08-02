/**
 * Check array of tags if any nonce tags are present
 * https://github.com/nostr-protocol/nips/blob/master/13.md
 *
 * @returns nonce or undefined
 */
export function eventHasNonce(tags: string[][]): [number, number] | undefined {
  const nonceTags = tags.filter((tag) => tag[0] === "nonce");
  if (nonceTags.length === 0) {
    return;
  }
  return [parseInt(nonceTags[0][1]), parseInt(nonceTags[0][2])];
}
