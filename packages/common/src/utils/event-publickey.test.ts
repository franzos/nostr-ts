import { NEvent } from "../classes";

test("event-publickey", () => {
  const ev = new NEvent({
    tags: [
      ["p", "123"],
      ["p", "123", "456"],
    ],
  });

  const tags = ev.hasPublicKeyTags();
  expect(tags).toEqual([["123"], ["123", "456"]]);
});
