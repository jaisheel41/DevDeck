/**
 * Example config for hacking on the DevDeck monorepo.
 * For your own app (e.g. Penny), run `devdeck init` in that project — do not ship app-specific paths here.
 */
export default {
  project: "DevDeck",
  services: [
    {
      id: "stack",
      name: "Monorepo (turbo dev)",
      command: "pnpm dev",
      port: 3000,
      autoStart: false,
    },
  ],
  quickLinks: [
    { label: "DevDeck UI (Next)", url: "http://localhost:4321" },
    { label: "Daemon (bundled UI)", url: "http://127.0.0.1:3132" },
  ],
  quickCommands: [
    { label: "Lint", command: "pnpm lint" },
    { label: "Node version", command: "node -v" },
  ],
};
