import { bech32 } from "bech32";

// Detect if we're in a Node.js environment
const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

// Create encoder/decoder instances
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function findlnurl(bodyOfText: string): string | null {
  let res = /,*?((lnurl)([0-9]{1,}[a-z0-9]+){1})/.exec(
    bodyOfText.toLowerCase()
  );
  if (res) {
    return res[1];
  }
  return null;
}

/**
 * Decode lnurl
 *
 * example:
 * - source: lnurl1dp68gurn8ghj7um5v93kketj9ehx2amn9uh8wetvdskkkmn0wahz7mrww4excup0dajx2mrv92x9xp
 * - result: https://stacker.news/.well-known/lnurlp/odell
 *
 * Adapted from https://github.com/nbd-wtf/js-lnurl/blob/master/src/helpers/decodelnurl.ts
 * @param lnurl
 * @returns
 */
export function decodeLnurl(lnurl: string): string {
  lnurl = lnurl.trim();

  if (lnurl.toLowerCase().slice(0, 6) === "lnurl1") {
    const { words } = bech32.decode(lnurl, 20000);
    const decodedData = new Uint8Array(bech32.fromWords(words));

    // Use TextDecoder for browser or Buffer for Node.js
    return isNode
      ? Buffer.from(decodedData).toString()
      : textDecoder.decode(decodedData);
  } else if (
    lnurl.slice(0, 9) === "lnurlc://" ||
    lnurl.slice(0, 9) === "lnurlw://" ||
    lnurl.slice(0, 9) === "lnurlp://" ||
    lnurl.slice(0, 10) === "keyauth://"
  ) {
    let [_, post] = lnurl.split("://");
    let pre = post.match(/\.onion($|\W)/) ? "http" : "https";
    return pre + "://" + post;
  } else if (lnurl.slice(0, 8) === "https://") {
    let bech32lnurl = findlnurl(lnurl);
    if (bech32lnurl) {
      const { words } = bech32.decode(bech32lnurl, 20000);
      const decodedData = new Uint8Array(bech32.fromWords(words));

      // Use TextDecoder for browser or Buffer for Node.js
      return isNode
        ? Buffer.from(decodedData).toString()
        : textDecoder.decode(decodedData);
    }

    return lnurl;
  }

  throw new Error(`invalid url ${lnurl}`);
}

/**
 * Encode url to lnurl
 *
 * example:
 * - source: https://stacker.news/.well-known/lnurlp/odell
 * - result: lnurl1dp68gurn8ghj7um5v93kketj9ehx2amn9uh8wetvdskkkmn0wahz7mrww4excup0dajx2mrv92x9xp
 *
 * @param str
 * @returns
 */
export function encodeLnurl(str: string): string {
  // Use TextEncoder for browser or Buffer for Node.js
  const data = isNode ? Buffer.from(str) : textEncoder.encode(str);

  const words = bech32.toWords(new Uint8Array(data));
  return bech32.encode("lnurl", words, 20000);
}
