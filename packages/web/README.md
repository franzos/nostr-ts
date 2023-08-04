# nostr-ts Web

> Nostr: A simple, open protocol that enables a truly censorship-resistant and global social network.

This package is part of [nostr-ts](https://github.com/franzos/nostr-ts).

- `@nostr-ts/common`: common types and functions
- `@nostr-ts/node`: client for usage with node `ws` library
- `@nostr-ts/web`: client for usage with browser `WebSocket` API

Checkout the [documentation](https://franzos.github.io/nostr-ts/) for more information.

## Installation

```bash
pnpm add @nostr-ts/web
```

## Get started

```js
import { NewShortTextNote } from '@nostr-ts/common'
import { RelayClient, loadOrCreateKeypair } from '@nostr-ts/web'
```