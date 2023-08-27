import { NEvent, NewShortTextNote } from "../classes/event";
import { eventHasNonce } from "./event-nonce";

test("eventHasNonce", () => {
  const ev = new NEvent({
    kind: 1,
    content: "Hello",
    tags: [["nonce", "64", "2"]],
  });
  const hasNonce = eventHasNonce(ev);
  expect(hasNonce).toEqual([64, 2]);
  expect(hasNonce).toEqual(ev.hasNonceTag());
});

test("eventAddNonce", () => {
  const ev = NewShortTextNote({
    text: "Hello",
  });
  const nonce = [64, 2];
  ev.addNonceTag(nonce);
  expect(ev.hasNonceTag()).toEqual(nonce);
});

test("eventAddNonce: already has nonce", () => {
  const ev = NewShortTextNote({
    text: "Hello",
  });
  const nonce = [64, 2];
  ev.addNonceTag(nonce);
  expect(() => ev.addNonceTag(nonce)).toThrowError(
    "Event already has a nonce."
  );
});
