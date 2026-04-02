import {
  NEvent,
  NewLabel,
  NewClassifiedListing,
  NEVENT_KIND,
  eventHasExpiration,
  eventHasLabels,
  eventHasNonce,
  eventHasRelayRecommendation,
} from "..";

test("eventHasContentWarning", () => {
  const ev = new NEvent({
    kind: 1,
    content: "Hello",
    tags: [["content-warning", "reason"]],
  });
  const hasContentWarning = ev.hasContentWarningTag();
  expect(hasContentWarning).toEqual("reason");
});

test("eventHasContentWarning type 2", () => {
  const ev = new NEvent({
    kind: 1,
    content: "Hello",
    tags: [["l", "reason", "content-warning"]],
  });
  const hasContentWarning = ev.hasContentWarningTag();
  expect(hasContentWarning).toEqual("reason");
});

test("eventHasExpiration", () => {
  const ev = new NEvent({
    kind: 1,
    content: "Hello",
    tags: [["expiration", "1691155999"]],
  });
  const hasExpiration = eventHasExpiration(ev);
  expect(hasExpiration).toEqual(1691155999);
  expect(hasExpiration).toEqual(ev.hasExpirationTag());
});

test("eventHasLabels", () => {
  const ev = new NEvent({
    kind: 1,
    content: "Hello",
    tags: [
      ["l", "label1", "label2"],
      ["L", "label3", "label4"],
    ],
  });
  const hasLabels = eventHasLabels(ev);
  expect(hasLabels).toEqual({
    labelTags: [["l", "label1", "label2"]],
    labelNamespace: [["L", "label3", "label4"]],
  });
});

test("eventHasRelayRecommendation", () => {
  const ev = new NEvent({
    kind: 2,
    content: "wss://relay.example.com",
  });
  const hasRelayRecommendation = eventHasRelayRecommendation(ev);
  expect(hasRelayRecommendation).toEqual("wss://relay.example.com");
});

test("eventHasRelayRecommendation: wrong kind", () => {
  const ev = new NEvent({
    kind: 1,
    content: "wss://relay.example.com",
  });
  const hasRelayRecommendation = eventHasRelayRecommendation(ev);
  expect(hasRelayRecommendation).toEqual(undefined);
});

test("eventHasRelayRecommendation: invalid url", () => {
  const ev = new NEvent({
    kind: 2,
    content: "wts://relay.example.com",
  });
  const hasRelayRecommendation = eventHasRelayRecommendation(ev);
  expect(hasRelayRecommendation).toEqual(undefined);
});

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

/**
 * NIP-32: NewLabel
 */

test("NewLabel with event target", () => {
  const ev = NewLabel({
    labels: [{ value: "MIT", namespace: "license" }],
    eventTags: [{ eventId: "abc123", relayUrl: "wss://relay.example.com" }],
  });

  expect(ev.kind).toEqual(NEVENT_KIND.LABEL);
  expect(ev.tags).toContainEqual(["L", "license"]);
  expect(ev.tags).toContainEqual(["l", "MIT", "license"]);
  expect(ev.tags).toContainEqual(["e", "abc123", "wss://relay.example.com"]);
});

test("NewLabel with pubkey targets", () => {
  const ev = NewLabel({
    labels: [{ value: "permies", namespace: "#t" }],
    pubkeys: [
      { pubkey: "pubkey1", relayUrl: "wss://r.x.com" },
      { pubkey: "pubkey2" },
    ],
  });

  expect(ev.tags).toContainEqual(["L", "#t"]);
  expect(ev.tags).toContainEqual(["l", "permies", "#t"]);
  expect(ev.tags).toContainEqual(["p", "pubkey1", "wss://r.x.com"]);
  expect(ev.tags).toContainEqual(["p", "pubkey2"]);
});

test("NewLabel with multiple namespaces", () => {
  const ev = NewLabel({
    labels: [
      { value: "en", namespace: "ISO-639-1" },
      { value: "IT-MI", namespace: "ISO-3166-2" },
    ],
    urls: ["https://example.com"],
  });

  expect(ev.tags).toContainEqual(["L", "ISO-639-1"]);
  expect(ev.tags).toContainEqual(["L", "ISO-3166-2"]);
  expect(ev.tags).toContainEqual(["l", "en", "ISO-639-1"]);
  expect(ev.tags).toContainEqual(["l", "IT-MI", "ISO-3166-2"]);
  expect(ev.tags).toContainEqual(["r", "https://example.com"]);
});

test("NewLabel deduplicates namespace L tags", () => {
  const ev = NewLabel({
    labels: [
      { value: "label1", namespace: "ns" },
      { value: "label2", namespace: "ns" },
    ],
    topics: ["nostr"],
  });

  const lTags = ev.tags.filter((t) => t[0] === "L");
  expect(lTags).toHaveLength(1);
  expect(lTags[0]).toEqual(["L", "ns"]);

  const labelTags = ev.tags.filter((t) => t[0] === "l");
  expect(labelTags).toHaveLength(2);
});

test("NewLabel with topic and URL targets", () => {
  const ev = NewLabel({
    labels: [{ value: "approve", namespace: "nip28.moderation" }],
    topics: ["nostr"],
    urls: ["wss://relay.damus.io"],
  });

  expect(ev.tags).toContainEqual(["t", "nostr"]);
  expect(ev.tags).toContainEqual(["r", "wss://relay.damus.io"]);
});

test("NewLabel with content description", () => {
  const ev = NewLabel({
    labels: [{ value: "VI-hum", namespace: "com.example.ontology" }],
    content: "Detailed report of violent content",
    eventTags: [{ eventId: "abc123" }],
  });

  expect(ev.content).toEqual("Detailed report of violent content");
});

test("NewLabel throws without labels", () => {
  expect(() =>
    NewLabel({
      labels: [],
      topics: ["test"],
    })
  ).toThrow("At least one label is required.");
});

test("NewLabel throws without targets", () => {
  expect(() =>
    NewLabel({
      labels: [{ value: "test", namespace: "ns" }],
    })
  ).toThrow("At least one target is required");
});

test("eventHasLabels detects NewLabel output", () => {
  const ev = NewLabel({
    labels: [{ value: "MIT", namespace: "license" }],
    eventTags: [{ eventId: "abc123" }],
  });

  const result = eventHasLabels(ev);
  expect(result).toBeDefined();
  expect(result.labelTags).toContainEqual(["l", "MIT", "license"]);
  expect(result.labelNamespace).toContainEqual(["L", "license"]);
});

/**
 * NIP-99: NewClassifiedListing
 */

test("NewClassifiedListing creates active listing", () => {
  const ev = NewClassifiedListing({
    content: "Selling a used laptop in great condition.",
    identifier: "laptop-sale",
    title: "Used Laptop",
    summary: "Great condition, barely used",
    price: { amount: "500", currency: "USD" },
    location: "NYC",
    publishedAt: "1296962229",
  });

  expect(ev.kind).toEqual(NEVENT_KIND.CLASSIFIED_LISTING);
  expect(ev.content).toEqual("Selling a used laptop in great condition.");
  expect(ev.tags).toContainEqual(["d", "laptop-sale"]);
  expect(ev.tags).toContainEqual(["title", "Used Laptop"]);
  expect(ev.tags).toContainEqual(["summary", "Great condition, barely used"]);
  expect(ev.tags).toContainEqual(["price", "500", "USD"]);
  expect(ev.tags).toContainEqual(["location", "NYC"]);
  expect(ev.tags).toContainEqual(["published_at", "1296962229"]);
});

test("NewClassifiedListing creates draft listing", () => {
  const ev = NewClassifiedListing({
    content: "Draft listing",
    identifier: "draft-item",
    title: "Draft",
    summary: "A draft",
    price: { amount: "10", currency: "EUR" },
    isDraft: true,
  });

  expect(ev.kind).toEqual(NEVENT_KIND.DRAFT_CLASSIFIED_LISTING);
});

test("NewClassifiedListing with recurring price", () => {
  const ev = NewClassifiedListing({
    content: "Office space for rent",
    identifier: "office-rent",
    title: "Office Space",
    summary: "Downtown office",
    price: { amount: "2000", currency: "USD", frequency: "month" },
    location: "SF",
  });

  expect(ev.tags).toContainEqual(["price", "2000", "USD", "month"]);
});

test("NewClassifiedListing with images and tags", () => {
  const ev = NewClassifiedListing({
    content: "Vintage guitar for sale",
    identifier: "guitar-sale",
    title: "Vintage Guitar",
    summary: "1960s acoustic",
    price: { amount: "1500", currency: "USD" },
    images: [
      { url: "https://img.example.com/front.jpg", dimensions: "800x600" },
      { url: "https://img.example.com/back.jpg" },
    ],
    tags: ["music", "vintage"],
    status: "active",
    geohash: "u33dc1",
  });

  expect(ev.tags).toContainEqual([
    "image",
    "https://img.example.com/front.jpg",
    "800x600",
  ]);
  expect(ev.tags).toContainEqual([
    "image",
    "https://img.example.com/back.jpg",
  ]);
  expect(ev.tags).toContainEqual(["t", "music"]);
  expect(ev.tags).toContainEqual(["t", "vintage"]);
  expect(ev.tags).toContainEqual(["status", "active"]);
  expect(ev.tags).toContainEqual(["g", "u33dc1"]);
});

test("NewClassifiedListing throws without title", () => {
  expect(() =>
    NewClassifiedListing({
      content: "test",
      identifier: "test",
      title: "",
      summary: "test",
      price: { amount: "10", currency: "USD" },
    })
  ).toThrow("requires a title");
});

test("NewClassifiedListing throws without identifier", () => {
  expect(() =>
    NewClassifiedListing({
      content: "test",
      identifier: "",
      title: "Test",
      summary: "test",
      price: { amount: "10", currency: "USD" },
    })
  ).toThrow("requires an identifier");
});

test("NewClassifiedListing throws without price", () => {
  expect(() =>
    NewClassifiedListing({
      content: "test",
      identifier: "test",
      title: "Test",
      summary: "test",
      price: undefined as any,
    })
  ).toThrow("requires a price");
});
