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
const note = NewShortTextNote('Hello nostr!')
note.signAndGenerateId(keypair)
client.sendEvent(note)
```

**Receive messages**:

```js
const filters = new NewFilters()
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
connst rec = NewRecommendRelay({
    server: 'wss://nostr.rocks',
})
rec.signAndGenerateId(keypair)
client.sendEvent(rec)
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
const newEvent = NewShortTextNote("Let's have a discussion about Bitcoin!");
newEvent.addSubjectTag("All things Bitcoin");
```

If you want to respond to a note, keeping the subject:

```js
const previousEvent
const relaySourceUrl
const newEvent = NewShortTextNoteResponse("Sounds like a great idea. What do you think about the Lightning Network?", previousEvent, relayUrl);
```

If this is the first response, we prepend the subject with `Re: ` automatically. So you'd be responding with subject `Re: All things Bitcoin`.

- [ ] NIP-18 [Reposts](https://github.com/nostr-protocol/nips/blob/master/18.md)

```js
const repost = NewQuoteRepost(
    'https://nostr.rocks',
    {
        id: 'e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466',
        pubkey: '5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70',
        created_at: 1690881792,
        kind: 1,
        tags: [],
        content: "Hello everyone! I am working on a new ts library for nostr. This is just a test.",
        sig: '6cee8c1d11ca5f8c7a0bd9839d0af5d3af3cc6a5de754fc449d34188c0066eee3e5b5b4e567cd77a2e0369f8c9525d60e064db175acd02d9c5374c3c0e912969'
    }
)
repost.signAndGenerateId(keypair)
client.sendEvent(repost)
```

You can also utilize `NewGenericRepost` to repost any kind of event.

- [ ] NIP-25: [Reactions](https://github.com/nostr-protocol/nips/blob/master/25.md)

```js
const reaction = NewReaction('+', {
    id: 'e21921600ecbcbea699a9f76c8156886bef112b71c4f79ce1b894386b5413466',
    pubkey: '5276ac499c9c6a353634d3d2cb6f4ada5167c3b886108ab4ddeb8ddf7b0fff70',
})

reaction.signAndGenerateId(keypair)
client.sendEvent(reaction)
```

- [ ] NIP-36 [Sensitive Content / Content Warning](https://github.com/nostr-protocol/nips/blob/master/36.md)

```js
const newEvent = NewShortTextNote("This is explicit sh** right here.");
newEvent.addContentWarningTag("explicit language");
```

- [ ] NIP-39 [External Identities in Profiles](https://github.com/nostr-protocol/nips/blob/master/39.md#nip-39)

```js
const githubClaim = new ExternalIdentityClaim({
    type: IDENTITY_CLAIM_TYPE.GITHUB,
    identity: "semisol",
    proof: "9721ce4ee4fceb91c9711ca2a6c9a5ab",
});

const identity = NewUpdateUserMetadata({
    claims: [githubClaim],
    userMetadata: {
        name: "Semisol",
    },
});

identity.signAndGenerateId(keypair);
client.sendEvent(identity);
```

- [ ] NIP-40 [Expiration Timestamp](https://github.com/nostr-protocol/nips/blob/master/40.md)

```js
const newEvent = NewShortTextNote("Meeting starts in 10 minutes ...");
newEvent.addExpirationTag(1690990889);
  ```

## TODO

- [ ] Tests
- [ ] More NIP's