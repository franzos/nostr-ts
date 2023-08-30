# Relay

A collection of docker containers to quickly run a local relay.

This is based on [gnost-relay](https://github.com/barkyq/gnost-relay).

Generate a self-signed certificate for nginx:

```bash
openssl req -x509 -newkey rsa:4096 -keyout selfsigned.key -out selfsigned.crt -days 365 -nodes
```

Start Docker:

```bash
docker-compose up

# Rebuild:
# docker-compose up --build
```

Edit your hostfile (ex.: `/etc/hosts`):

```
127.0.0.1 nostr-ts.relay
```

Connect to `wss://nostr-ts.relay`

Check info with curl:

```bash
curl --insecure -H "Accept: application/nostr+json" https://nostr-ts.relay
```

Usage in Browser: Open [https://nostr-ts.relay](https://nostr-ts.relay) and approve the self-signed certificate, then connect with `client-web`.

If you want to use `client` instead, you might need to start it like this (self-signed certificate):

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 node dist/index.js
```