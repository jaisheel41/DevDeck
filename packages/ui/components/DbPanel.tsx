"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

function isDestructive(sql: string): boolean {
  const t = sql.trim();
  if (/\bTRUNCATE\b/i.test(t)) return true;
  if (/\bDROP\s+TABLE\b/i.test(t)) return true;
  if (/^\s*DELETE\s+FROM/i.test(t) && !/\bWHERE\b/i.test(t)) return true;
  return false;
}

const MONO: React.CSSProperties = {
  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontSize: 11,
};

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: "-apple-system, sans-serif",
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "var(--text-ghost)",
};

interface DbPanelProps {
  base: string;
  serviceId: string | null;
}

export function DbPanel({ base, serviceId }: DbPanelProps) {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
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
    else { setErr(null); setTables(j.tables ?? []); }
  }, [base, serviceId]);

  useEffect(() => { void loadTables(); }, [loadTables]);

  const run = async (text: string, skipConfirm?: boolean) => {
    if (!serviceId) return;
    if (!skipConfirm && isDestructive(text)) { setPendingSql(text); return; }
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
    if (j.error) { setErr(j.error); setRows([]); setFields([]); setMeta(""); return; }
    setRows(j.rows ?? []);
    setFields(j.fields ?? []);
    setMeta(`${j.rowCount ?? (j.rows?.length ?? 0)} rows · ${j.durationMs ?? 0}ms`);
    setPage(0);
    setSortKey(null);
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const sa = a[sortKey] == null ? "" : String(a[sortKey]);
      const sb = b[sortKey] == null ? "" : String(b[sortKey]);
      const c = sa.localeCompare(sb);
      return sortDir === "asc" ? c : -c;
    });
  }, [rows, sortKey, sortDir]);

  const pageRows = useMemo(() => {
    const s = page * pageSize;
    return sortedRows.slice(s, s + pageSize);
  }, [sortedRows, page]);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  if (!serviceId) {
    return (
      <p style={{ ...MONO, padding: 16, color: "var(--text-ghost)" }}>
        Select a service with a postgres{" "}
        <code style={{ color: "var(--text-mid)" }}>DATABASE_URL</code> to use the DB client.
      </p>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        gap: 0,
      }}
    >
      {/* Destructive confirm modal */}
      {pendingSql && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
          }}
        >
          <div
            style={{
              maxWidth: 420,
              padding: 20,
              border: "1px solid var(--border)",
              borderRadius: 4,
              background: "var(--surface)",
              ...MONO,
            }}
          >
            <p style={{ marginBottom: 10, color: "var(--warn)", fontWeight: 700 }}>
              This query looks destructive. Run anyway?
            </p>
            <pre
              style={{
                marginBottom: 16,
                maxHeight: 120,
                overflowY: "auto",
                color: "var(--text-mid)",
                fontSize: 10,
                whiteSpace: "pre-wrap",
              }}
            >
              {pendingSql}
            </pre>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setPendingSql(null)}
                style={{
                  padding: "4px 12px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 3,
                  ...MONO,
                  color: "var(--text-mid)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void run(pendingSql!, true)}
                style={{
                  padding: "4px 12px",
                  background: "var(--error)",
                  border: "none",
                  borderRadius: 3,
                  ...MONO,
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table list */}
      <div
        style={{
          width: 160,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
          padding: "10px 0",
        }}
      >
        <div style={{ padding: "0 12px 8px", ...SECTION_LABEL }}>Tables</div>
        {tables.map((t) => {
          const active = selectedTable === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedTable(t);
                const q = `SELECT * FROM "${t}" LIMIT 100`;
                setSql(q);
                void run(q, true);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "5px 12px",
                textAlign: "left",
                background: active ? "var(--surface)" : "transparent",
                boxShadow: active ? "inset 3px 0 0 var(--accent)" : "inset 3px 0 0 transparent",
                border: "none",
                cursor: "pointer",
                ...MONO,
                color: active ? "var(--text-bright)" : "var(--text-dim)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                transition: "all 0.12s ease",
              }}
            >
              {t}
            </button>
          );
        })}
        {tables.length === 0 && (
          <p style={{ padding: "0 12px", ...MONO, color: "var(--text-ghost)", fontSize: 10 }}>
            No tables found
          </p>
        )}
      </div>

      {/* Editor + results */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {/* SQL editor */}
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void run(sql);
            }
          }}
          style={{
            flexShrink: 0,
            height: 100,
            resize: "none",
            padding: "10px 12px",
            background: "var(--surface)",
            border: "none",
            borderBottom: "1px solid var(--border)",
            ...MONO,
            color: "var(--text-mid)",
            outline: "none",
          }}
        />

        {/* Run bar */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => void run(sql)}
            style={{
              padding: "3px 14px",
              background: "var(--accent)",
              border: "none",
              borderRadius: 3,
              ...MONO,
              fontWeight: 800,
              color: "var(--bg)",
              cursor: "pointer",
            }}
          >
            Run
          </button>
          <span style={{ ...MONO, fontSize: 10, color: "var(--text-ghost)" }}>
            ⌘↩
          </span>
          {err && (
            <span style={{ ...MONO, fontSize: 10, color: "var(--error)", flex: 1 }}>
              {err}
            </span>
          )}
        </div>

        {/* Results grid */}
        <div style={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              ...MONO,
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", background: "var(--surface)", position: "sticky", top: 0 }}>
                {fields.map((f) => (
                  <th
                    key={f.name}
                    style={{ padding: "5px 8px", textAlign: "left", ...SECTION_LABEL, whiteSpace: "nowrap" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(f.name)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        ...SECTION_LABEL,
                        color: sortKey === f.name ? "var(--accent)" : "var(--text-ghost)",
                      }}
                    >
                      {f.name}
                      {sortKey === f.name ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {fields.map((f) => (
                    <td
                      key={f.name}
                      style={{
                        padding: "4px 8px",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--text-mid)",
                      }}
                    >
                      {row[f.name] == null ? (
                        <span style={{ color: "var(--text-ghost)" }}>NULL</span>
                      ) : (
                        String(row[f.name])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "5px 12px",
            borderTop: "1px solid var(--border)",
            ...MONO,
            fontSize: 10,
            color: "var(--text-ghost)",
          }}
        >
          <span>{meta}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{
                padding: "2px 8px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 3,
                ...MONO,
                color: "var(--text-ghost)",
                cursor: page === 0 ? "default" : "pointer",
                opacity: page === 0 ? 0.3 : 1,
              }}
            >
              Prev
            </button>
            <button
              type="button"
              disabled={(page + 1) * pageSize >= sortedRows.length}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "2px 8px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 3,
                ...MONO,
                color: "var(--text-ghost)",
                cursor: (page + 1) * pageSize >= sortedRows.length ? "default" : "pointer",
                opacity: (page + 1) * pageSize >= sortedRows.length ? 0.3 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
