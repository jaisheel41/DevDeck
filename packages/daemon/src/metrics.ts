import pidusage from "pidusage";
import type { MetricsSnapshot, WSMessage } from "@devdeck/shared";
import type { BroadcastFn } from "./processManager.js";

export class MetricsCollector {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly broadcast: BroadcastFn,
    private readonly getPids: () => { serviceId: string; pid: number }[],
  ) {}

  start() {
    this.stop();
    this.timer = setInterval(() => void this.tick(), 2000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async tick() {
    const pairs = this.getPids();
    if (!pairs.length) return;
    const metrics: MetricsSnapshot[] = [];
    const now = Date.now();
    for (const { serviceId, pid } of pairs) {
      try {
        const st = await pidusage(pid);
        metrics.push({
          serviceId,
          cpu: typeof st.cpu === "number" ? st.cpu : 0,
          memory: typeof st.memory === "number" ? st.memory : 0,
          timestamp: now,
        });
      } catch {
        metrics.push({ serviceId, cpu: 0, memory: 0, timestamp: now });
      }
    }
    const msg: WSMessage = { type: "metrics:snapshot", metrics };
    this.broadcast(msg);
  }
}
