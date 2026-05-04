"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function isDestructiveSql(sql: string): boolean {
  const t = sql.trim();
  if (/\bTRUNCATE\b/i.test(t)) return true;
  if (/\bDROP\s+TABLE\b/i.test(t)) return true;
  if (/^\s*DELETE\s+FROM/i.test(t) && !/\bWHERE\b/i.test(t)) return true;
  return false;
}

interface DbPanelProps {
  base: string;
  serviceId: string | null;
}

export function DbPanel({ base, serviceId }: DbPanelProps) {
  const [tables, setTables] = useState<string[]>([]);
  const [sql, setSql] = useState("SELECT 1");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fields, setFields] = useState<{ name: string }[]>([]);
  const [meta, setMeta] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pendingSql, setPendingSql] = useState<string | null>(null);

  const pageSize = 100;

  const loadTables = useCallback(async () => {
    if (!serviceId) return;
    const r = await fetch(`${base}/api/db/tables?serviceId=${encodeURIComponent(serviceId)}`);
    const j = (await r.json()) as { tables?: string[]; error?: string };
    if (j.error) setErr(j.error);
    else {
      setErr(null);
      setTables(j.tables ?? []);
    }
  }, [base, serviceId]);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  const run = async (text: string, skipConfirm?: boolean) => {
    if (!serviceId) return;
    if (!skipConfirm && isDestructiveSql(text)) {
      setPendingSql(text);
      return;
    }
    setPendingSql(null);
    setErr(null);
    const r = await fetch(`${base}/api/db/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId, sql: text }),
    });
    const j = (await r.json()) as {
      rows?: Record<string, unknown>[];
      fields?: { name: string }[];
      rowCount?: number;
      durationMs?: number;
      error?: string;
    };
    if (j.error) {
      setErr(j.error);
      setRows([]);
      setFields([]);
      setMeta("");
      return;
    }
    setRows(j.rows ?? []);
    setFields(j.fields ?? []);
    setMeta(`${j.rowCount ?? (j.rows?.length ?? 0)} rows in ${j.durationMs ?? 0}ms`);
    setPage(0);
    setSortKey(null);
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const sa = va == null ? "" : String(va);
      const sb = vb == null ? "" : String(vb);
      const c = sa.localeCompare(sb);
      return sortDir === "asc" ? c : -c;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const pageRows = useMemo(() => {
    const start = page * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page]);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  if (!serviceId) {
    return (
      <p className="p-4 font-mono text-sm text-gray-500">
        Select a service with a postgres <code className="text-gray-300">DATABASE_URL</code> in its env files (e.g.{" "}
        <code className="text-gray-300">.env.local</code>) to use the DB client.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-2 p-2">
      {pendingSql && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-md rounded border border-deck-border bg-deck-panel p-4 font-mono text-sm">
            <p className="mb-2 text-amber-300">This query looks destructive. Run anyway?</p>
            <pre className="mb-4 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-gray-400">{pendingSql}</pre>
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded bg-gray-700 px-3 py-1" onClick={() => setPendingSql(null)}>
                Cancel
              </button>
              <button type="button" className="rounded bg-red-700 px-3 py-1" onClick={() => void run(pendingSql!, true)}>
                Run
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="w-48 shrink-0 overflow-auto rounded border border-deck-border bg-deck-panel p-2 font-mono text-xs">
        <div className="mb-2 text-gray-500">Tables</div>
        {tables.map((t) => (
          <button
            key={t}
            type="button"
            className="mb-1 block w-full truncate rounded px-1 py-0.5 text-left text-blue-300 hover:bg-gray-800"
            onClick={() => {
              setSql(`SELECT * FROM "${t}" LIMIT 100`);
              void run(`SELECT * FROM "${t}" LIMIT 100`, true);
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          className="h-28 w-full resize-none rounded border border-deck-border bg-deck-bg p-2 font-mono text-xs text-gray-100"
        />
        <div className="flex gap-2">
          <button type="button" className="rounded bg-blue-700 px-3 py-1 font-mono text-xs" onClick={() => void run(sql)}>
            Run
          </button>
          {err && <span className="font-mono text-xs text-red-400">{err}</span>}
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded border border-deck-border bg-deck-bg">
          <table className="w-full border-collapse font-mono text-xs">
            <thead className="sticky top-0 bg-deck-panel">
              <tr>
                {fields.map((f) => (
                  <th key={f.name} className="border-b border-deck-border p-1 text-left text-gray-400">
                    <button type="button" onClick={() => toggleSort(f.name)} className="hover:text-white">
                      {f.name}
                      {sortKey === f.name ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr key={i} className="border-b border-deck-border/40">
                  {fields.map((f) => (
                    <td key={f.name} className="max-w-xs truncate p-1 text-gray-300">
                      {row[f.name] == null ? "" : String(row[f.name])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between font-mono text-xs text-gray-500">
          <span>{meta}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              className="rounded bg-gray-800 px-2 py-0.5 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={(page + 1) * pageSize >= sortedRows.length}
              className="rounded bg-gray-800 px-2 py-0.5 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
