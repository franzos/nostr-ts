import { NEVENT_KIND } from "../types";
import { extractEventContent, isValidEventContent } from "./event-content";

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

describe("extractEventContent media", () => {
  test("With optional query parameters", () => {
    const singleProviderRegex =
      /https?:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{6,11}(?:\?[a-zA-Z0-9_=&-]+)?/g;
    const source = "https://www.youtube.com/watch?v=1rTOa-jV4FI";
    const res = source.match(singleProviderRegex);
    expect(res).toEqual(["https://www.youtube.com/watch?v=1rTOa-jV4FI"]);
  });

  test("Content with Youtube link", () => {
    const source =
      "Los Monstruitos - La Quintaesencia del Proletariado https://www.youtube.com/watch?v=1rTOa-jV4FI";
    const res = extractEventContent(source);
    expect(res).toEqual({
      images: undefined,
      videos: ["https://www.youtube.com/watch?v=1rTOa-jV4FI"],
      notes: undefined,
      tags: undefined,
      text: "Los Monstruitos - La Quintaesencia del Proletariado",
    });
  });

  test("Content with Youtube link with query string", () => {
    const source =
      "Who saw Saylor‘s recent speech @ BTC Innsbruck Sep 15th??\n\nSheerly alpine mountain moving developments since 2019 & what we may experience immediately ahead ✨ 🏔️ \nBig gratitude, for we are time witnesses to epochal changes 🙏 \nBest time is NOW in life to paving a fulfilling & peaceful future for our descendants ❤️ 💫\n#Bitcoin #Plebchain #UnleashYourGreatness #TheFutureIsBright #Saylor #BTC23\n\nhttps://youtu.be/4A85xqurZP8?feature=shared";
    const res = extractEventContent(source);
    expect(res).toEqual({
      images: undefined,
      videos: ["https://www.youtube.com/watch?v=4A85xqurZP8?feature=shared"],
      notes: undefined,
      tags: [
        "#Bitcoin",
        "#Plebchain",
        "#UnleashYourGreatness",
        "#TheFutureIsBright",
        "#Saylor",
        "#BTC23",
      ],
      text: "Who saw Saylor‘s recent speech @ BTC Innsbruck Sep 15th??\n\nSheerly alpine mountain moving developments since 2019 & what we may experience immediately ahead ✨ 🏔️ \nBig gratitude, for we are time witnesses to epochal changes 🙏 \nBest time is NOW in life to paving a fulfilling & peaceful future for our descendants ❤️ 💫\n#Bitcoin #Plebchain #UnleashYourGreatness #TheFutureIsBright #Saylor #BTC23",
    });
  });

  test("Content with image and tags", () => {
    const source =
      "Anything we can do about the very chopped conifers on the other side? https://www.allforgardening.com/620312/anything-we-can-do-about-the-very-chopped-conifers-on-the-other-side/ #gardeninguk https://media.vive.im/media_attachments/files/111/111/061/177/106/314/original/3b7d17ab106cfab9.jpg";
    const res = extractEventContent(source);
    expect(res).toEqual({
      images: [
        "https://media.vive.im/media_attachments/files/111/111/061/177/106/314/original/3b7d17ab106cfab9.jpg",
      ],
      videos: undefined,
      notes: undefined,
      tags: ["#gardeninguk"],
      text: "Anything we can do about the very chopped conifers on the other side? https://www.allforgardening.com/620312/anything-we-can-do-about-the-very-chopped-conifers-on-the-other-side/ #gardeninguk",
    });
  });

  test("Content with image and npub", () => {
    const source =
      "Not very reliable. Is this a regular thing with nostr:npub1mutnyacc9uc4t5mmxvpprwsauj5p2qxq95v4a9j0jxl8wnkfvuyque23vg?\n\n\n\nhttps://image.nostr.build/adc172a180fd597c78df65fb816d86fadc243c410aee78d9fecf32d7a63ef877.jpg";
    const res = extractEventContent(source);
    expect(res).toEqual({
      images: [
        "https://image.nostr.build/adc172a180fd597c78df65fb816d86fadc243c410aee78d9fecf32d7a63ef877.jpg",
      ],
      videos: undefined,
      notes: undefined,
      nurls: [
        {
          type: "npub",
          data: "1mutnyacc9uc4t5mmxvpprwsauj5p2qxq95v4a9j0jxl8wnkfvuyque23vg",
        },
      ],
      tags: undefined,
      text: "Not very reliable. Is this a regular thing with nostr:npub1mutnyacc9uc4t5mmxvpprwsauj5p2qxq95v4a9j0jxl8wnkfvuyque23vg?",
    });
  });
});
