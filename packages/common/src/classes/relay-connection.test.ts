import { jest } from "@jest/globals";
import { CLIENT_MESSAGE_TYPE, RelayConnection } from "..";

test("RelayConnection stores config and defaults", () => {
  const conn = new RelayConnection({
    url: "wss://relay.example.com",
    read: true,
    write: false,
  });

  expect(conn.url).toBe("wss://relay.example.com");
  expect(conn.read).toBe(true);
  expect(conn.write).toBe(false);
  expect(conn.isEnabled).toBe(true);
  expect(conn.requiresPOW).toBe(0);
  expect(conn.ws).toBeUndefined();
  expect(conn.isConnected()).toBe(false);
});

test("RelayConnection getInfo returns default fields", () => {
  const conn = new RelayConnection({
    url: "wss://relay.example.com",
    read: true,
    write: false,
  });

  const info = conn.getInfo("default");
  expect(info.url).toBe("wss://relay.example.com");
  expect(info.read).toBe(true);
  expect(info.write).toBe(false);
  expect(info.isReady).toBe(false);
  expect(info.powRequired).toBe(0);
  expect(info.error).toBeUndefined();
  expect(info.info).toBeUndefined();
});

test("RelayConnection getInfo with withInfo includes relay info", () => {
  const conn = new RelayConnection({
    url: "wss://relay.example.com",
    read: true,
    write: true,
    info: {
      name: "Test Relay",
      description: "A test relay",
      supported_nips: [1, 11, 42],
    },
  });

  const info = conn.getInfo("withInfo");
  expect(info.url).toBe("wss://relay.example.com");
  expect(info.info).toBeDefined();
  expect(info.info.name).toBe("Test Relay");
  expect(info.info.supported_nips).toEqual([1, 11, 42]);
});

test("RelayConnection addSubscription and getSubscriptions", () => {
  const conn = new RelayConnection({
    url: "wss://relay.example.com",
    read: true,
    write: true,
  });

  expect(conn.getSubscriptions().length).toBe(0);

  conn.addSubscription({
    id: "sub-1",
    type: CLIENT_MESSAGE_TYPE.REQ,
    created: Date.now(),
    isActive: true,
    filters: { kinds: [1], limit: 10 },
  });

  conn.addSubscription({
    id: "sub-2",
    type: CLIENT_MESSAGE_TYPE.REQ,
    created: Date.now(),
    isActive: true,
    filters: { kinds: [0], limit: 5 },
  });

  const allSubs = conn.getSubscriptions();
  expect(allSubs.length).toBe(2);
  expect(allSubs[0].relayUrl).toBe("wss://relay.example.com");
  expect(allSubs[1].relayUrl).toBe("wss://relay.example.com");
});

test("RelayConnection getSubscription by id", () => {
  const conn = new RelayConnection({
    url: "wss://relay.example.com",
    read: true,
    write: true,
  });

  conn.addSubscription({
    id: "sub-1",
    type: CLIENT_MESSAGE_TYPE.REQ,
    created: Date.now(),
    isActive: true,
  });

  const found = conn.getSubscription("sub-1");
  expect(found).not.toBeNull();
  expect(found.id).toBe("sub-1");
  expect(found.relayUrl).toBe("wss://relay.example.com");

  const notFound = conn.getSubscription("nonexistent");
  expect(notFound).toBeNull();
});

test("RelayConnection removeSubscription marks inactive then removes", () => {
  jest.useFakeTimers();

  const conn = new RelayConnection({
    url: "wss://relay.example.com",
    read: true,
    write: true,
  });

  conn.addSubscription({
    id: "sub-1",
    type: CLIENT_MESSAGE_TYPE.REQ,
    created: Date.now(),
    isActive: true,
  });

  conn.addSubscription({
    id: "sub-2",
    type: CLIENT_MESSAGE_TYPE.REQ,
    created: Date.now(),
    isActive: true,
  });

  conn.removeSubscription("sub-1");

  // Immediately after removal: sub-1 should be marked inactive
  const subs = conn.getSubscriptions();
  expect(subs.length).toBe(2);
  const sub1 = subs.find((s) => s.id === "sub-1");
  expect(sub1.isActive).toBe(false);

  // sub-2 should remain active
  const sub2 = subs.find((s) => s.id === "sub-2");
  expect(sub2.isActive).toBe(true);

  // After the 10s cleanup timeout, sub-1 is removed entirely
  jest.advanceTimersByTime(10000);
  const subsAfter = conn.getSubscriptions();
  expect(subsAfter.length).toBe(1);
  expect(subsAfter[0].id).toBe("sub-2");

  jest.useRealTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test("RelayConnection getSubscriptions filters by isActive", () => {
  const conn = new RelayConnection({
    url: "wss://relay.example.com",
    read: true,
    write: true,
  });

  conn.addSubscription({
    id: "sub-active",
    type: CLIENT_MESSAGE_TYPE.REQ,
    created: Date.now(),
    isActive: true,
  });

  conn.addSubscription({
    id: "sub-inactive",
    type: CLIENT_MESSAGE_TYPE.REQ,
    created: Date.now(),
    isActive: false,
  });

  const activeSubs = conn.getSubscriptions({ isActive: true });
  expect(activeSubs.length).toBe(1);
  expect(activeSubs[0].id).toBe("sub-active");

  const allSubs = conn.getSubscriptions();
  expect(allSubs.length).toBe(2);
});

test("RelayConnection with supported_nips in relay info", () => {
  const conn = new RelayConnection({
    url: "wss://relay.example.com",
    read: true,
    write: true,
    info: {
      name: "NIP Relay",
      supported_nips: [1, 2, 4, 11, 42, 45],
    },
  });

  expect(conn.info).toBeDefined();
  expect(conn.info.supported_nips).toContain(1);
  expect(conn.info.supported_nips).toContain(42);
  expect(conn.info.supported_nips).toContain(45);
  expect(conn.info.supported_nips).not.toContain(99);
});
