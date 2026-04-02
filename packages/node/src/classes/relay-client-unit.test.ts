import { RelayClient } from "./relay-client";

/**
 * Mock the ws module so no real WebSocket connections are created.
 * The RelayClient constructor calls connectRelays() which instantiates
 * WebSocketClient -> new WebSocket(url), so we intercept at the ws level.
 */
jest.mock("ws", () => {
  return {
    WebSocket: jest.fn().mockImplementation(() => ({
      readyState: 1,
      OPEN: 1,
      send: jest.fn(),
      close: jest.fn(),
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
    })),
  };
});

test("RelayClient with connectManually does NOT auto-connect", () => {
  const client = new RelayClient(
    [
      { url: "wss://relay1.example.com", read: true, write: true },
      { url: "wss://relay2.example.com", read: true, write: false },
    ],
    { connectManually: true }
  );

  expect(client.relays.length).toBe(2);

  for (const relay of client.relays) {
    expect(relay.ws).toBeUndefined();
    expect(relay.isConnected()).toBe(false);
  }
});

