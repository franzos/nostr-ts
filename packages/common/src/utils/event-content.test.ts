import { NEVENT_KIND } from "../types";
import {
  createEventContent,
  extractEventContent,
  isValidEventContent,
} from "./event-content";

/**
 * VALID
 */

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
  // TODO: According to spec this should be false but it seems other clients don't care
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(true);
});

test("Test with unicode", () => {
  const content = "Checkout nostr ⚡️⚡️⚡️";
  const report = isValidEventContent(content);
  expect(report.isValid).toBe(true);
});

test("Test real content", () => {
  const content = `Not our duty. There are agencies we pay to do that. Do you actively check people in the streets to see if they are talking about something illegal? Why would you do that here? All we have to do here is not interact with your  “bad actors” and in exceptional cases notify the authorities.
  I respect your point of view, but it dangerously adheres to the political doctrine that we all feel as a yoke.`;
  const report = isValidEventContent(content);
  // TODO: According to spec this should be false but it seems other clients don't care
  expect(report.isValid).toBe(true);
});

test("Test real content #2", () => {
  const content = `Not our duty. There are agencies we pay to do that. Do you actively check people in the streets to see if they are talking about something illegal? Why would you do that here? All we have to do here is not interact with your  “bad actors” and in exceptional cases notify the authorities.
  I respect your point of view, but it dangerously adheres to the political doctrine that we all feel as a yoke.`;
  const report = isValidEventContent(content);
  // TODO: According to spec this should be false but it seems other clients don't care
  expect(report.isValid).toBe(true);
});

/**
 * EXTRACT
 */

test("extractEventContent: relay", () => {
  const content = "wss://relay.example.com";
  const res = extractEventContent(content);
  expect(res).toEqual({
    message: undefined,
    nurls: [],
    relayUrl: "wss://relay.example.com",
  });
});

test("Test extract without result", () => {
  const content = "Here's whats on nostr: cool stuff";
  const res = extractEventContent(content);
  expect(res).toEqual(undefined);
});

test("extractEventContent: nostr", () => {
  const content =
    "Profile is impersonating nostr:npub14vgamf2zucjlrxrp9tuudutklyt9ny8at3g5t6d4z7zs22g7gjqsujasrr";
  const res = extractEventContent(content);
  expect(res).toEqual({
    message:
      "Profile is impersonating ab11dda542e625f198612af9c6f176f9165990fd5c5145e9b5178505291e4481",

    nurls: [
      {
        type: "npub",
        publicKeys: [
          "ab11dda542e625f198612af9c6f176f9165990fd5c5145e9b5178505291e4481",
        ],
        relayUrls: [],
      },
    ],
  });
});

test("extractEventContent: nostr x2", () => {
  const content =
    "Checkout these guys nostr:npub14vgamf2zucjlrxrp9tuudutklyt9ny8at3g5t6d4z7zs22g7gjqsujasrr nostr:npub1stemstrls4f5plqeqkeq43gtjhtycuqd9w25v5r5z5ygaq2n2sjsd6mul5 later";
  const res = extractEventContent(content);

  expect(res).toEqual({
    message:
      "Checkout these guys ab11dda542e625f198612af9c6f176f9165990fd5c5145e9b5178505291e4481 82f3b82c7f855340fc1905b20ac50b95d64c700d2b9546507415088e81535425 later",
    nurls: [
      {
        type: "npub",
        publicKeys: [
          "ab11dda542e625f198612af9c6f176f9165990fd5c5145e9b5178505291e4481",
          "82f3b82c7f855340fc1905b20ac50b95d64c700d2b9546507415088e81535425",
        ],
        relayUrls: [],
      },
    ],
    relayUrl: undefined,
  });
});

test("extractEventContent: nprofile", () => {
  const content =
    "Checkout nostr:nprofile1qqsrhuxx8l9ex335q7he0f09aej04zpazpl0ne2cgukyawd24mayt8gpp4mhxue69uhhytnc9e3k7mgpz4mhxue69uhkg6nzv9ejuumpv34kytnrdaksjlyr9p later";
  const res = extractEventContent(content);

  expect(res).toEqual({
    message:
      "Checkout 3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d later",
    nurls: [
      {
        type: "npub",
        publicKeys: [
          "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
        ],
        relayUrls: ["wss://r.x.com", "wss://djbas.sadkb.com"],
      },
    ],
    relayUrl: undefined,
  });
});

/**
 * CREATE
 */

test("createEventContent", () => {
  const content = "Here's whats on nostr: cool stuff";
  const res = createEventContent({
    message: content,
  });
  expect(res).toEqual("Here's whats on nostr: cool stuff");
});

test("createEventContent: relay", () => {
  const content = "wss://relay.example.com";
  const res = createEventContent({
    relayUrl: "wss://relay.example.com",
  });
  expect(res).toEqual("wss://relay.example.com");
});
