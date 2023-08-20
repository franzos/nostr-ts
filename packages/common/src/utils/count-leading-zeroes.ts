/**
 *
 * Copied from https://github.com/nostr-protocol/nips/blob/master/13.md#validating
 * All credits go to the author
 * @param hex
 * @returns
 */
export function countLeadingZeroes(hex) {
  let count = 0;

  for (let i = 0; i < hex.length; i++) {
    const nibble = parseInt(hex[i], 16);
    if (nibble === 0) {
      count += 4;
    } else {
      count += Math.clz32(nibble) - 28;
      break;
    }
  }

  return count;
}
