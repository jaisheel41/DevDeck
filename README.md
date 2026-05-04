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

The `@jaisheel1/devdeck` package runs `prepublishOnly`, which builds the static UI and copies it into `packages/daemon/public/ui` before packing.

After install:

```bash
npm install -g @jaisheel1/devdeck
devdeck init    # creates devdeck.config.ts (uses package.json scripts when possible)
devdeck start   # daemon + bundled dashboard on one port when installed from npm
```

The global command remains `devdeck` (see `bin` in `packages/daemon/package.json`).

`repository` in [`packages/shared/package.json`](packages/shared/package.json) and [`packages/daemon/package.json`](packages/daemon/package.json) points at [github.com/jaisheel41/DevDeck](https://github.com/jaisheel41/DevDeck); update it if the canonical remote changes.

## `devdeck.config.ts` in this repo vs your app

The committed [`devdeck.config.ts`](devdeck.config.ts) is a **generic monorepo example** for working on DevDeck itself. It is **not** published with the npm CLI tarball.

When you use DevDeck for another project (e.g. Penny), run **`devdeck init`** in **that** project’s root so it gets its own `devdeck.config.ts` pointing at its `package.json` scripts and ports. Paths like `../penny` belong only in that app’s repo, not in the DevDeck package.

## Troubleshooting: `EPERM` / `errno: -4048` / `.next/trace` (Windows)

Next.js writes under **`packages/ui/.next/`** (including trace data). On Windows you often see **`Error: EPERM: operation not permitted, open '...\.next\trace'`** when:

1. **OneDrive / cloud-synced folder** — The repo lives under `OneDrive\...`, sync locks files while Next reads/writes. **Fix:** move the clone to a normal path (e.g. `C:\src\DevDeck`) or [pause OneDrive](https://support.microsoft.com/office) for that folder, or exclude `node_modules`, `.next`, and `.turbo` from sync.
2. **Dev and build at the same time** — `next dev` and `next build` both touch `.next`. **Fix:** stop `pnpm dev` before static export / `build-static`, or run them in separate clones. See [Next.js discussion on trace + EPERM](https://github.com/vercel/next.js/issues/48643).
3. **Stale locks** — Delete `packages/ui/.next` (and root `.turbo` if needed), then run again.
4. Some users report **Windows Developer Mode** helps with symlink/permission issues when developing Node apps.

The published **`@jaisheel1/devdeck`** package does not bundle Penny or any app-specific env; only your own `devdeck.config.ts` + that app’s directory matter at runtime.
