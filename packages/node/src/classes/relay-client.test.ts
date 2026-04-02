import {
  CLIENT_MESSAGE_TYPE,
  NFilters,
  NEvent,
  NEVENT_KIND,
  RELAY_MESSAGE_TYPE,
  NewShortTextNote,
  NewReaction,
  NewShortTextNoteResponse,
  generateClientKeys,
  verifyEvent,
} from "@nostr-ts/common";
import { RelayClient } from "./relay-client";

const RELAY_URL = process.env.RELAY_URL || "wss://localhost:8443";

function wait(s) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

function connectClient(): RelayClient {
  return new RelayClient([{ url: RELAY_URL, read: true, write: true }]);
}

const keypairA = generateClientKeys();
const keypairB = generateClientKeys();

// --- Connection lifecycle ---

test("RelayClient connect, disconnect", async () => {
  const client = connectClient();
  await wait(2);

  expect(client.relays.length).toBe(1);
  expect(client.relays[0].url).toBe(RELAY_URL);
  expect(client.relays[0].isConnected()).toBe(true);

  client.disconnect();
  await wait(2);

  expect(client.relays.length).toBe(0);
});

// --- Subscriptions ---

test("RelayClient subscribe and disconnect cleans up", async () => {
  const client = connectClient();
  await wait(2);

  expect(client.relays[0].isConnected()).toBe(true);

  client.subscribe({
    type: CLIENT_MESSAGE_TYPE.REQ,
    filters: new NFilters({ kinds: [1], limit: 1 }),
    options: { timeoutIn: 10000 },
  });

  await wait(1);
  expect(client.getSubscriptions().length).toBe(1);

  client.disconnect();
  await wait(2);

  expect(client.relays.length).toBe(0);
  expect(client.getSubscriptions().length).toBe(0);
}, 15000);

test("RelayClient subscription timeout marks inactive", async () => {
  const client = connectClient();
  await wait(2);

  client.subscribe({
    type: CLIENT_MESSAGE_TYPE.REQ,
    filters: new NFilters({ kinds: [1], limit: 1 }),
    options: { timeoutIn: 3000 },
  });

  await wait(1);
  expect(client.getSubscriptions().length).toBe(1);

  await wait(4);
  for (const sub of client.getSubscriptions()) {
    expect(sub.isActive).toBe(false);
  }

  client.disconnect();
  await wait(2);
}, 15000);

// --- Event publishing ---

test("RelayClient publish event and receive OK", async () => {
  const client = connectClient();
  await wait(2);

  const ev = NewShortTextNote({ text: "Integration test note" });
  ev.signAndGenerateId(keypairA);

  const received: any[] = [];
  client.listen((payload) => {
    received.push(payload.data);
  });

  const published = client.sendEvent({ event: ev });

  expect(published).toBeDefined();
  expect(published.length).toBe(1);
  expect(published[0].send).toBe(true);
  expect(published[0].relayUrl).toBe(RELAY_URL);

  // Wait for relay OK response
  await wait(2);

  const okMessage = received.find(
    (msg) => msg[0] === RELAY_MESSAGE_TYPE.OK && msg[1] === ev.id
  );
  expect(okMessage).toBeDefined();
  expect(okMessage[2]).toBe(true); // accepted

  client.disconnect();
  await wait(2);
}, 15000);

// --- Publish then subscribe and receive own event ---

test("RelayClient publish event, subscribe, and receive it back", async () => {
  const client = connectClient();
  await wait(2);

  // Publish
  const ev = NewShortTextNote({ text: "Roundtrip test " + Date.now() });
  ev.signAndGenerateId(keypairA);

  const received: any[] = [];
  client.listen((payload) => {
    received.push(payload.data);
  });

  client.sendEvent({ event: ev });
  await wait(1);

  // Subscribe for events by this author
  client.subscribe({
    type: CLIENT_MESSAGE_TYPE.REQ,
    filters: new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      authors: [keypairA.publicKey],
      limit: 10,
    }),
    options: { timeoutIn: 5000 },
  });

  await wait(3);

  // Should have received our event back
  const eventMessages = received.filter(
    (msg) => msg[0] === RELAY_MESSAGE_TYPE.EVENT
  );
  const ourEvent = eventMessages.find((msg) => msg[2]?.id === ev.id);

  expect(ourEvent).toBeDefined();
  expect(ourEvent[2].content).toBe(ev.content);
  expect(ourEvent[2].pubkey).toBe(keypairA.publicKey);

  // Verify the signature on the received event
  expect(verifyEvent(ourEvent[2])).toBe(true);

  client.disconnect();
  await wait(2);
}, 15000);

// --- Full social interaction flow ---

test("Publish note, react to it, and receive both via subscription", async () => {
  const client = connectClient();
  await wait(2);

  const received: any[] = [];
  client.listen((payload) => {
    received.push(payload.data);
  });

  // User A publishes a note
  const note = NewShortTextNote({ text: "React to this " + Date.now() });
  note.signAndGenerateId(keypairA);
  client.sendEvent({ event: note });
  await wait(1);

  // User B reacts to it
  const reaction = NewReaction({
    text: "+",
    inResponseTo: note.ToObj(),
  });
  reaction.signAndGenerateId(keypairB);
  client.sendEvent({ event: reaction });
  await wait(1);

  // Subscribe for both kinds from both authors
  client.subscribe({
    type: CLIENT_MESSAGE_TYPE.REQ,
    filters: new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE, NEVENT_KIND.REACTION],
      authors: [keypairA.publicKey, keypairB.publicKey],
      limit: 10,
    }),
    options: { timeoutIn: 5000 },
  });

  await wait(3);

  const events = received
    .filter((msg) => msg[0] === RELAY_MESSAGE_TYPE.EVENT)
    .map((msg) => msg[2]);

  // Find our note
  const receivedNote = events.find((e) => e.id === note.id);
  expect(receivedNote).toBeDefined();
  expect(receivedNote.kind).toBe(NEVENT_KIND.SHORT_TEXT_NOTE);
  expect(verifyEvent(receivedNote)).toBe(true);

  // Find the reaction
  const receivedReaction = events.find((e) => e.id === reaction.id);
  expect(receivedReaction).toBeDefined();
  expect(receivedReaction.kind).toBe(NEVENT_KIND.REACTION);
  expect(receivedReaction.content).toBe("+");
  expect(verifyEvent(receivedReaction)).toBe(true);

  // Reaction should reference the note via e-tag
  const eTag = receivedReaction.tags.find((t) => t[0] === "e");
  expect(eTag[1]).toBe(note.id);

  client.disconnect();
  await wait(2);
}, 20000);

// --- Reply threading ---

test("Publish note, reply to it, receive reply with correct tags", async () => {
  const client = connectClient();
  await wait(2);

  const received: any[] = [];
  client.listen((payload) => {
    received.push(payload.data);
  });

  // Original note
  const note = NewShortTextNote({
    text: "Thread root " + Date.now(),
    subject: "Test Thread",
  });
  note.signAndGenerateId(keypairA);
  client.sendEvent({ event: note });
  await wait(1);

  // Reply
  const reply = NewShortTextNoteResponse({
    text: "This is a reply",
    inResponseTo: note.ToObj(),
    relayUrl: RELAY_URL,
  });
  reply.signAndGenerateId(keypairB);
  client.sendEvent({ event: reply });
  await wait(1);

  // Subscribe
  client.subscribe({
    type: CLIENT_MESSAGE_TYPE.REQ,
    filters: new NFilters({
      kinds: [NEVENT_KIND.SHORT_TEXT_NOTE],
      authors: [keypairA.publicKey, keypairB.publicKey],
      limit: 10,
    }),
    options: { timeoutIn: 5000 },
  });

  await wait(3);

  const events = received
    .filter((msg) => msg[0] === RELAY_MESSAGE_TYPE.EVENT)
    .map((msg) => msg[2]);

  const receivedReply = events.find((e) => e.id === reply.id);
  expect(receivedReply).toBeDefined();
  expect(verifyEvent(receivedReply)).toBe(true);

  // Reply has root e-tag pointing to original note
  const eTag = receivedReply.tags.find(
    (t) => t[0] === "e" && t[3] === "root"
  );
  expect(eTag).toBeDefined();
  expect(eTag[1]).toBe(note.id);

  // Reply has p-tag pointing to original author
  const pTag = receivedReply.tags.find(
    (t) => t[0] === "p" && t[1] === keypairA.publicKey
  );
  expect(pTag).toBeDefined();

  // Reply has subject "Re: Test Thread"
  const subjectTag = receivedReply.tags.find((t) => t[0] === "subject");
  expect(subjectTag[1]).toBe("Re: Test Thread");

  client.disconnect();
  await wait(2);
}, 20000);
