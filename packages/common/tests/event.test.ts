import {
  NewReaction,
  NewShortTextNote,
  NewShortTextNoteResponse,
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
