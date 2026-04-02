import {
  RELAY_MESSAGE_TYPE,
  extractRelayMessage,
} from "..";

const minimalEvent = {
  id: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  pubkey:
    "b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2",
  created_at: 1700000000,
  kind: 1,
  tags: [["p", "abcdef"]],
  content: "hello nostr",
  sig: "c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2",
};

test("extractRelayMessage: AUTH", () => {
  const result = extractRelayMessage(["AUTH", "challenge-string-123"]);
  expect(result[0]).toBe(RELAY_MESSAGE_TYPE.AUTH);
  expect(result[1]).toBe("challenge-string-123");
});

test("extractRelayMessage: COUNT", () => {
  const result = extractRelayMessage(["COUNT", "sub-1", { count: 42 }]);
  expect(result[0]).toBe(RELAY_MESSAGE_TYPE.COUNT);
  expect(result[1]).toBe("sub-1");
  expect(result[2]).toEqual({ count: 42 });
});

test("extractRelayMessage: EOSE", () => {
  const result = extractRelayMessage(["EOSE", "sub-2"]);
  expect(result[0]).toBe(RELAY_MESSAGE_TYPE.EOSE);
  expect(result[1]).toBe("sub-2");
});

test("extractRelayMessage: EVENT", () => {
  const result = extractRelayMessage(["EVENT", "sub-3", minimalEvent]);
  expect(result[0]).toBe(RELAY_MESSAGE_TYPE.EVENT);
  expect(result[1]).toBe("sub-3");
  expect(result[2]).toEqual(minimalEvent);
});

test("extractRelayMessage: NOTICE", () => {
  const result = extractRelayMessage(["NOTICE", "rate-limited"]);
  expect(result[0]).toBe(RELAY_MESSAGE_TYPE.NOTICE);
  expect(result[1]).toBe("rate-limited");
});

test("extractRelayMessage: OK success and failure", () => {
  const success = extractRelayMessage(["OK", "event-id-abc", true, ""]);
  expect(success[0]).toBe(RELAY_MESSAGE_TYPE.OK);
  expect(success[1]).toBe("event-id-abc");
  expect(success[2]).toBe(true);
  expect(success[3]).toBe("");

  const failure = extractRelayMessage([
    "OK",
    "event-id-xyz",
    false,
    "blocked: not on whitelist",
  ]);
  expect(failure[0]).toBe(RELAY_MESSAGE_TYPE.OK);
  expect(failure[1]).toBe("event-id-xyz");
  expect(failure[2]).toBe(false);
  expect(failure[3]).toBe("blocked: not on whitelist");
});

test("extractRelayMessage: unknown type throws", () => {
  expect(() => extractRelayMessage(["UNKNOWN", "data"])).toThrow(
    "Unknown message type UNKNOWN"
  );
});
