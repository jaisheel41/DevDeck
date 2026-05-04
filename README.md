# DevDeck

Local mission control for dev services: one daemon, one dashboard (Next.js in this monorepo, or a static bundle when published).

## Monorepo development

```bash
pnpm install
pnpm dev
```

- Dashboard: terminal prints a `[DevDeck]` URL (often `http://127.0.0.1:4321`).
- Daemon: writes `.devdeck/daemon.json` so the UI picks up the real HTTP/WebSocket URLs if the daemon port moves.

## Global CLI (npm)

Publish order (scoped shared library, then CLI):

```bash
pnpm -C packages/shared build
pnpm -C packages/shared publish --access public

pnpm -C packages/daemon publish --access public
```

The `devdeck` package runs `prepublishOnly`, which builds the static UI and copies it into `packages/daemon/public/ui` before packing.

After install:

```bash
devdeck init    # creates devdeck.config.ts (uses package.json scripts when possible)
devdeck start   # daemon + bundled dashboard on one port when installed from npm
```

Replace the `repository` URLs in `packages/shared/package.json` and `packages/daemon/package.json` with your real Git remote before publishing.
