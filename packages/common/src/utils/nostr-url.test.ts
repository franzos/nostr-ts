import { BECH32_PREFIX } from "../types";
import { encodeNostrUrl } from "./nostr-url";

test("encodeNostrUrl", () => {
  const url = encodeNostrUrl(BECH32_PREFIX.PublicKeys, [
    {
      type: 0,
      value: "b75b9a3131f4263add94ba20beb352a11032684f2dac07a7e1af827c6f3c1505",
    },
  ]);
  expect(url).toEqual(
    "nostr:npub1kade5vf37snr4hv5hgstav6j5ygry6z09kkq0flp47p8cmeuz5zs7zz2an"
  );
});
