import {
  NEvent,
  NewLongFormContent,
  NewReaction,
  NewShortTextNote,
  NewShortTextNoteResponse,
  eventHasExpiration,
  eventHasLabels,
  eventHasNonce,
  eventHasRelayRecommendation,
  generateClientKeys,
} from "..";

const keypair_one = generateClientKeys();
const keypair_two = generateClientKeys();

test("NewShortTextNote", () => {
  const ev = NewShortTextNote({
    text: "Hello",
    subject: "Welcome to Nostr",
  });

  expect(ev.content).toEqual("Hello");
  expect(ev.hasSubjectTag()).toEqual("Welcome to Nostr");
  expect(ev.created_at).toBeDefined();
  expect(ev.kind).toEqual(1);

  ev.signAndGenerateId(keypair_one);

  const hasValidId = ev.id && ev.id.length === 64;

  expect(hasValidId).toEqual(true);

  const hasValidPubKey = ev.pubkey && ev.pubkey.length === 64;
  expect(hasValidPubKey).toEqual(true);

  const hasValidSignature = ev.sig && ev.sig.length === 128;
  expect(hasValidSignature).toEqual(true);
});

test("NewShortTextNoteResponse", () => {
  const ev = NewShortTextNote({
    text: "Hello",
    subject: "Welcome to Nostr",
  });

  ev.signAndGenerateId(keypair_one);

  const evR = NewShortTextNoteResponse({
    text: "Hello Nostr",
    inResponseTo: ev,
  });

  evR.signAndGenerateId(keypair_two);

  expect(evR.content).toEqual("Hello Nostr");
  expect(evR.hasSubjectTag()).toEqual("Re: Welcome to Nostr");

  const eventTags = evR.tags?.filter((tag) => tag[0] === "e");
  expect(eventTags?.length).toEqual(1);
  expect(eventTags?.[0]).toEqual(["e", ev.id, "", "root"]);

  const publicKeyTags = evR.tags?.filter((tag) => tag[0] === "p");
  expect(publicKeyTags?.length).toEqual(1);
  expect(publicKeyTags?.[0]).toEqual(["p", keypair_one.publicKey]);
});

test("NewReaction", () => {
  const ev = NewShortTextNote({
    text: "Hello",
    subject: "Welcome to Nostr",
  });

  ev.signAndGenerateId(keypair_one);

  const evR = NewReaction({
    text: "+",
    inResponseTo: ev,
  });

  evR.signAndGenerateId(keypair_two);

  expect(evR.kind).toEqual(7);

  expect(evR.content).toEqual("+");
  expect(evR.hasSubjectTag()).toEqual(undefined);

  const eventTags = evR.tags?.filter((tag) => tag[0] === "e");
  expect(eventTags?.length).toEqual(1);
  expect(eventTags?.[0]).toEqual(["e", ev.id]);

  const publicKeyTags = evR.tags?.filter((tag) => tag[0] === "p");
  expect(publicKeyTags?.length).toEqual(1);
  expect(publicKeyTags?.[0]).toEqual(["p", keypair_one.publicKey]);

  const report = ev.isReadyToPublish();
  expect(report.isReady).toEqual(true);
});

test("NewLongFormContent", () => {
  const ev = NewLongFormContent({
    text: "Hello everyone",
  });

  ev.signAndGenerateId(keypair_one);

  const report = ev.isReadyToPublish();
  expect(report.isReady).toEqual(true);
});

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
