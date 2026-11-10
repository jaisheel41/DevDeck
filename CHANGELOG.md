# Changelog

Versions here match `@jaisheel41/devdeck`. 0.2.0 is the version in this repo. It is not on npm until it is published. This file does not create a tag or a GitHub release.

npm 0.1.1 and 0.1.2 were published on 2026-05-04 and do not have their own git commits. There are no git tags yet.

## Unreleased

## 0.2.0 - 2026-11-10

### Added

- MIT license.
- `license`, `author`, `description`, `keywords`, `homepage`, `bugs`, and `repository` on the package manifests. The root package is private, so `bin` and `files` stay on the published packages.
- README, contributing guide, code of conduct, security policy, and GitHub issue and pull request templates.
- GitHub Actions workflow that installs, builds, typechecks, lints, and tests.
- Smoke tests for config loading, env files, `init` detection, quick commands, and stopping a service.
- `devdeck version` (`-v`, `--version`) and `devdeck help` (`-h`, `--help`).

### Fixed

- Stop and quick-command shutdown killed the shell and left the child process running. Unix now signals the process group. Windows uses `taskkill /T`.
- The log view ignored `color` on a service. The service name uses that color.
- The "+ Add Service" button had no handler. Services still come from `devdeck.config.ts`.
- Choosing a Postgres table did not escape double quotes in the table name.
- When the first daemon port was busy, startup called `server.close()` on a server that had never opened. Node reports `ERR_SERVER_NOT_RUNNING` for that. Startup now closes only if the server is actually listening.
- `packages/daemon` depended on `@jaisheel41/devdeck-shared` at `0.1.0` while `pnpm-lock.yaml` said `workspace:*`, so a frozen install did not match. The dependency is `workspace:*` again. Publish with pnpm so that protocol is rewritten to the real version.
- The root `package.json` had an empty `version`.

### Changed

- `devdeck init` names a detected script `dev (your-package)`.

## 0.1.3 - 2026-05-04

- The CLI loads `tsx` through a file URL, so `--import` works when the path contains a Windows drive letter.
- Published as `@jaisheel41/devdeck@0.1.3`.

## 0.1.2 - 2026-05-04

Published to npm the same day. No separate git commit.

- The CLI passes the resolved `tsx` path to `--import` instead of the bare name `tsx`.

## 0.1.1 - 2026-05-04

Published to npm the same day. No separate git commit.

- `@jaisheel41/devdeck-shared` is pinned to `0.1.0`. Version 0.1.0 had shipped `workspace:*`, which a normal install cannot resolve.

## 0.1.0 - 2026-05-04

First release, from the commits on this day.

- Daemon on `127.0.0.1`, CLI (`init`, `start`, `serve`), and the dashboard.
- Services, live logs, env files, Postgres queries, quick links, and quick commands.
- Package scope set to `@jaisheel41`.
