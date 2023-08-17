import { NEVENT_KIND } from "../types";
import { isValidEventContent } from "./event-content";

test("Websocket url", () => {
  const content = "wss://example.com";
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(true);
});

test("Test with image URL markdown", () => {
  const content = "Checkout [picture](https://picture.com/pic.jpg)";
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(true);
});

test("Test with image URL", () => {
  const content = "Checkout https://picture.com/pic.jpg";
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(true);
});

test("Test with nostr: link", () => {
  const content =
    "Checkout nostr:2234567890123456789012345678901234567890123456789012345678901234";
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(true);
});

test("Test with JSON for kind REPOST", () => {
  const content = JSON.stringify({
    id: "123",
    kind: 6,
  });
  const report = isValidEventContent(content, NEVENT_KIND.REPOST);
  expect(report.isValid).toBe(true);
});

test("Test with HTML", () => {
  const content = "<p>Checkout</p>";
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(false);
});

test("Test with line breaks", () => {
  const content = "Checkout\n";
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(false);
});

test("Test with unicode", () => {
  const content = "Checkout nostr ⚡️⚡️⚡️";
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(true);
});

test("Test with nostr: link and unicode", () => {
  const content =
    "Gracias nostr:npub1kade5vf37snr4hv5hgstav6j5ygry6z09kkq0flp47p8cmeuz5zs7zz2an ! ⚡️⚡️⚡️";
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(true);
});
