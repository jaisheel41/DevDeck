# Security

DevDeck runs on your machine. It binds to 127.0.0.1, runs the shell commands in `devdeck.config.ts`, can write the env files it is allowed to edit, and can send SQL to a Postgres database named in those files. Point it at a dev database.

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | yes |

0.1.3 is the current npm release. Fixes land on `main` and ship in the next release.

## Reporting a vulnerability

Email jaisheel42@gmail.com. Do not open a public GitHub issue for a security report.

Include what you ran, the version (`npm list -g @jaisheel41/devdeck`, or the git commit), and a way to reproduce it. Leave out secrets. The maintainer will reply when they can. Please allow a few days.
