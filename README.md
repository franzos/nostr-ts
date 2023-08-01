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

- [ ] NIP-11 [Relay Information Document](https://github.com/nostr-protocol/nips/blob/master/11.md)

```js
const infos = await client.getRelayInformation();
```

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

## TODO

- [ ] Tests
- [ ] More NIP's