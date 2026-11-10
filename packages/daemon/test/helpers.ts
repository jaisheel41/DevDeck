import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function waitFor(check: () => boolean, ms = 4000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (check()) {
        resolve();
        return;
      }
      if (Date.now() - start > ms) {
        reject(new Error("timed out"));
        return;
      }
      setTimeout(tick, 40);
    };
    tick();
  });
}

export function processesMatching(token: string): number[] {
  const out = execFileSync("ps", ["-ax", "-o", "pid=,command="], { encoding: "utf8" });
  const pids: number[] = [];
  for (const line of out.split("\n")) {
    if (!line.includes(token)) continue;
    const pid = Number(line.trim().split(/\s+/)[0]);
    if (pid) pids.push(pid);
  }
  return pids;
}

export function killPids(pids: number[]) {
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
  }
}

export function tempDir(prefix: string): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return {
    dir,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
