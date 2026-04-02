import {
  NEvent,
  NEVENT_KIND,
  generateClientKeys,
  NewShortTextNote,
  NewLongFormContent,
  NewShortTextNoteResponse,
  NewReaction,
  NewQuoteRepost,
  NewGenericRepost,
  NewUpdateUserMetadata,
  NewRecommendRelay,
  NewReport,
  NewZapRequest,
  NewZapReceipt,
  NewEventDeletion,
  NewAuthEvent,
  NewEncryptedPrivateMessage,
  NewContactList,
  NREPORT_KIND,
} from "..";

const keypair = generateClientKeys();

test("NewShortTextNote: correct kind, content, and subject tag", () => {
  const ev = NewShortTextNote({ text: "lifecycle test", subject: "Test" });
  expect(ev.kind).toEqual(NEVENT_KIND.SHORT_TEXT_NOTE);
  expect(ev.content).toEqual("lifecycle test");
  expect(ev.hasSubjectTag()).toEqual("Test");
  expect(ev.created_at).toBeDefined();
});

test("NewLongFormContent: published (30023) and draft (30024)", () => {
  const published = NewLongFormContent({ text: "Long form article" });
  expect(published.kind).toEqual(NEVENT_KIND.LONG_FORM_CONTENT);
  expect(published.content).toEqual("Long form article");

  const draft = NewLongFormContent({ text: "Draft article", isDraft: true });
  expect(draft.kind).toEqual(NEVENT_KIND.DRAFT_LONG_FORM_CONTENT);
  expect(draft.content).toEqual("Draft article");
});

test("NewShortTextNoteResponse: correct e-tags and p-tags", () => {
  const original = NewShortTextNote({ text: "Root note", subject: "Thread" });
  original.signAndGenerateId(keypair);

  const keypairTwo = generateClientKeys();
  const reply = NewShortTextNoteResponse({
    text: "Reply text",
    inResponseTo: original,
    relayUrl: "wss://relay.example.com",
  });
  reply.signAndGenerateId(keypairTwo);

  expect(reply.content).toEqual("Reply text");
  expect(reply.hasSubjectTag()).toEqual("Re: Thread");
  expect(reply.pubkey).toEqual(keypairTwo.publicKey);
  expect(reply.tags).toContainEqual([
    "e",
    original.id,
    "wss://relay.example.com",
    "root",
  ]);
  expect(
    reply.tags?.find((t) => t[0] === "p" && t[1] === keypair.publicKey)
  ).toBeDefined();
});

test("NewReaction: valid '+' reaction has correct tags, invalid text throws", () => {
  const original = NewShortTextNote({ text: "Likeable note" });
  original.signAndGenerateId(keypair);

  const reaction = NewReaction({ text: "+", inResponseTo: original });
  expect(reaction.kind).toEqual(NEVENT_KIND.REACTION);
  expect(reaction.content).toEqual("+");
  expect(reaction.tags).toContainEqual(["e", original.id]);
  expect(reaction.tags).toContainEqual(["p", keypair.publicKey]);

  expect(() => {
    NewReaction({ text: "heart", inResponseTo: original });
  }).toThrow("Reaction must be either '+' or '-'");

  expect(() => {
    NewReaction({ text: "", inResponseTo: original });
  }).toThrow("Reaction must be either '+' or '-'");
});

test("NewQuoteRepost: content is JSON of original, correct tags", () => {
  const original = NewShortTextNote({ text: "Repostable note" });
  original.signAndGenerateId(keypair);

  const repost = NewQuoteRepost({
    inResponseTo: original,
    relayUrl: "wss://relay.example.com",
  });

  expect(repost.kind).toEqual(NEVENT_KIND.REPOST);

  const parsed = JSON.parse(repost.content);
  expect(parsed.id).toEqual(original.id);
  expect(parsed.content).toEqual("Repostable note");
  expect(parsed.relay).toEqual("wss://relay.example.com");

  expect(repost.tags).toContainEqual([
    "e",
    original.id,
    "wss://relay.example.com",
  ]);
  expect(repost.tags).toContainEqual([
    "p",
    keypair.publicKey,
    "wss://relay.example.com",
  ]);
});

test("NewGenericRepost: includes kind tag", () => {
  const original = new NEvent({
    content: "Some non-note event",
    kind: NEVENT_KIND.LONG_FORM_CONTENT,
  });
  original.signAndGenerateId(keypair);

  const repost = NewGenericRepost({
    inResponseTo: original,
    relayUrl: "wss://relay.example.com",
  });

  expect(repost.kind).toEqual(NEVENT_KIND.GENERIC_REPOST);
  expect(repost.tags).toContainEqual([
    "k",
    NEVENT_KIND.LONG_FORM_CONTENT.toString(),
  ]);
  expect(repost.tags?.find((t) => t[0] === "e")).toBeDefined();
  expect(repost.tags?.find((t) => t[0] === "p")).toBeDefined();
});

test("NewUpdateUserMetadata: serializes metadata to content JSON", () => {
  const ev = NewUpdateUserMetadata({
    userMetadata: {
      name: "TestUser",
      about: "A test user",
      picture: "https://example.com/avatar.png",
    },
  });

  expect(ev.kind).toEqual(NEVENT_KIND.METADATA);

  const parsed = JSON.parse(ev.content);
  expect(parsed.name).toEqual("TestUser");
  expect(parsed.about).toEqual("A test user");
  expect(parsed.picture).toEqual("https://example.com/avatar.png");
});

test("NewRecommendRelay: valid WebSocket URL accepted", () => {
  const ev = NewRecommendRelay({ relayUrl: "wss://relay.example.com" });
  expect(ev.kind).toEqual(NEVENT_KIND.RECOMMEND_RELAY);
  expect(ev.content).toEqual("wss://relay.example.com");
});

test("NewRecommendRelay: throws on invalid URL", () => {
  expect(() => {
    NewRecommendRelay({ relayUrl: "https://relay.example.com" });
  }).toThrow();

  expect(() => {
    NewRecommendRelay({ relayUrl: "not-a-url" });
  }).toThrow();
});

test("NewReport: correct report tags", () => {
  const ev = NewReport({
    publicKey: keypair.publicKey,
    kind: NREPORT_KIND.SPAM,
    content: "This is spam",
  });

  expect(ev.kind).toEqual(NEVENT_KIND.REPORTING);
  expect(ev.content).toEqual("This is spam");
  expect(ev.tags).toContainEqual([
    "p",
    keypair.publicKey,
    NREPORT_KIND.SPAM,
  ]);
});

test("NewZapRequest: has amount, lnurl, p-tag, relays tag", () => {
  const recipientKeypair = generateClientKeys();
  const ev = NewZapRequest({
    recipientPubkey: recipientKeypair.publicKey,
    amount: 1000,
    lnurl:
      "lnurl1dp68gurn8ghj7mrww4exctt5dahkccn00qhxget8wfjk2um0veax2un09e3k7mf0w5lhz0t9xcekzv34xgmkxdf4",
    relayUrls: ["wss://relay.example.com"],
    eventId: "abc123",
  });

  expect(ev.kind).toEqual(NEVENT_KIND.ZAP_REQUEST);
  expect(ev.tags).toContainEqual(["p", recipientKeypair.publicKey]);
  expect(ev.tags).toContainEqual(["amount", "1000"]);
  expect(ev.tags).toContainEqual(["e", "abc123"]);
  expect(ev.tags?.find((t) => t[0] === "lnurl")).toBeDefined();
  expect(
    ev.tags?.find(
      (t) => t[0] === "relays" && t.includes("wss://relay.example.com")
    )
  ).toBeDefined();
});

test("NewEventDeletion: with event IDs", () => {
  const ev1 = NewShortTextNote({ text: "Delete me" });
  ev1.signAndGenerateId(keypair);

  const ev2 = NewShortTextNote({ text: "Delete me too" });
  ev2.signAndGenerateId(keypair);

  const deletion = NewEventDeletion({
    text: "removing old notes",
    events: [ev1, ev2],
  });

  expect(deletion.kind).toEqual(NEVENT_KIND.EVENT_DELETION);
  expect(deletion.tags).toContainEqual(["e", ev1.id]);
  expect(deletion.tags).toContainEqual(["e", ev2.id]);
});

test("NewEventDeletion: with event coordinates (useEventCoordinatesTags)", () => {
  const ev = new NEvent({
    content: "Replaceable content",
    kind: NEVENT_KIND.LONG_FORM_CONTENT,
  });
  ev.signAndGenerateId(keypair);
  ev.addIdentifierTag("test-id");

  const deletion = NewEventDeletion({
    text: "removing replaceable event",
    events: [ev],
    useEventCoordinatesTags: true,
  });

  expect(deletion.kind).toEqual(NEVENT_KIND.EVENT_DELETION);
  expect(deletion.tags?.length).toBeGreaterThanOrEqual(1);

  const coordTag = deletion.tags?.[0][0];
  expect(coordTag).toContain(`a:${NEVENT_KIND.LONG_FORM_CONTENT}`);
  expect(coordTag).toContain(keypair.publicKey);
  expect(coordTag).toContain("test-id");
});

test("NewAuthEvent: has relay and challenge tags", () => {
  const ev = NewAuthEvent({
    relayUrl: "wss://relay.example.com",
    challenge: "random-challenge-string",
  });

  expect(ev.kind).toEqual(NEVENT_KIND.CLIENT_AUTHENTICATION);
  expect(ev.tags).toContainEqual(["relay", "wss://relay.example.com"]);
  expect(ev.tags).toContainEqual(["challenge", "random-challenge-string"]);
});

test("NewEncryptedPrivateMessage: has p-tag for recipient", () => {
  const recipientKeypair = generateClientKeys();
  const ev = NewEncryptedPrivateMessage({
    text: "secret message",
    recipientPubkey: recipientKeypair.publicKey,
  });

  expect(ev.kind).toEqual(NEVENT_KIND.ENCRYPTED_DIRECT_MESSAGES);
  expect(ev.tags).toContainEqual(["p", recipientKeypair.publicKey]);
});

test("NewContactList: p-tags for each contact", () => {
  const contact1 = generateClientKeys();
  const contact2 = generateClientKeys();

  const ev = NewContactList({
    contacts: [
      {
        key: contact1.publicKey,
        relayUrl: "wss://relay1.example.com",
        petname: "alice",
      },
      { key: contact2.publicKey, petname: "bob" },
    ],
  });

  expect(ev.kind).toEqual(NEVENT_KIND.CONTACTS);

  const pTags = ev.tags?.filter((t) => t[0] === "p");
  expect(pTags?.length).toEqual(2);
  expect(pTags?.[0][1]).toEqual(contact1.publicKey);
  expect(pTags?.[0][2]).toEqual("wss://relay1.example.com");
  expect(pTags?.[0][3]).toEqual("alice");
  expect(pTags?.[1][1]).toEqual(contact2.publicKey);
  expect(pTags?.[1][3]).toEqual("bob");
});

test("isReadyToPublish rejects unsigned events", () => {
  const ev = NewShortTextNote({ text: "Unsigned note" });
  const report = ev.isReadyToPublish();
  expect(report.isReady).toEqual(false);
  expect(report.reason).toBeDefined();
});

test("ToObj excludes undefined fields", () => {
  const ev = new NEvent({
    content: "Hello",
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
  });

  const obj = ev.ToObj();
  for (const key of Object.keys(obj)) {
    expect(obj[key]).not.toBeUndefined();
  }
});

