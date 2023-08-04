import {
  NEvent,
  NewReaction,
  NewShortTextNote,
  NewShortTextNoteResponse,
  createEventContent,
  eventHasRelayRecommendation,
  extractEventContent,
  generateClientKeys,
} from "../src";

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
  expect(eventTags?.[0]).toEqual(["e", ev.id]);

  const publicKeyTags = evR.tags?.filter((tag) => tag[0] === "p");
  expect(publicKeyTags?.length).toEqual(1);
  expect(publicKeyTags?.[0]).toEqual(["p", keypair_one.pub]);
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
  expect(publicKeyTags?.[0]).toEqual(["p", keypair_one.pub]);
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

test("eventHasReport", () => {
  const ev = new NEvent({
    kind: 1984,
    content: "Broke local law",
    tags: [
      [
        "e",
        "1234567890123456789012345678901234567890123456789012345678901234",
        "illegal",
      ],
      ["p", "1234567890123456789012345678901234567890123456789012345678901234"],
    ],
  });
  const hasReport = ev.hasReportTags();
  expect(hasReport).toEqual({
    eventId: "1234567890123456789012345678901234567890123456789012345678901234",
    kind: "illegal",
    publicKey:
      "1234567890123456789012345678901234567890123456789012345678901234",
    content: "Broke local law",
  });
});

test("eventHasReport: impersonation", () => {
  const ev = new NEvent({
    kind: 1984,
    content:
      "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234",
    tags: [
      [
        "p",
        "1234567890123456789012345678901234567890123456789012345678901234",
        "impersonation",
      ],
    ],
  });
  const hasReport = ev.hasReportTags();
  expect(hasReport).toEqual({
    kind: "impersonation",
    publicKey:
      "1234567890123456789012345678901234567890123456789012345678901234",
    content:
      "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234",
  });
});

test("extractEventContent: relay", () => {
  const content = "wss://relay.example.com";
  const res = extractEventContent(content);
  expect(res).toEqual({
    type: "relayUrl",
    relayUrl: "wss://relay.example.com",
  });
});

test("extractEventContent: nostr", () => {
  const content =
    "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234";
  const res = extractEventContent(content);
  expect(res).toEqual({
    message: "Profile is impersonating",
    type: "nostr",
    publicKeys: [
      "2234567890123456789012345678901234567890123456789012345678901234",
    ],
  });
});

test("extractEventContent: nostr x2", () => {
  const content =
    "Checkout these guys nostr:2234567890123456789012345678901234567890123456789012345678901234 nostr:2334567890123456789012345678901234567890123456789012345678901234 later";
  const res = extractEventContent(content);
  expect(res).toEqual({
    message: "Checkout these guys   later",
    type: "nostr",
    publicKeys: [
      "2234567890123456789012345678901234567890123456789012345678901234",
      "2334567890123456789012345678901234567890123456789012345678901234",
    ],
  });
});

test("extractEventContent: nothing", () => {
  const content = "Here's whats on nostr: cool stuff";
  const res = extractEventContent(content);
  expect(res).toEqual(undefined);
});

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
    type: "relayUrl",
    relayUrl: "wss://relay.example.com",
  });
  expect(res).toEqual("wss://relay.example.com");
});

test("createEventContent: nostr", () => {
  const content = "Profile is impersonating";
  const res = createEventContent({
    message: "Profile is impersonating",
    type: "nostr",
    publicKeys: [
      "2234567890123456789012345678901234567890123456789012345678901234",
    ],
  });
  expect(res).toEqual(
    "Profile is impersonating nostr:2234567890123456789012345678901234567890123456789012345678901234"
  );
});
