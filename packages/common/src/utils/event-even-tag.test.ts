import { NEvent } from "../classes/event";
import {
  eventHasPositionalEventTag,
  eventHasPositionalEventTags,
} from "./event-event";

test("eventHasEventTags", () => {
  const orig = {
    id: "834208b49d2c50557d568263364ced175bb2562274b67c3f80a0d72791414177",
    pubkey: "78e47dfe683faf1869a5378aa4b4a52d768d799bd8eb38099c0b194f56727f35",
    created_at: 1692825846,
    kind: 1,
    tags: [
      [
        "e",
        "de64876043e27b1176f7b23c23eaeca155886bab696c9a8a277b24f02c93be8c",
        "",
        "root",
      ],
      [
        "e",
        "ae2eee89b07b0c0707d2d795cbb4d07947fa9868e7529442212d1b196c0cf47c",
        "",
        "reply",
      ],
      ["p", "78e47dfe683faf1869a5378aa4b4a52d768d799bd8eb38099c0b194f56727f35"],
      ["p", "fcf70a45cfa817eaa813b9ba8a375d713d3169f4a27f3dcac3d49112df67d37e"],
    ],
    content:
      "I agree but thats why I said,  too many people underestimate the enemy.\n\nThey have started wars and assassinated presidents over this power, this will not go smoothly (if indeed this is real rebellion)",
    sig: "36a3442cc38c6367ffb80bd9988a263a37aaedc4103aa3640bae58715cc7b8be7890140fa72cd01bad3b198c865e80964f3ee40beb1a458e3b7141f44ecfd9d9",
  };

  const ev = new NEvent(orig);
  // Check for deprecated tags
  const hasPositionalTag = eventHasPositionalEventTag(ev);
  expect(hasPositionalTag).toEqual(false);

  // Check for new tags
  const hasEventTag = ev.hasEventTags();
  expect(hasEventTag).toEqual([
    {
      eventId:
        "de64876043e27b1176f7b23c23eaeca155886bab696c9a8a277b24f02c93be8c",
      relayUrl: "",
      marker: "root",
    },
    {
      eventId:
        "ae2eee89b07b0c0707d2d795cbb4d07947fa9868e7529442212d1b196c0cf47c",
      relayUrl: "",
      marker: "reply",
    },
  ]);

  const hasPublicKeyTags = ev.hasPublicKeyTags();
  expect(hasPublicKeyTags).toEqual([
    ["78e47dfe683faf1869a5378aa4b4a52d768d799bd8eb38099c0b194f56727f35"],
    ["fcf70a45cfa817eaa813b9ba8a375d713d3169f4a27f3dcac3d49112df67d37e"],
  ]);
});

test("eventHasEventTags: #2", () => {
  const orig = {
    id: "ae7d77a1ecde851d14e40d7acb3e49e69bc658bae4eea8f056e805ce904cedb2",
    pubkey: "8c59239319637f97e007dad0d681e65ce35b1ace333b629e2d33f9465c132608",
    created_at: 1692267918,
    kind: 1,
    tags: [
      [
        "e",
        "4c7339c9ea23adff5140b0747b58d646dc41e5575900630e9a019a12e331a764",
        "",
        "root",
      ],
      ["p", "8c59239319637f97e007dad0d681e65ce35b1ace333b629e2d33f9465c132608"],
      ["r", "https://nnn.ed.jp/news/blog/archives/10023/"],
    ],
    content:
      "これだ。期間限定だったのか。結構中身良かった記憶あります https://nnn.ed.jp/news/blog/archives/10023/",
    sig: "a9b3f7c993eaef0d28a62f7a965811348e7003c1c96356c27c4abbf4c8fa0ffed2aeb3a22c9440c2e4fbfa7fba0338c1bf93cff0ea09477d5fe1ae2460213769",
  };

  const ev = new NEvent(orig);
  // Check for deprecated tags
  const hasPositionalTag = eventHasPositionalEventTag(ev);
  expect(hasPositionalTag).toBe(false);

  // Check for new tags
  const hasEventTag = ev.hasEventTags();
  expect(hasEventTag).toEqual([
    {
      eventId:
        "4c7339c9ea23adff5140b0747b58d646dc41e5575900630e9a019a12e331a764",
      relayUrl: "",
      marker: "root",
    },
  ]);
});

test("eventHasEventTags: legacy", () => {
  const orig = {
    id: "6b9da693a00ce41815129c6fa85bf5efafba42e3f91c10dadb64ba5caf133916",
    pubkey: "09d49f47081c1a06f04afda62988e3253247a8c96c1d4ef025dc7619dbc23942",
    created_at: 1692958312,
    kind: 1,
    tags: [
      ["e", "80578fa54977b958e687f47e9bde5e9c000e52fd5ad4a4792860e0282015c3ee"],
      ["p", "a723805cda67251191c8786f4da58f797e6977582301354ba8e91bcb0342dc9c"],
    ],
    content: "Good morning Seth 🤙",
    sig: "15a9e1954929109f7a2b1e91765f24508b16bdd6bd95ed89127f18d36a549536b3359024d9d0491858890b998fcac9249cc7e75988ac83a1506e18c51491a445",
  };

  const ev = new NEvent(orig);
  // Check for deprecated tags
  const hasPositionalTag = eventHasPositionalEventTag(ev);
  expect(hasPositionalTag).toBe(true);

  const tags = eventHasPositionalEventTags(ev);
  expect(tags).toEqual([
    {
      eventId:
        "80578fa54977b958e687f47e9bde5e9c000e52fd5ad4a4792860e0282015c3ee",
      relayUrl: "",
      marker: "root",
    },
  ]);
});

test("eventHasEventTags: no tags", () => {
  const orig = {
    id: "834208b49d2c50557d568263364ced175bb2562274b67c3f80a0d72791414177",
    pubkey: "78e47dfe683faf1869a5378aa4b4a52d768d799bd8eb38099c0b194f56727f35",
    created_at: 1692825846,
    kind: 1,
    tags: [],
    content:
      "I agree but thats why I said,  too many people underestimate the enemy.\n\nThey have started wars and assassinated presidents over this power, this will not go smoothly (if indeed this is real rebellion)",
    sig: "36a3442cc38c6367ffb80bd9988a263a37aaedc4103aa3640bae58715cc7b8be7890140fa72cd01bad3b198c865e80964f3ee40beb1a458e3b7141f44ecfd9d9",
  };

  const ev = new NEvent(orig);
  // Check for deprecated tags
  const hasPositionalTag = eventHasPositionalEventTag(ev);
  expect(hasPositionalTag).toBe(false);

  // Check for new tags
  const hasEventTag = ev.hasEventTags();
  expect(hasEventTag).toBe(undefined);

  const hasPublicKeyTags = ev.hasPublicKeyTags();
  expect(hasPublicKeyTags).toBe(undefined);
});
