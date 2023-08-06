# nostr-ts Common

> Nostr: A simple, open protocol that enables a truly censorship-resistant and global social network.

This package is part of [nostr-ts](https://github.com/franzos/nostr-ts).

- `@nostr-ts/common`: common types and functions
- `@nostr-ts/node`: client for usage with node `ws` library
- `@nostr-ts/web`: client for usage with browser `WebSocket` API

Checkout the [documentation](https://github.com/franzos/nostr-ts) for more information.

## Installation

```bash
pnpm add @nostr-ts/common
```

## Get started

This is mostly shared stuff, so checkout either

- `@nostr-ts/node` for node usage
- `@nostr-ts/web` for browser usage

for ex.

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