import { lud16ToUrl } from "..";

test("lud16ToUrl", () => {
  const lud16 = "satoshi@bitcoin.org";
  const url = lud16ToUrl(lud16);
  expect(url).toEqual("https://bitcoin.org/.well-known/lnurlp/satoshi");
});

test("lud16ToUrl onion", () => {
  const lud16 = "satoshi@woodcubabitenem2.onion";
  const url = lud16ToUrl(lud16);
  expect(url).toEqual(
    "http://woodcubabitenem2.onion/.well-known/lnurlp/satoshi"
  );
});
