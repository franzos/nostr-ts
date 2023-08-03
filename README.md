# Nostr Typescript Starterpack

I wanted to learn more about Nostr, so I decided to implement libraries and clients. WIP.

- `./client`: node client example
- `./packages/common`: common types and functions
- `./packages/node`: client for usage with node `ws` library
- `./packages/web`: client for usage with browser `WebSocket` API (TODO)

## Usage notes

On Node.js use:

```js
import {  } from '@nostr-ts/common'
import { RelayClient, loadOrCreateKeypair } from '@nostr-ts/node'
```

In the browser use (PLANNED):

```js
import {  } from '@nostr-ts/common'
import { RelayClient } from '@nostr-ts/web'
```

### Install & Build

```bash
pnpm install -r
pnpm run build
```

The build command will take care of `./packages/*`.

## Features

- [ ] NIP-1: [Basic protocol flow description](https://github.com/nostr-protocol/nips/blob/master/01.md)

**Generate a keypair** (Sign up):

```js
const keypair = await loadOrCreateKeypair('./key')
```

- This will look for a private key `./key` and a public key `./key.pub`
- If they don't exist, they will be generated and saved to disk
- If only the private key `./key` exists, a public key will be generated from it

**Connect to the network**:

```js
let client = new RelayClient([
    'wss://nostr.rocks',
    'wss://nostr.lu.ke'
]);
await client.getRelayInformation();
```

**Send a message**:

```js
const ev = NewShortTextNote({ text: 'Hello nostr!' })
ev.signAndGenerateId(keypair)
client.sendEvent(ev)
```

**Receive messages**:

```js
const filters = new NFilters()
filters.addAuthor(keypair.pub)

client.subscribe({
    filters
})

client.listen((payload) => {
    console.log(payload.meta.id, payload.meta.url)
    logRelayMessage(payload.data)
})
```

**Recommend a relay**

```js
const ev = NewRecommendRelay({
    relayUrl: 'wss://nostr.rocks',
})
ev.signAndGenerateId(keypair)
client.sendEvent(ev)
```

- [ ] NIP-11 [Relay Information Document](https://github.com/nostr-protocol/nips/blob/master/11.md)

```js
const infos = await client.getRelayInformation();
```

Based on this information the client decides whether to publish to a rely:

```
neededNips [ 40 ]
supportedNips [
   1,  2,  4,  9, 11,
  12, 15, 16, 20, 22,
  28, 33
]
Event a04308c18a5f73b97be1f66fddba1741dd8dcf8a057701a2b4f1713d557ae384 not published to wss://nostr.wine because not all needed NIPS are supported.
```

- [ ] NIP-14 [Subject tag in Text events](https://github.com/nostr-protocol/nips/blob/master/14.md)

```js
const ev = NewShortTextNote({ text: "Let's have a discussion about Bitcoin!" });
ev.addSubjectTag("All things Bitcoin");
```

If you want to respond to a note, keeping the subject:

```js
const inResponseTo = {
    id: 'e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466',
    pubkey: '5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70',
    created_at: 1690881792,
    kind: 1,
    tags: [["subject", "All things Bitcoin"]],
    content: "Let's have a discussion about Bitcoin!",
    sig: '6cee8c1d11ca5f8c7a0bd9839d0af5d3af3cc6a5de754fc449d34188c0066eee3e5b5b4e567cd77a2e0369f8c9525d60e064db175acd02d9c5374c3c0e912969'
}
const relayUrl = "wss://nostr.rocks"
const ev = NewShortTextNoteResponse({
    text: "Sounds like a great idea. What do you think about the Lightning Network?",
    inResponseTo,
    relayUrl
});
```

If this is the first response, we prepend the subject with `Re: ` automatically. So you'd be responding with subject `Re: All things Bitcoin`.

- [ ] NIP-18 [Reposts](https://github.com/nostr-protocol/nips/blob/master/18.md)

```js
const ev = NewQuoteRepost({
    relayUrl: 'https://nostr.rocks',
    inResponseTo: {
        id: 'e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466',
        pubkey: '5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70',
        created_at: 1690881792,
        kind: 1,
        tags: [],
        content: "Hello everyone! I am working on a new ts library for nostr. This is just a test.",
        sig: '6cee8c1d11ca5f8c7a0bd9839d0af5d3af3cc6a5de754fc449d34188c0066eee3e5b5b4e567cd77a2e0369f8c9525d60e064db175acd02d9c5374c3c0e912969'
    }
})
ev.signAndGenerateId(keypair)
client.sendEvent(ev)
```

You can also utilize `NewGenericRepost` to repost any kind of event.

- [ ] NIP-25: [Reactions](https://github.com/nostr-protocol/nips/blob/master/25.md)

```js
const ev = NewReaction({
    text: '+', 
    inResponseTo: {
        id: 'e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466',
        pubkey: '5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70',
    }
})

ev.signAndGenerateId(keypair)
client.sendEvent(ev)
```

- [ ] NIP-36 [Sensitive Content / Content Warning](https://github.com/nostr-protocol/nips/blob/master/36.md)

```js
const ev = NewShortTextNote({ text: "This is a test note with explicit language.", });
ev.addContentWarningTag("explicit language");
```

- [ ] NIP-39 [External Identities in Profiles](https://github.com/nostr-protocol/nips/blob/master/39.md#nip-39)

```js
const githubClaim = new ExternalIdentityClaim({
    type: IDENTITY_CLAIM_TYPE.GITHUB,
    identity: "semisol",
    proof: "9721ce4ee4fceb91c9711ca2a6c9a5ab",
});

const ev = NewUpdateUserMetadata({
    claims: [githubClaim],
    userMetadata: {
        name: "Semisol",
    },
});

ev.signAndGenerateId(keypair);
client.sendEvent(ev);
```

- [ ] NIP-40 [Expiration Timestamp](https://github.com/nostr-protocol/nips/blob/master/40.md)

```js
const ev = NewShortTextNote({ text: "Meeting starts in 10 minutes ..." });
ev.addExpirationTag(1690990889);
```

- [ ] NIP-56 [Reporting](https://github.com/nostr-protocol/nips/blob/master/56.md)

The `publicKey` usually refers to the user that is being reported.
If the report refers to another event, use the `eventId` too (for ex. spam, illegal, profanity, nudity).

Impersonation:

```js
const ev = NewReport({
  publicKey: "5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70",
  kind: NREPORT_KIND.IMPERSONATION,
})
```

Spam:

```js
const ev = NewReport({
  publicKey: "5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70",
  eventId: "e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466",
  kind: NREPORT_KIND.SPAM,
  // optionally pass some text
  content: "This is spam",
})
```

## Examples

### Collect a list of recommended relays

1. Setup a filter for kind 2
2. Subscribe with the filter
3. Pass incoming events to discovery
4. Save to json file

```js
import {
  NFilters,
  logRelayMessage,
} from "@nostr-ts/common";
import {
  loadOrCreateKeypair,
  RelayClient,
  RelayDiscovery,
} from "@nostr-ts/node";

const main = async () => {
  const keypair = await loadOrCreateKeypair();

  let client = new RelayClient([
    "wss://nostr.rocks",
    "wss://nostr.wine",
    "wss://nostr.lu.ke",
    "wss://nos.lol",
    "wss://nostr.orangepill.dev",
  ]);

  const relayDiscovery = new RelayDiscovery();
  const filters = new NFilters();
  filters.addKind(NEVENT_KIND.RECOMMEND_RELAY);

  client.subscribe({
    filters,
  });

  client.listen(async (payload) => {
    await relayDiscovery.add(payload.data);
  });

  await client.getRelayInformation();
  await new Promise((resolve) => setTimeout(resolve, 1 * 30 * 1000)).then(
    async () => {
      client.closeConnection();
      await relayDiscovery.saveToFile();
    }
  );
};

main();
```

You will get two files
1. `discovered-relays.json` with all valid relays
2. `discovered-relays-error.json` with all invalid relays

This is what an excerpt of `discovered-relays.json` looks like (a more complete one is included in this repo):

```json
[
  {
    "url": "wss://relay.nostrplebs.com",
    "info": {
      "contact": "nostr@semisol.dev",
      "description": "Nostr Plebs paid relay.",
      "name": "relay.nostrplebs.com",
      "pubkey": "52b4a076bcbbbdc3a1aefa3735816cf74993b1b8db202b01c883c58be7fad8bd",
      "software": "git+https://github.com/hoytech/strfry.git",
      "supported_nips": [
        1,
        9,
        11,
        12,
        15,
        16,
        20,
        22
      ],
      "version": "v92-84ba68b"
    }
  },
  {
    "url": "wss://nostr-pub.wellorder.net",
    "info": {
      "id": "wss://nostr-pub.wellorder.net/",
      "name": "Public Wellorder Relay",
      "description": "Public relay for nostr development and use.",
      "pubkey": "35d26e4690cbe1a898af61cc3515661eb5fa763b57bd0b42e45099c8b32fd50f",
      "contact": "mailto:relay@wellorder.net",
      "supported_nips": [
        1,
        2,
        9,
        11,
        12,
        15,
        16,
        20,
        22,
        33,
        40,
        42
      ],
      "software": "https://git.sr.ht/~gheartsfield/nostr-rs-relay",
      "version": "0.8.9",
      "limitation": {
        "payment_required": false
      }
    }
  },
  {
    "url": "wss://relay.nostrview.com",
    "info": {
      "name": "relay.nostrview.com",
      "description": "Nostrview relay",
      "pubkey": "2e9397a8c9268585668b76479f88e359d0ee261f8e8ea07b3b3450546d1601c8",
      "contact": "2e9397a8c9268585668b76479f88e359d0ee261f8e8ea07b3b3450546d1601c8",
      "supported_nips": [
        1,
        2,
        4,
        9,
        11,
        12,
        15,
        16,
        20,
        22,
        26,
        28,
        33,
        40,
        111
      ],
      "software": "git+https://github.com/Cameri/nostream.git",
      "version": "1.22.2",
      "limitation": {
        "max_message_length": 524288,
        "max_subscriptions": 10,
        "max_filters": 10,
        "max_limit": 5000,
        "max_subid_length": 256,
        "min_prefix": 4,
        "max_event_tags": 2500,
        "max_content_length": 102400,
        "min_pow_difficulty": 0,
        "auth_required": false,
        "payment_required": true
      },
      "payments_url": "https://relay.nostrview.com/invoices",
      "fees": {
        "admission": [
          {
            "amount": 4000000,
            "unit": "msats"
          }
        ]
      }
    }
  },
]
```

and here's `discovered-relays-error.json`:

```json
[
  {
    "url": "wss://nostr.rocks"
  },
  {
    "url": "wss://rsslay.fiatjaf.com"
  },
  {
    "url": "wss://nostr.rdfriedl.com"
  },
  {
    "url": "wss://expensive-relay.fiatjaf.com"
  },
  {
    "url": "wss://relayer.fiatjaf.com"
  },
  {
    "url": "wss://nostr-relay.wlvs.space"
  },
]
```

### Use list of relays with Relay Client

Once you've collected a list of relays, you can feed them to Relay Client.

A couple of points:
- You might not want to connect to hundreds of relays at once
- I will add some randomization and limits in the future

```js
const client = new RelayClient();
const relayDiscovery = new RelayDiscovery();
await relayDiscovery.loadFromFile();

await client.loadFromDiscovered(relayDiscovery.get());

// Now continue as usual ...
const filters = new NFilters();
filters.addKind(1);

client.subscribe({
  filters,
});

client.listen(async (payload) => {
  logRelayMessage(payload.data);
});

await client.getRelayInformation();
```

If you prefer to apply limits yourself, you could do something like this:

```js
const relays = relayDiscovery.get().slice(0, 10)
await client.loadFromDiscovered(relays);
```

## Tests

```
pnpm run tests
```

## TODO

- [ ] Tests
- [ ] More NIP's

## Notes

If you're new to Nostr, also checkout [awesome-nostr](https://github.com/aljazceru/awesome-nostr).