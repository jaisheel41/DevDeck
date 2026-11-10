# DevDeck

[![npm version](https://img.shields.io/npm/v/@jaisheel41/devdeck)](https://www.npmjs.com/package/@jaisheel41/devdeck)
[![MIT license](https://img.shields.io/github/license/jaisheel41/DevDeck)](https://github.com/jaisheel41/DevDeck/blob/main/LICENSE)
[![CI](https://github.com/jaisheel41/DevDeck/actions/workflows/ci.yml/badge.svg)](https://github.com/jaisheel41/DevDeck/actions/workflows/ci.yml)

Local dashboard for the dev processes on your machine. One config file, one daemon, one browser UI.

## What it does

DevDeck reads `devdeck.config.ts`, starts and stops the services you list, and shows them in a dashboard.

- Start, stop, and restart each service
- Live logs over a WebSocket, keeping the last 500 lines
- CPU and memory for running services, sampled about every 2 seconds
- Env files for a service: view and edit a fixed list of `.env*` names
- Postgres queries when that service's env files contain a `postgres://` or `postgresql://` `DATABASE_URL`
- Quick links, and up to 5 quick commands (at most 3 run at once)

If `devdeck.config.ts` is missing or fails to load at startup, the daemon uses a small demo config and does not start those processes. If a later edit fails to load, it keeps the previous config and prints a warning.

## Install

You need Node.js 20 or newer.

```bash
npm install -g @jaisheel41/devdeck
devdeck
```

`npx` works too. With no arguments it starts the daemon:

```bash
npx @jaisheel41/devdeck
```

The command name is `devdeck`. npm currently has 0.1.3. `version` and `help` are in this repo and are not in that release yet. See the [changelog](CHANGELOG.md).

## Quick start

Run this in the project you want to watch:

```bash
devdeck init
devdeck start
```

`init` writes `devdeck.config.ts` from the `scripts` in that folder's `package.json`. It will not overwrite a file that is already there. It skips script names that start with `pre` or `post`, keeps at most 12 services, and leaves `autoStart` off.

`start` listens on `127.0.0.1`. The first port it tries is `DEVDECK_PORT` or 3131, then the next free port, up to 40 ports. It opens a browser unless `DEVDECK_OPEN_BROWSER=0`.

The package on npm serves the dashboard on that same port. A git checkout does not include that bundle. In this repo, run `pnpm dev` and open the `[DevDeck]` URL the UI prints. That is usually `http://127.0.0.1:4321`. The daemon writes `.devdeck/daemon.json` so the UI can find the real port.

## Config

`devdeck.config.ts` is a TypeScript file with a default export. The daemon loads it from the project root.

```ts
export default {
  project: "my-app",
  services: [
    {
      id: "web",
      name: "Web",
      command: "pnpm dev",
      port: 3000,
      cwd: ".",
      autoStart: false,
      color: "#58a6ff",
      env: { PORT: "3000" },
    },
  ],
  quickLinks: [{ label: "App", url: "http://localhost:3000" }],
  quickCommands: [{ label: "Lint", command: "pnpm lint" }],
};
```

| Field | Required | What it does |
| --- | --- | --- |
| `project` | yes | Name shown in the top bar |
| `services` | yes | Processes the daemon can start |
| `services[].id` | yes | Stable id used by the API |
| `services[].name` | yes | Label in the sidebar and logs |
| `services[].command` | yes | Shell command. The daemon runs it with `shell: true` |
| `services[].port` | no | Shown next to the service. To bind the process, put the port in `command` or `env` |
| `services[].cwd` | no | Working directory, relative to the project root. Default is the project root |
| `services[].autoStart` | no | Start when the config is loaded. Default is false |
| `services[].color` | no | Color of the service name in the log. A default is assigned if you omit it |
| `services[].env` | no | Extra environment variables for that process |
| `quickLinks` | no | Links in the sidebar. Each item is `{ label, url }` |
| `quickCommands` | no | Buttons in the bottom bar. Each item is `{ label, command }`. Only the first 5 are used |

The daemon watches the file and reloads it. A service removed from the file is stopped. A service with `autoStart: true` starts if it is stopped.

DevDeck looks in the current directory and up to 20 parents for `devdeck.config.ts`. It also stops at the first `pnpm-workspace.yaml` it finds. That directory is the project root. Set `DEVDECK_PROJECT_ROOT` to skip the walk.

The `devdeck.config.ts` in this repository is an example for working on DevDeck. It is not part of the npm package. Run `devdeck init` in your own project.

### Env files

The Env Vars tab reads these files from the service working directory. Later files override earlier ones:

`.env.example`, `.env.sample`, `.env`, `.env.local`, `.env.development`, `.env.development.local`, `.env.production`, `.env.production.local`, `.env.test`, `.env.test.local`

You can edit a file from that list in the UI. Other file names are rejected. Values stay hidden until you reveal them. Saving rewrites that one file.

### Database

Pick a service, then open the Database tab. DevDeck connects only when that service's merged env contains `DATABASE_URL` starting with `postgres://` or `postgresql://`. It lists tables in the `public` schema.

The UI asks before it runs `TRUNCATE`, `DROP TABLE`, or a `DELETE` that has no `WHERE`. After you confirm, the daemon sends the SQL as written. Use a dev database.

The "DB Queries" number on the right is separate. It counts log lines from the last 60 seconds whose service id or name looks like Postgres and whose text contains `SELECT`, `INSERT`, `UPDATE`, or `DELETE`. It is not the number of queries you ran in the Database tab.

## Commands

| Command | What it does |
| --- | --- |
| `devdeck`, `devdeck start` | Start the daemon and open the dashboard |
| `devdeck serve` | Same as `start` |
| `devdeck init` | Write `devdeck.config.ts` if it does not exist |
| `devdeck version`, `devdeck -v`, `devdeck --version` | Print the version |
| `devdeck help`, `devdeck -h`, `devdeck --help` | Print usage |

An unknown command prints usage and exits 1. `version` and `help` are not in npm 0.1.3.

### Environment variables

| Variable | Default | What it does |
| --- | --- | --- |
| `DEVDECK_PORT` | `3131` | First port the daemon tries |
| `DEVDECK_PROJECT_ROOT` | walk up from the cwd | Directory that holds the config |
| `DEVDECK_OPEN_BROWSER` | open | Set to `0` to skip the browser |
| `DEVDECK_UI_PORT` | `4321` | Port hint for the Next.js UI when the dashboard is not bundled |
| `DEVDECK_UI_HINT` | `http://localhost:4321` | Link on the plain HTML page the daemon shows when no dashboard is bundled |
| `NEXT_PUBLIC_DAEMON_HTTP` | `http://127.0.0.1:3131` | How the dev UI calls the daemon. `pnpm dev` writes this for you |
| `NEXT_PUBLIC_DAEMON_WS` | derived from the HTTP URL | WebSocket URL for the dev UI |

## Dashboard

The page has a top bar, a service list, a main panel, a metrics column, and a row of quick commands.

- The top bar shows the project name, how many services are running, and whether the WebSocket is connected.
- Hover a service for start, stop, and restart. Click it to filter logs, env, and the database. Escape clears the selection.
- Tabs are Logs, Env Vars, and Database. The metrics column stays visible.
- Logs can be filtered by text, errors, or warnings. Stderr that does not already look like an error is shown as a warning. Scrolling up pauses the tail.
- CPU and memory are the sums for services that are running. The error count is errors in the visible log window for the last 60 seconds.
- Quick command output shows up in the log with the command's label.

The daemon listens on `127.0.0.1` only.

HTTP:

- `GET /api/ui-config`
- `POST /api/services/:id/start`, `stop`, and `restart`
- `GET /api/env/:serviceId` and `PUT /api/env/:serviceId` with `{ file, vars }`
- `GET /api/db/tables?serviceId=`
- `POST /api/db/query` with `{ serviceId, sql }`
- `POST /api/quick-command` with `{ label, command }`

The WebSocket is on the same port. The UI uses it for service status, logs, and metrics. It can also send `service:start`, `service:stop`, and `service:restart`.

## Develop this repo

You need Node.js 20 or newer and pnpm 9.15.0.

```bash
pnpm install
pnpm dev
```

Other checks:

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

`pnpm typecheck` runs `tsc --noEmit`. `pnpm lint` typechecks the daemon and shared packages, and runs `next lint` on the UI. `pnpm test` runs the daemon smoke tests. There is no browser test suite.

Packages:

- `packages/daemon` is published as `@jaisheel41/devdeck`. The `bin` is `devdeck` and points at `bin/devdeck.cjs`. The published `files` are `dist`, `bin`, `public`, and `package.json`.
- `packages/shared` is published as `@jaisheel41/devdeck-shared`. It is types only.
- `packages/ui` is private. `prepublishOnly` on the daemon builds a static export of it into `packages/daemon/public/ui`.

The root package is private. It has no `bin` and no `files` list. Those fields live on the packages that are published.

The daemon depends on shared with `workspace:*`. `pnpm publish` rewrites that to the shared package's version. `npm publish` does not, so publish with pnpm.

```bash
pnpm -C packages/shared publish --access public
pnpm -C packages/daemon publish --access public
```

Publish shared first if its version changed. The suggested next CLI version is 0.2.0. It is not published from this repo automatically.

## Troubleshooting

On Windows, Next.js can throw `EPERM` opening `packages/ui/.next/trace` when the clone sits in a synced folder such as OneDrive, or when `pnpm dev` and a build run at the same time. Stop the other process, delete `packages/ui/.next`, and try again.

If 3131 is taken, the daemon moves to the next free port. During `pnpm dev`, the UI reads that port from `.devdeck/daemon.json`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). This project uses the [Contributor Covenant](CODE_OF_CONDUCT.md).

To report a vulnerability, read [SECURITY.md](SECURITY.md). The daemon runs the shell commands in your config, can write the env files it lists, and can send SQL to the database those files name.

## License

[MIT](LICENSE). Copyright 2026 Jaisheel Polimera.
