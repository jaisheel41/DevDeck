import { spawn, type ChildProcess } from "node:child_process";

/** Run a command string in a shell. On Unix the shell leads its own process group so we can stop the children too. */
export function spawnShell(
  command: string,
  options: { cwd: string; env?: NodeJS.ProcessEnv },
): ChildProcess {
  return spawn(command, {
    cwd: options.cwd,
    env: options.env,
    shell: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

/** Signal a shell command and the processes it started. */
export function signalProcessTree(proc: ChildProcess, signal: NodeJS.Signals): void {
  const pid = proc.pid;
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      proc.kill(signal);
    } catch {
      /* already exited */
    }
  }
}
