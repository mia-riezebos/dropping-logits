# Dropping Logs

A browser extension that replaces AI marketing speak with toilet humour.

> We're excited to announce we're launching state-of-the-art models.
>
> We're relieved to announce we're dropping state-of-the-fart logs.

(Logs, as in logits.)

## Build

```sh
pnpm install
pnpm build
```

Then load `dist/` as an unpacked extension:

- Chromium: `chrome://extensions`, Developer mode, Load unpacked.
- Firefox: `about:debugging#/runtime/this-firefox`, Load Temporary Add-on, pick `dist/manifest.json`.

## Add a term

Add a line to [`src/dictionary.ts`](src/dictionary.ts). Its doc comment covers casing and hyphens.
`pnpm test` fails if a replacement contains another term, because the page would keep rewriting itself.
