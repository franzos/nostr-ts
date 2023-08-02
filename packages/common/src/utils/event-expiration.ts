/**
 * Check array of tags if any are NIP-40
 * @returns expiration time or undefined
 */
export function eventHasExpiration(tags: string[][]): number | undefined {
  const expirationTags = tags.filter((tag) => tag[0] === "expiration");
  if (expirationTags.length === 0) {
    return;
  }
  return parseInt(expirationTags[0][1]);
}
