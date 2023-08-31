import { CLIENT_MESSAGE_TYPE, NFilters } from "@nostr-ts/common";
import { RelayClient } from "./relay-client";

function wait(s) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}

test("RelayClient connect, disconnect", async () => {
  const client = new RelayClient([
    { url: "wss://nostr-ts.relay", read: true, write: true },
  ]);

  await wait(2);

  expect(client.relays.length).toBe(1);
  expect(client.relays[0].url).toBe("wss://nostr-ts.relay");
  expect(client.relays[0].isConnected()).toBe(true);

  client.disconnect();
  await wait(2);
});

test("RelayClient connect, subscribe, disconnect", async () => {
  const client = new RelayClient([
    { url: "wss://nostr-ts.relay", read: true, write: true },
  ]);

  await wait(2);

  expect(client.relays.length).toBe(1);
  expect(client.relays[0].url).toBe("wss://nostr-ts.relay");
  expect(client.relays[0].isConnected()).toBe(true);

  const filters = new NFilters({
    kinds: [1],
    limit: 1,
  });

  client.subscribe({
    type: CLIENT_MESSAGE_TYPE.REQ,
    filters,
    options: {
      timeoutIn: 10000,
    },
  });

  expect(client.getSubscriptions().length).toBe(1);

  await wait(2);

  expect(client.getSubscriptions().length).toBe(1);

  client.disconnect();

  await wait(2);

  expect(client.relays.length).toBe(0);
  expect(client.getSubscriptions().length).toBe(0);
}, 15000);

test("RelayClient subscription timeout", async () => {
  const client = new RelayClient([
    { url: "wss://nostr-ts.relay", read: true, write: true },
  ]);

  await wait(2);

  expect(client.relays.length).toBe(1);
  expect(client.relays[0].url).toBe("wss://nostr-ts.relay");
  expect(client.relays[0].isConnected()).toBe(true);

  const filters = new NFilters({
    kinds: [1],
    limit: 1,
  });

  client.subscribe({
    type: CLIENT_MESSAGE_TYPE.REQ,
    filters,
    options: {
      timeoutIn: 2000,
    },
  });

  expect(client.getSubscriptions().length).toBe(1);

  await wait(3);

  expect(client.getSubscriptions().length).toBe(0);

  client.disconnect();

  await wait(2);

  expect(client.relays.length).toBe(0);
  expect(client.getSubscriptions().length).toBe(0);
}, 15000);
