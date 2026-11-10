import type { ChildProcess } from "node:child_process";
import { signalProcessTree, spawnShell } from "./shellProc.js";

const MAX_CONCURRENT = 3;

export class QuickRunManager {
  private running = 0;
  private readonly children = new Set<ChildProcess>();

  get activeCount() {
    return this.running;
  }

  run(
    command: string,
    cwd: string,
    onStdoutLine: (line: string) => void,
    onStderrLine: (line: string) => void,
    onExit: (code: number | null) => void,
  ): { ok: true } | { ok: false; error: string } {
    if (this.running >= MAX_CONCURRENT) {
      return { ok: false, error: "Too many quick commands running (max 3)." };
    }
    this.running++;
    let proc: ChildProcess;
    try {
      proc = spawnShell(command, { cwd });
    } catch (err) {
      this.running = Math.max(0, this.running - 1);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    if (!proc.stdout || !proc.stderr) {
      signalProcessTree(proc, "SIGTERM");
      this.running = Math.max(0, this.running - 1);
      return { ok: false, error: "stdio pipes missing" };
    }
    this.children.add(proc);
    const flush = (buf: { s: string }, chunk: Buffer, cb: (l: string) => void) => {
      buf.s += chunk.toString();
      const parts = buf.s.split("\n");
      buf.s = parts.pop() ?? "";
      for (const p of parts) if (p.length) cb(p);
    };
    const ob = { s: "" };
    const eb = { s: "" };
    proc.stdout.on("data", (d) => flush(ob, d, onStdoutLine));
    proc.stderr.on("data", (d) => flush(eb, d, onStderrLine));
    proc.on("exit", (code) => {
      if (ob.s.trim()) onStdoutLine(ob.s);
      if (eb.s.trim()) onStderrLine(eb.s);
      this.children.delete(proc);
      this.running = Math.max(0, this.running - 1);
      onExit(code);
    });
    proc.on("error", () => {
      this.children.delete(proc);
      this.running = Math.max(0, this.running - 1);
      onExit(null);
    });
    return { ok: true };
  }

  shutdown() {
    for (const p of this.children) signalProcessTree(p, "SIGTERM");
    this.children.clear();
    this.running = 0;
  }
}
