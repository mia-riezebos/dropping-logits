# Dropping Logits

A browser extension that replaces AI marketing speak with toilet humour.

> We're excited to announce we're launching state-of-the-art models.
>
> We're relieved to announce we're dropping state-of-the-fart logs.

(Logs, as in logits.)

## Build

Needs Node 24 and pnpm (the version in `package.json`'s `packageManager`).

```sh
pnpm install
pnpm build
```

The build is the same from a release's source zip. Then load `dist/` as an unpacked extension:

- Chromium: `chrome://extensions`, Developer mode, Load unpacked.
- Firefox: `about:debugging#/runtime/this-firefox`, Load Temporary Add-on, pick `dist/manifest.json`.

## Add a term

Add a line to [`src/dictionary.ts`](src/dictionary.ts). Its doc comment covers casing and hyphens.
`pnpm test` fails if a replacement contains another term, because the page would keep rewriting itself.

## Release

Add a changeset to any PR that changes what users get: `pnpm changeset`. Merging to `main` keeps a "chore: version packages" PR open; merging that tags `vX.Y.Z` and publishes a GitHub release with the extension zip, its source zip, and `SHA256SUMS`.
