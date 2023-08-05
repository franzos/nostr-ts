# Nostr Typescript Starterpack

I wanted to learn more about Nostr, so I decided to implement libraries and clients.

This is WIP.

- `./client`: node client example
- `./packages/common`: common types and functions
- `./packages/node`: client for usage with node `ws` library
- `./packages/web`: client for usage with browser `WebSocket` API

## Highlights

- Supported NIP: 1, 10, 11, 14, 18, 23, 25, 36, 39, 40, 45, 56
- Partial NIP: 19, 32, 57
- `RelayClient` to handle websocket connection and message sending (node, web)
- `RelayDiscovery` to make it easy to pickup new relays (node)
- `NEvent` to assemble events (universal)
- `NFilters` to filter events (universal)
- `NUser` to handle user metadata (node, web - WIP)
- `NUserStoreMemory` (universal, testing), `NUserStoreSQLite` (node - WIP), `NUserStoreIndexdDB` (web - WIP) ... to store user metadata (node, web)
- `loadOrCreateKeypair` basic key handling (node, web)

The goal here is to make it as easy as possible to get started, so there's usually a convenience function for everything (NewShortTextNote, NewRecommendRelay, ...).

## Usage notes

On Node.js use:

```js
import { NewShortTextNote, NFilters } from '@nostr-ts/common'
import { RelayClient, RelayDiscovery, loadOrCreateKeypair, NUser } from '@nostr-ts/node'
```

In the browser use:

```js
import { NewShortTextNote, NFilters } from '@nostr-ts/common'
import { RelayClient, loadOrCreateKeypair, NUser } from '@nostr-ts/web'
```

So most types and utility functions comes from `@nostr-ts/common`, and anything related to file system, database or networking (requests), is in `@nostr-ts/node` and `@nostr-ts/web`.

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

**Supported messages (events)**

- `NewShortTextNote`: Send a short text note
- `NewLongFormContent`: Send a long form content note
- `NewShortTextNoteResponse`: Respond to a short text note
- `NewReaction`: React to a note (`+`, `-`)
- `NewQuoteRepost`: Repost a note
- `NewGenericRepost`: Report any event
- `NewUpdateUserMetadata`: Update user metadata (profile)
- `NewRecommendRelay`: Recommend a relay
- `NewReport`: Report an event or user
- `NewZapRequest`: Request a zap
- `NewSignedZapRequest`: Request a zap helper
- `NewZapReceipt`: Zap receipt
- `NewEventDeletion`: Delete an event

**Event**

You can manually assemble an event:

```js
const ev = new NEvent({
   kind: NEVENT_KIND_SHORT_TEXT_NOTE,
   tags: [],
   content: 'Hello nostr!',
})

// These are all the options; you do not (and usually should not) use all of them
// If something doesn't add-up, these sometimes throw an error
ev.addEventTag(...)
ev.addPublicKeyTag(...)
ev.addRelaysTag(...)
ev.addEventCoordinatesTag(...)
ev.addIdentifierTag(...)
ev.addLnurlTag(...)
ev.addAmountTag(...)
ev.addKindTag(...)
ev.addExpirationTag(...)
ev.addSubjectTag(...)
ev.addSubjectTag(makeSubjectResponse(subject));
ev.addNonceTag(...)
ev.addContentWarningTag(...)
ev.addExternalIdentityClaimTag(...)
ev.addReportTags(...)

// Add custom tags
ev.addTag(['p', 'myvalue'])

// Mentions in event content; for ex. Checkout nostr:e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466
ev.mentionUsers([pubkey1, pubkey2])
ev.hasMentions()

// Sign
ev.signAndGenerateId(keypair)

// Ready to publish?
const ready = ev.isReadyToPublish()

// Required NIP? [13, 39, 40]
const nip = ev.determineRequiredNIP()

// Properties
ev.hasPublicKeyTags()
ev.hasRelaysTag()
ev.hasEventCoordinatesTags()
ev.hasIdentifierTags()
ev.hasLnurlTags()
ev.hasAmountTags()
ev.hasExpirationTag()
ev.hasSubjectTag()
ev.hasNonceTag()
ev.hasContentWarningTag()
ev.hasExternalIdentityClaimTag()
ev.hasReportTags()
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

- [ ] NIP-19 [bech32-encoded entities](https://github.com/nostr-protocol/nips/blob/master/19.md)

There are some utilities to get you started (WIP):

- `encodeBech32(...)`
- `decodeBech32(...)`


- [ ] NIP-23 [Long-form Content](https://github.com/nostr-protocol/nips/blob/master/23.md)

```js
const ev = NewLongFormContent({
  text: "This is a really long one. Like I mean, not your usual short note. This is a long one. I mean, really long. Like, really really long. Like, really really really long. Like, really really really really long. Like, really really really really really long. Like, really really really really really really long."
  isDraft: false,
  identifier: "really-really-really-long"
})
```

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

- [ ] NIP-57 [Lightning Zaps](https://github.com/nostr-protocol/nips/blob/master/57.md)

This is a really rudimentary example to show the steps required.
I will follow-up with a more realistig implementation.

Supports:
- Zap to a user: YES
- Zap to from / to event: NO (WIP)

```js
const recipient = new NUser({
    pubkey: "5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70",
})

// Get filters for subscription to get user information
const filters = recipient.getMetadataFilter()

let client = new RelayClient([
    'wss://nostr.rocks',
    'wss://nostr.lu.ke'
]);
await client.getRelayInformation();

client.subscribe({
    filters
})

client.listen(async (payload) => {
    console.log(payload.meta.id, payload.meta.url)
    logRelayMessage(payload.data)

    // Don't actually do exactly this
    // for ex. if you're subscribed to multiple relays, you'll generate multiple payments
    // This should be part of client logic
    if (payload.data[0] === RELAY_MESSAGE_TYPE.EVENT) {

        // Load user data from event
        const success = recipient.fromEvent(payload.data[2])

        if (success) {
            // Make ZAP request
            const { p: invoice, event } = await recipient.makeZapRequest(
                {
                    relayUrls: ["wss://nostr.rocks"],
                    amount: 1000,
                },
                keypair
            )

            // Pay invoice with lightning wallet then continue here
            const bolt11FromYourWallet = "lnbc1..."

            const receipt = event.newZapReceipt({
                bolt11: bolt11FromYourWallet,
                description: 'Keep stacking sats!'
            })
            receipt.signAndGenerateId(keypair)
            client.sendEvent(receipt)
      }
    }
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

## Notes

If you're new to Nostr, also checkout [awesome-nostr](https://github.com/aljazceru/awesome-nostr).