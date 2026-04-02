import {
  generateClientKeys,
  publicKeyFromPrivateKey,
  serializeEvent,
  hash,
  hashEvent,
  sign,
  signEvent,
  verifyEvent,
} from "..";
import { EventBase, NEVENT_KIND } from "../types";

const HEX_64 = /^[0-9a-f]{64}$/;
const HEX_128 = /^[0-9a-f]{128}$/;

function makeEvent(pubkey: string): EventBase {
  return {
    pubkey,
    created_at: 1000000,
    kind: NEVENT_KIND.SHORT_TEXT_NOTE,
    tags: [],
    content: "hello nostr",
  };
}

// --- generateClientKeys ---

test("generateClientKeys returns valid, unique hex keypairs whose publicKey is derivable from privateKey", () => {
  const a = generateClientKeys();
  const b = generateClientKeys();
  expect(a.privateKey).toMatch(HEX_64);
  expect(a.publicKey).toMatch(HEX_64);
  expect(a.privateKey).not.toEqual(b.privateKey);
  expect(a.publicKey).not.toEqual(b.publicKey);
  expect(publicKeyFromPrivateKey(a.privateKey)).toEqual(a.publicKey);
});

// --- publicKeyFromPrivateKey ---

test("publicKeyFromPrivateKey is deterministic and returns 64-char hex matching the original keypair", () => {
  const keys = generateClientKeys();
  const derived = publicKeyFromPrivateKey(keys.privateKey);
  expect(derived).toMatch(HEX_64);
  expect(derived).toEqual(keys.publicKey);
  expect(publicKeyFromPrivateKey(keys.privateKey)).toEqual(derived);
});

// --- serializeEvent ---

test("serializeEvent produces NIP-01 format", () => {
  const event = makeEvent("abcd".repeat(16));
  const serialized = serializeEvent(event);
  const parsed = JSON.parse(serialized);
  expect(parsed[0]).toEqual(0);
  expect(parsed[1]).toEqual(event.pubkey);
  expect(parsed[2]).toEqual(event.created_at);
  expect(parsed[3]).toEqual(event.kind);
  expect(parsed[4]).toEqual(event.tags);
  expect(parsed[5]).toEqual(event.content);
  expect(parsed).toHaveLength(6);
});

test("serializeEvent serializes empty tags as []", () => {
  const event = makeEvent("abcd".repeat(16));
  event.tags = [];
  const parsed = JSON.parse(serializeEvent(event));
  expect(parsed[4]).toEqual([]);
});

// --- hash ---

test("hash is deterministic, returns 64-char hex, and varies by input", () => {
  const a = hash("input A");
  const b = hash("input B");
  expect(a).toMatch(HEX_64);
  expect(hash("input A")).toEqual(a);
  expect(a).not.toEqual(b);
});

// --- hashEvent ---

test("hashEvent is deterministic for the same event", () => {
  const event = makeEvent("abcd".repeat(16));
  expect(hashEvent(event)).toMatch(HEX_64);
  expect(hashEvent(event)).toEqual(hashEvent(event));
});

test("hashEvent changes when content changes", () => {
  const event = makeEvent("abcd".repeat(16));
  const h1 = hashEvent(event);
  const modified = { ...event, content: "different" };
  expect(h1).not.toEqual(hashEvent(modified));
});

test("hashEvent changes when kind changes", () => {
  const event = makeEvent("abcd".repeat(16));
  const h1 = hashEvent(event);
  const modified = { ...event, kind: 42 as NEVENT_KIND };
  expect(h1).not.toEqual(hashEvent(modified));
});

test("hashEvent changes when pubkey changes", () => {
  const h1 = hashEvent(makeEvent("abcd".repeat(16)));
  const h2 = hashEvent(makeEvent("1234".repeat(16)));
  expect(h1).not.toEqual(h2);
});

// --- sign ---

test("sign returns 128-char hex string", () => {
  const keys = generateClientKeys();
  const event = makeEvent(keys.publicKey);
  const eventHash = hashEvent(event);
  const sig = sign(eventHash, keys.privateKey);
  expect(sig).toMatch(HEX_128);
});

test("sign throws on invalid event hash", () => {
  const keys = generateClientKeys();
  expect(() => sign("tooshort", keys.privateKey)).toThrow();
});

// --- signEvent ---

test("signEvent returns a valid verifiable signature", () => {
  const keys = generateClientKeys();
  const event = makeEvent(keys.publicKey);
  const sig = signEvent(event, keys.privateKey);
  expect(sig).toMatch(HEX_128);
  const signed = { ...event, id: hashEvent(event), sig };
  expect(verifyEvent(signed)).toBe(true);
});

// --- verifyEvent ---

test("verifyEvent returns true for correctly signed event", () => {
  const keys = generateClientKeys();
  const event = makeEvent(keys.publicKey);
  event.id = hashEvent(event);
  event.sig = signEvent(event, keys.privateKey);
  expect(verifyEvent(event)).toBe(true);
});

test("verifyEvent returns false for tampered content", () => {
  const keys = generateClientKeys();
  const event = makeEvent(keys.publicKey);
  event.id = hashEvent(event);
  event.sig = signEvent(event, keys.privateKey);
  event.content = "tampered";
  expect(verifyEvent(event)).toBe(false);
});

test("verifyEvent returns false for tampered pubkey", () => {
  const keys = generateClientKeys();
  const event = makeEvent(keys.publicKey);
  event.id = hashEvent(event);
  event.sig = signEvent(event, keys.privateKey);
  event.pubkey = generateClientKeys().publicKey;
  expect(verifyEvent(event)).toBe(false);
});

test("verifyEvent returns false for invalid signature", () => {
  const keys = generateClientKeys();
  const event = makeEvent(keys.publicKey);
  event.id = hashEvent(event);
  event.sig = "ab".repeat(64);
  expect(verifyEvent(event)).toBe(false);
});

test("verifyEvent returns false for garbage input", () => {
  const garbage: EventBase = {
    pubkey: "not-a-key",
    created_at: 0,
    kind: 1 as NEVENT_KIND,
    tags: [],
    content: "",
    sig: "not-a-sig",
  };
  expect(verifyEvent(garbage)).toBe(false);
});

// --- full roundtrip ---

test("full roundtrip: generate keys, create event, hash, sign, verify", () => {
  const keys = generateClientKeys();
  const event = makeEvent(keys.publicKey);
  event.id = hashEvent(event);
  event.sig = signEvent(event, keys.privateKey);
  expect(verifyEvent(event)).toBe(true);
});
