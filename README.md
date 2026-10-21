# Our Home ♥

A little paper house at night. Every room is a small toy; finishing one lights its window.
Finish them all and the nameplate goes up on the door.

Vite + plain JavaScript + GSAP. No framework, no backend. Everything personal lives in
`src/content/config.js`.

## Run it locally

```sh
pnpm install
pnpm dev                 # http://localhost:4180 — saves reload instantly
```

Or with Docker only (no Node on the machine):

```sh
docker compose up        # Vite dev server on http://localhost:4180, hot reload
                         # PORT=5000 docker compose up  → another port
```

Ctrl+C stops it immediately. `docker compose down -v` also drops the cached `node_modules`.

Tests: `pnpm test` (unit) · `pnpm test:e2e` (Playwright, starts its own dev server).

## Editing the words

| What | Where |
|---|---|
| Names, dates, the door's answer, every room's text, memories, the letter, P.S. list | `src/content/config.js` |
| The Bengali version of all of the above | `src/content/config.bn.js` |
| Small UI words (buttons, toasts) | `src/content/strings.js` / `strings.bn.js`, and each room's `src/scenes/<room>/strings.js` / `strings.bn.js` |

- In any text you can write `{nickname}`, `{partnerName}`, `{myName}`, `{days}`,
  `{weddingDate}`, `{sinceDate}` — they are filled in automatically.
- **Bengali files mirror the English ones.** Same keys; lists are matched *by position*, so
  keep the same order. Anything you leave out shows in English, so you can translate bit by bit.
- Numbers and dates switch to Bengali numerals and month names by themselves.

## Photos

Photos live in `public/photos/` (thumbnails in `public/photos/thumbs/`). Refer to them in
`config.js` by filename, e.g. `'IMG_20220420_043028770.jpg'`.

```sh
./scripts/add-photos.sh ~/Pictures/us/*.jpg   # shrinks, rotates, strips GPS, makes thumbnails
```

Keep camera-style names (`IMG_YYYYMMDD_…`) — the date label and order come from the name.
Locally the dev server picks new photos up on reload; in production they appear after the
next deploy (the photo list is built into the site).

## URL switches

| Add to the URL | Does |
|---|---|
| `?door` | show the front door again (as if it's the first visit) |
| `?skip` | skip the door, straight to the house |
| `?reset` | forget everything — rooms, notes, language, sound |
| `?lang=bn` / `?lang=en` | force a language for this link (the বাংলা / English pill switches and remembers) |
| `?debug` | exposes `window.__home` in the console: `__home.completeAll()`, `__home.complete('garden')`, `__home.go('finale')` |

Rooms are hash routes: `/#/living`, `/#/kitchen`, `/#/garden`, `/#/rooftop`, `/#/desk`,
`/#/empty`, `/#/finale`, and the reception card at `/#/card`.
Example: `https://your.domain/?skip&debug#/kitchen`.

## Deploy

The `Dockerfile` builds the site and serves it with a hardened nginx (security headers, gzip,
`/healthz`, long caching for hashed files). `docker-compose.yml` is the production file: no
host ports, read-only container, healthcheck. `docker-compose.override.yml` is only for local
dev — platforms ignore it.

### Dokploy

1. **Create → Compose** service, point it at this git repo/branch, compose path
   `./docker-compose.yml`.
2. **Domains** → add your domain, **service `web`, port `80`**, HTTPS on (Let's Encrypt).
3. Deploy. Every push → redeploy (enable auto-deploy / the webhook if you like).

### Coolify

1. **New resource → Git repo**, Build Pack **Docker Compose**, file `docker-compose.yml`.
2. On the `web` service set your domain (`https://your.domain`) — port 80 is picked up from
   `SERVICE_FQDN_WEB_80`.
3. Deploy.

### Check it

- `https://your.domain/healthz` → `ok`
- Paste the link in WhatsApp/Messenger: the preview shows the door at night (`public/og.jpg`;
  nginx fills the real domain into the link-preview tags).

### Offline at the venue

The site installs a service worker that keeps a copy of everything — app, fonts, all photos
(~11 MB). **Open the site once on her phone (on Wi-Fi) after the final deploy**; after that it
works with no signal. New deploys reach the phone automatically on the next visit with signal.
To replace the preview image, overwrite `public/og.jpg` (1200×630).
