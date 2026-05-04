export default {
  project: "Penny",
  services: [
    {
      id: "web",
      name: "Penny — Next.js dev",
      command: "npm run dev",
      port: 3000,
      cwd: "../penny",
      autoStart: false,
    },
  ],
  quickLinks: [
    { label: "Penny app", url: "http://localhost:3000" },
    { label: "Login", url: "http://localhost:3000/login" },
    { label: "DevDeck UI", url: "http://localhost:4321" },
  ],
  quickCommands: [
    { label: "Lint (penny)", command: 'npm --prefix "../penny" run lint' },
    { label: "Typecheck (penny)", command: 'npm --prefix "../penny" run typecheck' },
    { label: "Build (penny)", command: 'npm --prefix "../penny" run build' },
    { label: "Node version", command: "node -v" },
  ],
};
