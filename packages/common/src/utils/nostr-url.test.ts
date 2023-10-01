import { BECH32_PREFIX } from "../types";
import {
  bechEncodePrivateKey,
  bechEncodeProfile,
  decodeNostrPrivateKeyString,
  decodeNostrProfileString,
  decodeNostrPublicKeyString,
  encodeNostrString,
} from "./nostr-url";

/**
 * PUB
 */

test("encodePublicKey", () => {
  const url = encodeNostrString(BECH32_PREFIX.PublicKeys, [
    {
      type: 0,
      value: "b75b9a3131f4263add94ba20beb352a11032684f2dac07a7e1af827c6f3c1505",
    },
  ]);
  expect(url).toEqual(
    "nostr:npub1kade5vf37snr4hv5hgstav6j5ygry6z09kkq0flp47p8cmeuz5zs7zz2an"
  );
});

test("decodePublicKey", () => {
  const url =
    "nostr:npub1kade5vf37snr4hv5hgstav6j5ygry6z09kkq0flp47p8cmeuz5zs7zz2an";
  const res = decodeNostrPublicKeyString(url);
  expect(res).toEqual(
    "b75b9a3131f4263add94ba20beb352a11032684f2dac07a7e1af827c6f3c1505"
  );
});

/**
 * PRIV
 */

test("encodePrivateKey", () => {
  const src =
    "67dea2ed018072d675f5415ecfaed7d2597555e202d85b3d65ea4e58d2d92ffa";
  const res = bechEncodePrivateKey(src);
  expect(res).toEqual(
    "nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5"
  );
});

test("decodePrivateKey", () => {
  const src = "nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5";
  const res = decodeNostrPrivateKeyString(src);
  expect(res).toEqual(
    "67dea2ed018072d675f5415ecfaed7d2597555e202d85b3d65ea4e58d2d92ffa"
  );
});

/**
 * PROF
 */

test("encodeProfile", () => {
  const src =
    "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const relays = ["wss://r.x.com", "wss://djbas.sadkb.com"];
  const res = bechEncodeProfile(src, relays);
  expect(res).toEqual(
    "nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p"
  );
});

test("decodeProfile", () => {
  const src =
    "nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p";
  const res = decodeNostrProfileString(src);
  expect(res).toEqual([
    {
      type: 0,
      value: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    },
    {
      type: 1,
      value: "wss://r.x.com",
    },
    {
      type: 1,
      value: "wss://djbas.sadkb.com",
    },
  ]);
});
