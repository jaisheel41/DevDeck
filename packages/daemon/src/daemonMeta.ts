import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Written for local dev (UI picks up daemon port without manual env). */
export function writeDaemonMeta(projectRoot: string, port: number) {
  const dir = join(projectRoot, ".devdeck");
  mkdirSync(dir, { recursive: true });
  const httpOrigin = `http://127.0.0.1:${port}`;
  const wsUrl = `ws://127.0.0.1:${port}`;
  writeFileSync(
    join(dir, "daemon.json"),
    JSON.stringify({ httpOrigin, wsUrl, port, host: "127.0.0.1" }, null, 2),
    "utf8",
  );
}
