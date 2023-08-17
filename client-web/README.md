# Nostr Client

Nostr web client built with React.

- Relies on IndexedDB and local storage for data and accounts
- implements `@nostr-ts/common` and `@nostr-ts/web`

- `nos2x` support is planned

## Setup

Install:

```bash
pnpm install
```

Run:

```bash
pnpm run dev
```

### Production

There's a Dockerfile and docker-compose.yml in the root of the repository. It builds all packages, then client-web, and uses nginx to serve.

```bash
pnpm run build
```

Serve the `./dist` directory.

### Docker

```bash
cd ../
docker-compose build
docker-compose up
```

Open [http://127.0.0.1:4000/](vhttp://127.0.0.1:4000/) in your browser.

## Preview

Here's an early preview. I'll update it occasionally.

![Preview](./preview.png)

## Licenses

-`./public/no-image.png`: No Image by Ashwini Sukhdeve from <a href="https://thenounproject.com/browse/icons/term/no-image/" target="_blank" title="No Image Icons">Noun Project</a> (CC BY 3.0)