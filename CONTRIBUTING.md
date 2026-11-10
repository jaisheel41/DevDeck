# Contributing

Issues and pull requests are welcome.

## Setup

You need Node.js 20 or newer and pnpm 9.15.0.

```bash
git clone https://github.com/jaisheel41/DevDeck.git
cd DevDeck
pnpm install
pnpm dev
```

`pnpm dev` starts the daemon and the Next.js dashboard. The terminal prints a `[DevDeck]` URL, usually http://127.0.0.1:4321.

The example `devdeck.config.ts` in the repo root is for this monorepo. It is not the config of an app you install DevDeck into.

## Checks

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm typecheck` runs `tsc --noEmit` for the shared package, the daemon (including tests), and the UI. `pnpm lint` typechecks the daemon and shared packages, and runs `next lint` on the UI. The tests cover config loading, env files, script detection, quick commands, and stopping a process. There is no browser test suite.

## Pull requests

Keep the change focused. Say what you changed and how you checked it. Write the way the README is written: short, plain sentences.

Do not publish to npm, push tags, or open a GitHub release. The maintainer does that after review.

## Code of conduct

This project uses the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Security

If the bug is a vulnerability, follow [SECURITY.md](SECURITY.md). Do not file a public issue for that.
