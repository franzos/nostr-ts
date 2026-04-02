import { bech32 } from "bech32";
import { encodeBech32, decodeBech32, BECH32_PREFIX } from "..";

/**
 * DECODE BECH32
 */

test("decode bech", () => {
  const npub = decodeBech32(
    "npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg"
  );
  expect(npub.prefix).toEqual("npub");
  expect(npub.tlvItems).toEqual([
    {
      type: 0,
      value: "7e7e9c42a91bfef19fa929e5fda1b72e0ebc1a4c1141673e2794234d86addf4e",
    },
  ]);

  const npub2 = decodeBech32(
    "npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6"
  );
  expect(npub2.prefix).toEqual("npub");
  expect(npub2.tlvItems).toEqual([
    {
      type: 0,
      value: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    },
  ]);

  const nsec = decodeBech32(
    "nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5"
  );
  expect(nsec.prefix).toEqual("nsec");
  expect(nsec.tlvItems).toEqual([
    {
      type: 0,
      value: "67dea2ed018072d675f5415ecfaed7d2597555e202d85b3d65ea4e58d2d92ffa",
    },
  ]);

  const lnurl1 = decodeBech32(
    "lnurl1dp68gurn8ghj7um5v93kketj9ehx2amn9uh8wetvdskkkmn0wahz7mrww4excup0dajx2mrv92x9xp"
  );
  expect(lnurl1.prefix).toEqual("lnurl");
  expect(lnurl1.tlvItems).toEqual([
    {
      type: 0,
      value:
        "68747470733a2f2f737461636b65722e6e6577732f2e77656c6c2d6b6e6f776e2f6c6e75726c702f6f64656c6c",
    },
  ]);

  const nprofile = decodeBech32(
    "nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p"
  );
  expect(nprofile.prefix).toEqual("nprofile");
  expect(nprofile.tlvItems).toEqual([
    {
      type: 0,
      value: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    },
    { type: 1, value: "wss://r.x.com" },
    { type: 1, value: "wss://djbas.sadkb.com" },
  ]);

  const nnote = decodeBech32(
    "note1fntxtkcy9pjwucqwa9mddn7v03wwwsu9j330jj350nvhpky2tuaspk6nqc"
  );
  expect(nnote.prefix).toEqual("note");
  expect(nnote.tlvItems).toEqual([
    {
      type: 0,
      value: "4cd665db042864ee600ee976d6cfcc7c5ce743859462f94a347cd970d88a5f3b",
    },
  ]);

  /**
   * ENCODE
   */
  const encodedNpub = encodeBech32(BECH32_PREFIX.PublicKeys, npub.tlvItems);
  expect(encodedNpub).toEqual(
    "npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg"
  );

  const encodedNsec = encodeBech32(BECH32_PREFIX.PrivateKeys, nsec.tlvItems);
  expect(encodedNsec).toEqual(
    "nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5"
  );

  const encodedNprofile = encodeBech32(
    BECH32_PREFIX.Profile,
    nprofile.tlvItems
  );
  expect(encodedNprofile).toEqual(
    "nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p"
  );
});

/**
 * NEVENT - full TLV with author and kind
 */

test("nevent encode/decode roundtrip", () => {
  const eventId =
    "4cd665db042864ee600ee976d6cfcc7c5ce743859462f94a347cd970d88a5f3b";
  const authorPubkey =
    "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const relays = ["wss://r.x.com", "wss://relay.damus.io"];
  const kind = 1;

  const encoded = encodeBech32(BECH32_PREFIX.Event, [
    { type: 0, value: eventId },
    { type: 1, value: relays[0] },
    { type: 1, value: relays[1] },
    { type: 2, value: authorPubkey },
    { type: 3, value: kind },
  ]);

  expect(encoded.startsWith("nevent")).toBe(true);

  const decoded = decodeBech32(encoded);
  expect(decoded.prefix).toEqual("nevent");
  expect(decoded.tlvItems).toEqual([
    { type: 0, value: eventId },
    { type: 1, value: relays[0] },
    { type: 1, value: relays[1] },
    { type: 2, value: authorPubkey },
    { type: 3, value: kind },
  ]);
});

test("nevent encode/decode with high kind number", () => {
  const eventId =
    "4cd665db042864ee600ee976d6cfcc7c5ce743859462f94a347cd970d88a5f3b";

  const encoded = encodeBech32(BECH32_PREFIX.Event, [
    { type: 0, value: eventId },
    { type: 3, value: 30023 },
  ]);

  const decoded = decodeBech32(encoded);
  expect(decoded.tlvItems).toContainEqual({ type: 3, value: 30023 });
});

/**
 * NADDR - addressable event coordinate
 */

test("naddr encode/decode roundtrip", () => {
  const identifier = "my-article";
  const pubkey =
    "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const kind = 30023;
  const relays = ["wss://relay.damus.io"];

  const encoded = encodeBech32(BECH32_PREFIX.EventCoordinate, [
    { type: 0, value: identifier, encoding: "text" },
    { type: 1, value: relays[0] },
    { type: 2, value: pubkey },
    { type: 3, value: kind },
  ]);

  expect(encoded.startsWith("naddr")).toBe(true);

  const decoded = decodeBech32(encoded);
  expect(decoded.prefix).toEqual("naddr");
  expect(decoded.tlvItems).toEqual([
    { type: 0, value: identifier },
    { type: 1, value: relays[0] },
    { type: 2, value: pubkey },
    { type: 3, value: kind },
  ]);
});

test("naddr with empty d-tag (normal replaceable event)", () => {
  const pubkey =
    "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";

  const encoded = encodeBech32(BECH32_PREFIX.EventCoordinate, [
    { type: 0, value: "", encoding: "text" },
    { type: 2, value: pubkey },
    { type: 3, value: 0 },
  ]);

  const decoded = decodeBech32(encoded);
  expect(decoded.prefix).toEqual("naddr");
  expect(decoded.tlvItems[0]).toEqual({ type: 0, value: "" });
});

/**
 * NRELAY (deprecated per NIP-19)
 */

test("nrelay encode/decode roundtrip", () => {
  const relayUrl = "wss://relay.damus.io";

  const encoded = encodeBech32(BECH32_PREFIX.Relay, [
    { type: 0, value: relayUrl, encoding: "text" },
  ]);

  expect(encoded.startsWith("nrelay")).toBe(true);

  const decoded = decodeBech32(encoded);
  expect(decoded.prefix).toEqual("nrelay");
  expect(decoded.tlvItems).toEqual([{ type: 0, value: relayUrl }]);
});

/**
 * INPUT VALIDATION
 */

test("encodeBech32 throws on invalid hex string", () => {
  expect(() =>
    encodeBech32(BECH32_PREFIX.PublicKeys, [{ type: 0, value: "zzzz" }])
  ).toThrow("Invalid hex string");

  expect(() =>
    encodeBech32(BECH32_PREFIX.PublicKeys, [{ type: 0, value: "abc" }])
  ).toThrow("Invalid hex string");
});

test("decodeBech32 ignores truncated TLV entries", () => {
  // Encode a valid nprofile with a pubkey + relay, then decode it
  const pubkey =
    "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const encoded = encodeBech32(BECH32_PREFIX.Profile, [
    { type: 0, value: pubkey },
    { type: 1, value: "wss://r.x.com" },
  ]);
  const decoded = decodeBech32(encoded);
  // Both entries should decode correctly
  expect(decoded.tlvItems[0].value).toEqual(pubkey);
  expect(decoded.tlvItems[1].value).toEqual("wss://r.x.com");

  // Manually construct a truncated TLV: type 0, length 32, but only 10 bytes of data
  const truncated = new Uint8Array(12);
  truncated[0] = 0x00; // type
  truncated[1] = 0x20; // length = 32
  truncated.set(new Uint8Array(10).fill(0xaa), 2); // only 10 bytes, not 32
  const words = bech32.toWords(truncated);
  const truncatedBech32 = bech32.encode("nprofile", words, 1023);

  const truncatedDecoded = decodeBech32(truncatedBech32);
  // Truncated entry should be skipped — no items returned
  expect(truncatedDecoded.tlvItems).toEqual([]);
});
