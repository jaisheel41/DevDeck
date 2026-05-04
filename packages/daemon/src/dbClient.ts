import pg from "pg";
import type { DbQueryResult, ServiceConfig } from "@jaisheel1/devdeck-shared";
import { loadServiceEnv } from "./envManager.js";

function getDatabaseUrl(projectRoot: string, service: ServiceConfig): string | null {
  const { merged } = loadServiceEnv(projectRoot, service);
  const u = merged.DATABASE_URL;
  if (!u) return null;
  if (u.startsWith("postgres://") || u.startsWith("postgresql://")) return u;
  return null;
}

export class DbClient {
  private pool?: pg.Pool;
  private poolUrl?: string;

  constructor(
    private readonly projectRoot: string,
    private readonly getServiceById: (id: string) => ServiceConfig | undefined,
  ) {}

  private poolFor(service: ServiceConfig): pg.Pool | null {
    const url = getDatabaseUrl(this.projectRoot, service);
    if (!url) return null;
    if (this.pool && this.poolUrl === url) return this.pool;
    if (this.pool) void this.pool.end().catch(() => undefined);
    this.pool = new pg.Pool({ connectionString: url, max: 4 });
    this.poolUrl = url;
    return this.pool;
  }

  async listTables(serviceId: string): Promise<string[]> {
    const svc = this.getServiceById(serviceId);
    if (!svc) return [];
    const pool = this.poolFor(svc);
    if (!pool) return [];
    const r = await pool.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' order by tablename`,
    );
    return r.rows.map((x) => x.tablename);
  }

  async runQuery(serviceId: string, sql: string): Promise<DbQueryResult> {
    const svc = this.getServiceById(serviceId);
    if (!svc) {
      return { rows: [], fields: [], rowCount: 0, durationMs: 0, error: "Unknown service" };
    }
    const pool = this.poolFor(svc);
    if (!pool) {
      return {
        rows: [],
        fields: [],
        rowCount: 0,
        durationMs: 0,
        error: "No postgres DATABASE_URL in service env files",
      };
    }
    const t0 = Date.now();
    try {
      const res = await pool.query(sql);
      const durationMs = Date.now() - t0;
      const fields = res.fields?.map((f) => ({ name: f.name })) ?? [];
      return {
        rows: res.rows as Record<string, unknown>[],
        fields,
        rowCount: res.rowCount ?? res.rows.length,
        durationMs,
      };
    } catch (e) {
      return {
        rows: [],
        fields: [],
        rowCount: 0,
        durationMs: Date.now() - t0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async shutdown() {
    if (this.pool) await this.pool.end().catch(() => undefined);
    this.pool = undefined;
    this.poolUrl = undefined;
  }
}
