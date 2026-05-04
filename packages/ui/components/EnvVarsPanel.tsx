"use client";

import type { ServiceEnvPayload } from "@devdeck/shared";
import { useCallback, useEffect, useState } from "react";

type Tab = "effective" | string;

interface EnvVarsPanelProps {
  base: string;
  serviceId: string | null;
}

export function EnvVarsPanel({ base, serviceId }: EnvVarsPanelProps) {
  const [data, setData] = useState<ServiceEnvPayload | null>(null);
  const [tab, setTab] = useState<Tab>("effective");
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
    if (local && Object.keys(local.vars).length > 0) {
      setTab(".env.local");
    } else {
      setTab("effective");
    }
  }, [base, serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setTab("effective");
  }, [serviceId]);

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
      <p className="p-4 font-mono text-sm text-gray-500">
        Select a service to view and edit env files for its working directory.
      </p>
    );
  }

  if (!data) {
    return <p className="p-4 font-mono text-sm text-gray-500">Loading env… (or service not found)</p>;
  }

  const { merged, provenance, layers, nodeEnv } = data;
  const activeLayer = typeof tab === "string" && tab !== "effective" ? layers.find((l) => l.name === tab) : undefined;
  const fileVars = activeLayer?.vars ?? {};
  const filePath = activeLayer?.path ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
      {toast && (
        <div className="rounded border border-amber-700 bg-amber-950/40 px-3 py-2 font-mono text-xs text-amber-200">{toast}</div>
      )}
      <div className="font-mono text-xs text-gray-500">
        Daemon <code className="text-gray-300">NODE_ENV</code>: <span className="text-gray-300">{nodeEnv}</span> — env files merge low→high in fixed order (always includes{" "}
        <code className="text-gray-300">.env.local</code> when present).
      </div>
      <div className="flex flex-wrap gap-1 border-b border-deck-border pb-2">
        <button
          type="button"
          className={`rounded px-2 py-1 font-mono text-xs ${tab === "effective" ? "bg-blue-900/50 text-white" : "text-gray-400 hover:text-white"}`}
          onClick={() => {
            setTab("effective");
            setEditing(null);
          }}
        >
          Effective (read-only)
        </button>
        {layers.map((l) => (
          <button
            key={l.name}
            type="button"
            className={`rounded px-2 py-1 font-mono text-xs ${tab === l.name ? "bg-blue-900/50 text-white" : "text-gray-400 hover:text-white"}`}
            onClick={() => {
              setTab(l.name);
              setEditing(null);
            }}
          >
            {l.name}
          </button>
        ))}
      </div>

      {tab === "effective" ? (
        <>
          <p className="font-mono text-xs text-gray-500">Merged view — last file in the stack wins per key.</p>
          <div className="overflow-auto rounded border border-deck-border">
            <table className="w-full border-collapse font-mono text-xs">
              <thead className="sticky top-0 bg-deck-bg">
                <tr className="border-b border-deck-border text-left text-gray-400">
                  <th className="p-2">Key</th>
                  <th className="p-2">Value</th>
                  <th className="p-2">Defined in</th>
                  <th className="p-2 w-20"> </th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(merged).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-gray-500">
                      No variables loaded (no env files or all empty). Create a file in another tab.
                    </td>
                  </tr>
                ) : (
                  Object.entries(merged).map(([k, v]) => (
                    <tr key={k} className="border-b border-deck-border/60">
                      <td className="p-2 text-blue-300">{k}</td>
                      <td className="p-2 text-gray-300">{visible[k] ? v : "••••••••"}</td>
                      <td className="p-2 text-amber-200/80">{provenance[k] ?? "—"}</td>
                      <td className="p-2">
                        <button
                          type="button"
                          className="text-gray-500 hover:text-white"
                          onClick={() => setVisible((x) => ({ ...x, [k]: !x[k] }))}
                        >
                          {visible[k] ? "hide" : "show"}
                        </button>
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
          <div className="break-all font-mono text-xs text-gray-500">{filePath}</div>
          <div className="overflow-auto rounded border border-deck-border">
            <table className="w-full border-collapse font-mono text-xs">
              <thead className="sticky top-0 bg-deck-bg">
                <tr className="border-b border-deck-border text-left text-gray-400">
                  <th className="p-2">Key</th>
                  <th className="p-2">Value</th>
                  <th className="p-2 w-28"> </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(fileVars).map(([k, v]) => (
                  <tr key={k} className="border-b border-deck-border/60">
                    <td className="p-2 text-blue-300">{k}</td>
                    <td className="p-2">
                      {editing === k ? (
                        <input
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          className="w-full rounded border border-deck-border bg-deck-bg px-1 text-gray-200"
                        />
                      ) : (
                        <span className="text-gray-300">{visible[`f:${k}`] ? v : "••••••••"}</span>
                      )}
                    </td>
                    <td className="space-x-1 p-2">
                      <button
                        type="button"
                        className="text-gray-500 hover:text-white"
                        onClick={() => setVisible((x) => ({ ...x, [`f:${k}`]: !x[`f:${k}`] }))}
                      >
                        {visible[`f:${k}`] ? "hide" : "show"}
                      </button>
                      {editing === k ? (
                        <button
                          type="button"
                          className="text-green-400"
                          onClick={async () => {
                            const next = { ...fileVars, [k]: editVal };
                            await saveFile(tab as string, next);
                            setEditing(null);
                          }}
                        >
                          save
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-blue-400"
                          onClick={() => {
                            setEditing(k);
                            setEditVal(v);
                          }}
                        >
                          edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-red-400"
                        onClick={async () => {
                          const next = { ...fileVars };
                          delete next[k];
                          await saveFile(tab as string, next);
                        }}
                      >
                        del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="NEW_KEY"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="rounded border border-deck-border bg-deck-bg px-2 py-1 font-mono text-xs"
            />
            <input
              placeholder="value"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              className="min-w-[12rem] flex-1 rounded border border-deck-border bg-deck-bg px-2 py-1 font-mono text-xs"
            />
            <button
              type="button"
              className="rounded bg-blue-700 px-3 py-1 font-mono text-xs"
              onClick={async () => {
                if (!newKey.trim()) return;
                const next = { ...fileVars, [newKey.trim()]: newVal };
                setNewKey("");
                setNewVal("");
                await saveFile(tab as string, next);
              }}
            >
              Add variable
            </button>
          </div>
        </>
      )}

      {layers.length === 0 && (
        <div className="rounded border border-deck-border bg-deck-panel/30 p-3 font-mono text-xs text-gray-400">
          <p className="mb-2">No <code className="text-gray-200">.env</code> files found in this service directory yet.</p>
          <button type="button" className="rounded bg-blue-800 px-3 py-1.5 text-gray-100" onClick={() => void createEnvLocal()}>
            Create .env.local
          </button>
        </div>
      )}
    </div>
  );
}
