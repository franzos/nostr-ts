import {
  NEvent,
  NewLabel,
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
