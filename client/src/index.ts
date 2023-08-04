import { NFilters, logRelayMessage } from "@nostr-ts/common";
import { loadOrCreateKeypair, RelayClient } from "@nostr-ts/node";

const main = async () => {
  const keypair = await loadOrCreateKeypair();

  let client = new RelayClient([
    "wss://nostr.rocks",
    "wss://nostr.wine",
    "wss://nostr.lu.ke",
  ]);

  const filters = new NFilters();
  // filters.addAuthor(keypair.pub)
  // filters.addKind(6)

  console.log(filters.toJson());

  client.subscribe({
    filters,
  });

  client.listen((payload) => {
    console.log(payload.meta.id, payload.meta.url);
    logRelayMessage(payload.data);
  });

  // // SEND A MESSAGE
  // const note = NewShortTextNote({
  //   text: "Hello nostr #3!",
  // });
  // note.signAndGenerateId(keypair);
  // client.sendEvent(note);

  // // SEND REACTION
  // const reaction = NewReaction({
  //   text: "+",
  //   inResponseTo: {
  //     id: "e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466",
  //     pubkey:
  //       "5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70",
  //   },
  // });

  // reaction.signAndGenerateId(keypair);
  // const verified = verifyEvent(reaction);
  // console.log(`Verified: ${verified}`);
  // client.sendEvent(reaction);

  // // SEND REPOST
  // const repost = NewQuoteRepost({
  //   relayUrl: "https://nostr.rocks",
  //   inResponseTo: {
  //     id: "e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466",
  //     pubkey:
  //       "5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70",
  //     created_at: 1690881792,
  //     kind: 1,
  //     tags: [],
  //     content:
  //       "Hello everyone! I am working on a new ts library for nostr. This is just a test.",
  //     sig: "6cee8c1d11ca5f8c7a0bd9839d0af5d3af3cc6a5de754fc449d34188c0066eee3e5b5b4e567cd77a2e0369f8c9525d60e064db175acd02d9c5374c3c0e912969",
  //   },
  // });
  // repost.signAndGenerateId(keypair);
  // client.sendEvent(repost);

  // delay by 10800 seconds client.closeConnection()
  await new Promise((resolve) => setTimeout(resolve, 1 * 60 * 1000)).then(
    () => {
      client.closeConnection();
    }
  );
};

main();
