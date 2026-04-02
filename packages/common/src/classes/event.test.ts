import {
  NEvent,
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
