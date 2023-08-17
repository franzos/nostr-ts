import { decodeLnurl, encodeLnurl } from "..";

test("decodeLnurl", () => {
  const lnurl =
    "lnurl1dp68gurn8ghj7um5v93kketj9ehx2amn9uh8wetvdskkkmn0wahz7mrww4excup0dajx2mrv92x9xp";
  const decoded = decodeLnurl(lnurl);
  expect(decoded).toEqual("https://stacker.news/.well-known/lnurlp/odell");
});

test("decodeLnurl #2", () => {
  const lnurl =
    "lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhkxctjd9hxwmrpw35x2d3hts4ju9";
  const decoded = decodeLnurl(lnurl);
  expect(decoded).toEqual(
    "https://walletofsatoshi.com/.well-known/lnurlp/caringlathe67"
  );
});

test("encodeLnurl", () => {
  const decoded = "https://stacker.news/.well-known/lnurlp/odell";
  const encoded = encodeLnurl(decoded);
  expect(encoded).toEqual(
    "lnurl1dp68gurn8ghj7um5v93kketj9ehx2amn9uh8wetvdskkkmn0wahz7mrww4excup0dajx2mrv92x9xp"
  );
});
