"use client";

import type { ServiceEnvPayload } from "@jaisheel41/devdeck-shared";
import { useCallback, useEffect, useState } from "react";

// ── Shared styles ─────────────────────────────────────────────────────────────

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

function GhostBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "1px 7px",
        background: "transparent",
        border: `1px solid ${hov ? (danger ? "var(--error)" : "var(--accent)") : "var(--border)"}`,
        borderRadius: 3,
        ...MONO,
        color: hov ? (danger ? "var(--error)" : "var(--accent)") : "var(--text-ghost)",
        cursor: "pointer",
        transition: "all 0.12s ease",
      }}
    >
      {children}
    </button>
  );
}

// ── EnvVarsPanel ──────────────────────────────────────────────────────────────

type TabName = "effective" | string;

interface EnvVarsPanelProps {
  base: string;
  serviceId: string | null;
}

export function EnvVarsPanel({ base, serviceId }: EnvVarsPanelProps) {
  const [data, setData] = useState<ServiceEnvPayload | null>(null);
  const [tab, setTab] = useState<TabName>("effective");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const load = useCallback(async () => {
    if (!serviceId) return;
    const r = await fetch(`${base}/api/env/${encodeURIComponent(serviceId)}`);
    const j = (await r.json()) as ServiceEnvPayload & { error?: string };
    if (!r.ok || j.error || !("merged" in j) || !Array.isArray(j.layers)) {
      setData(null);
      return;
    }
    setData(j);
    const local = j.layers.find((l) => l.name === ".env.local");
    setTab(local && Object.keys(local.vars).length > 0 ? ".env.local" : "effective");
  }, [base, serviceId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setTab("effective"); }, [serviceId]);
  useEffect(() => {
    if (!data?.layers) return;
    if (tab !== "effective" && !data.layers.some((l) => l.name === tab)) {
      setTab("effective");
    }
  }, [data, tab]);

  const saveFile = async (file: string, vars: Record<string, string>) => {
    if (!serviceId) return;
    await fetch(`${base}/api/env/${encodeURIComponent(serviceId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file, vars }),
    });
    setToast("Restart service to apply changes.");
    setTimeout(() => setToast(null), 4000);
    await load();
  };

  const createEnvLocal = async () => {
    await saveFile(".env.local", {});
    setTab(".env.local");
  };

  if (!serviceId) {
    return (
      <p style={{ ...MONO, padding: 16, color: "var(--text-ghost)" }}>
        Select a service to view and edit its env files.
      </p>
    );
  }
  if (!data) {
    return (
      <p style={{ ...MONO, padding: 16, color: "var(--text-ghost)" }}>
        Loading…
      </p>
    );
  }

  const { merged, provenance, layers, nodeEnv } = data;
  const activeLayer = tab !== "effective" ? layers.find((l) => l.name === tab) : undefined;
  const fileVars = activeLayer?.vars ?? {};
  const filePath = activeLayer?.path ?? "";

  const tabBase: React.CSSProperties = {
    padding: "4px 12px",
    border: "1px solid var(--border)",
    borderRadius: 3,
    cursor: "pointer",
    ...MONO,
    transition: "all 0.1s ease",
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 14,
        overflowY: "auto",
      }}
    >
      {toast && (
        <div
          style={{
            padding: "7px 12px",
            border: "1px solid var(--warn)",
            borderRadius: 3,
            ...MONO,
            color: "var(--warn)",
          }}
        >
          {toast}
        </div>
      )}

      <div style={{ ...MONO, color: "var(--text-ghost)", fontSize: 10 }}>
        Daemon{" "}
        <code style={{ color: "var(--text-mid)" }}>NODE_ENV</code>:{" "}
        <span style={{ color: "var(--text-bright)" }}>{nodeEnv}</span>
      </div>

      {/* Layer tabs */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 10,
        }}
      >
        <button
          type="button"
          onClick={() => { setTab("effective"); setEditing(null); }}
          style={{
            ...tabBase,
            background: tab === "effective" ? "var(--accent)" : "transparent",
            color: tab === "effective" ? "var(--bg)" : "var(--text-ghost)",
            borderColor: tab === "effective" ? "var(--accent)" : "var(--border)",
          }}
        >
          Effective
        </button>
        {layers.map((l) => (
          <button
            key={l.name}
            type="button"
            onClick={() => { setTab(l.name); setEditing(null); }}
            style={{
              ...tabBase,
              background: tab === l.name ? "var(--accent)" : "transparent",
              color: tab === l.name ? "var(--bg)" : "var(--text-ghost)",
              borderColor: tab === l.name ? "var(--accent)" : "var(--border)",
            }}
          >
            {l.name}
          </button>
        ))}
      </div>

      {tab === "effective" ? (
        <>
          <p style={{ ...MONO, fontSize: 10, color: "var(--text-ghost)" }}>
            Merged view — last file wins per key.
          </p>
          <div
            style={{
              overflowX: "auto",
              border: "1px solid var(--border)",
              borderRadius: 3,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                ...MONO,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  {["Key", "Value", "Defined in", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "5px 8px",
                        textAlign: "left",
                        ...SECTION_LABEL,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(merged).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: 12, color: "var(--text-ghost)", ...MONO }}
                    >
                      No variables loaded.
                    </td>
                  </tr>
                ) : (
                  Object.entries(merged).map(([k, v]) => (
                    <tr
                      key={k}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td style={{ padding: "5px 8px", color: "var(--accent)", fontWeight: 700 }}>{k}</td>
                      <td style={{ padding: "5px 8px", color: "var(--text-mid)" }}>
                        {visible[k] ? v : "••••••••"}
                      </td>
                      <td style={{ padding: "5px 8px", color: "var(--warn)" }}>
                        {provenance[k] ?? "—"}
                      </td>
                      <td style={{ padding: "5px 8px" }}>
                        <GhostBtn onClick={() => setVisible((x) => ({ ...x, [k]: !x[k] }))}>
                          {visible[k] ? "hide" : "show"}
                        </GhostBtn>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div style={{ ...MONO, fontSize: 10, color: "var(--text-ghost)", wordBreak: "break-all" }}>
            {filePath}
          </div>
          <div
            style={{
              overflowX: "auto",
              border: "1px solid var(--border)",
              borderRadius: 3,
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", ...MONO }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                  {["Key", "Value", ""].map((h) => (
                    <th key={h} style={{ padding: "5px 8px", textAlign: "left", ...SECTION_LABEL }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(fileVars).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "5px 8px", color: "var(--accent)", fontWeight: 700 }}>{k}</td>
                    <td style={{ padding: "5px 8px" }}>
                      {editing === k ? (
                        <input
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "2px 6px",
                            background: "var(--surface)",
                            border: "1px solid var(--accent)",
                            borderRadius: 3,
                            ...MONO,
                            color: "var(--text-bright)",
                            outline: "none",
                          }}
                        />
                      ) : (
                        <span style={{ color: "var(--text-mid)" }}>
                          {visible[`f:${k}`] ? v : "••••••••"}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "5px 8px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <GhostBtn onClick={() => setVisible((x) => ({ ...x, [`f:${k}`]: !x[`f:${k}`] }))}>
                          {visible[`f:${k}`] ? "hide" : "show"}
                        </GhostBtn>
                        {editing === k ? (
                          <GhostBtn
                            onClick={async () => {
                              await saveFile(tab, { ...fileVars, [k]: editVal });
                              setEditing(null);
                            }}
                          >
                            save
                          </GhostBtn>
                        ) : (
                          <GhostBtn onClick={() => { setEditing(k); setEditVal(v); }}>
                            edit
                          </GhostBtn>
                        )}
                        <GhostBtn
                          danger
                          onClick={async () => {
                            const next = { ...fileVars };
                            delete next[k];
                            await saveFile(tab, next);
                          }}
                        >
                          del
                        </GhostBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add variable */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <input
              placeholder="NEW_KEY"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              style={{
                padding: "4px 8px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 3,
                ...MONO,
                color: "var(--accent)",
                outline: "none",
                width: 140,
              }}
            />
            <input
              placeholder="value"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              style={{
                flex: 1,
                minWidth: 100,
                padding: "4px 8px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 3,
                ...MONO,
                color: "var(--text-mid)",
                outline: "none",
              }}
            />
            <GhostBtn
              onClick={async () => {
                if (!newKey.trim()) return;
                await saveFile(tab, { ...fileVars, [newKey.trim()]: newVal });
                setNewKey("");
                setNewVal("");
              }}
            >
              + Add variable
            </GhostBtn>
          </div>
        </>
      )}

      {layers.length === 0 && (
        <div
          style={{
            padding: 12,
            border: "1px solid var(--border)",
            borderRadius: 3,
            ...MONO,
            color: "var(--text-ghost)",
          }}
        >
          <p style={{ marginBottom: 10 }}>
            No <code style={{ color: "var(--text-mid)" }}>.env</code> files found.
          </p>
          <GhostBtn onClick={() => void createEnvLocal()}>
            Create .env.local
          </GhostBtn>
        </div>
      )}
    </div>
  );
}
