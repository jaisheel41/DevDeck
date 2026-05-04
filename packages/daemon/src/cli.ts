import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { detectServicesFromPackageJson } from "./initDetect.js";
import { startDaemon } from "./index.js";

function openBrowser(url: string) {
  const detached = { detached: true, stdio: "ignore" as const };
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], detached).unref();
  } else if (process.platform === "darwin") {
    spawn("open", [url], detached).unref();
  } else {
    spawn("xdg-open", [url], detached).unref();
  }
}

function bundledUiPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "public", "ui", "index.html");
}

function readProjectName(cwd: string): string {
  const p = join(cwd, "package.json");
  if (!existsSync(p)) return "my-app";
  try {
    const pkg = JSON.parse(readFileSync(p, "utf8")) as { name?: string };
    return typeof pkg.name === "string" && pkg.name.length ? pkg.name : "my-app";
  } catch {
    return "my-app";
  }
}

function buildInitFile(cwd: string): string {
  const project = readProjectName(cwd);
  const detected = detectServicesFromPackageJson(cwd);
  const services =
    detected.length > 0
      ? JSON.stringify(detected, null, 2)
      : `[
    { id: "web", name: "Web", command: "pnpm dev", port: 3000, autoStart: false },
  ]`;
  return `export default {
  project: ${JSON.stringify(project)},
  services: ${services},
  quickLinks: [{ label: "App", url: "http://localhost:3000" }],
  quickCommands: [{ label: "Lint", command: "pnpm lint" }],
};
`;
}

export async function runCli(argv: string[]) {
  const cmd = argv[2] ?? "start";

  if (cmd === "init") {
    const cwd = process.cwd();
    const target = join(cwd, "devdeck.config.ts");
    if (existsSync(target)) {
      console.error("devdeck.config.ts already exists.");
      process.exit(1);
    }
    writeFileSync(target, buildInitFile(cwd), "utf8");
    console.log("Created devdeck.config.ts");
    return;
  }

  if (cmd === "start" || cmd === "serve") {
    const httpPort = await startDaemon();
    const bundled = existsSync(bundledUiPath());
    if (process.env.DEVDECK_OPEN_BROWSER !== "0") {
      const uiPort = process.env.DEVDECK_UI_PORT ?? "4321";
      const url = bundled ? `http://127.0.0.1:${httpPort}/` : `http://127.0.0.1:${uiPort}`;
      setTimeout(() => openBrowser(url), 600);
    }
    console.log(`DevDeck daemon listening on http://127.0.0.1:${httpPort}`);
    if (bundled) {
      console.log(`Dashboard: http://127.0.0.1:${httpPort}/`);
    } else {
      console.log(`Run the Next UI (e.g. pnpm dev in the devdeck repo) or install a published build with bundled UI.`);
      console.log(`Default UI URL hint: http://127.0.0.1:${process.env.DEVDECK_UI_PORT ?? "4321"}`);
    }
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  console.error("Usage: devdeck [start|init]");
  process.exit(1);
}
