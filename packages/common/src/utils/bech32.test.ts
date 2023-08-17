import { encodeBech32, decodeBech32, BECH32_PREFIX } from "..";

test("encode and decode nostr entity", () => {
  // Decode npub
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

  // Decode npub #2
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

  // // Decode nsec
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

  // Device lnurl
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

  // Decode nprofile
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

  // Encode npub
  const encodedNpub = encodeBech32(BECH32_PREFIX.PublicKeys, npub.tlvItems);
  expect(encodedNpub).toEqual(
    "npub10elfcs4fr0l0r8af98jlmgdh9c8tcxjvz9qkw038js35mp4dma8qzvjptg"
  );

  // // Encode nsec
  const encodedNsec = encodeBech32(BECH32_PREFIX.PrivateKeys, nsec.tlvItems);
  expect(encodedNsec).toEqual(
    "nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5"
  );

  // Encode nprofile
  const encodedNprofile = encodeBech32(
    BECH32_PREFIX.Profile,
    nprofile.tlvItems
  );
  expect(encodedNprofile).toEqual(
    "nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p"
  );
});
