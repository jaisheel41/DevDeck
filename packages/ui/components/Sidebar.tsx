"use client";

import { useState } from "react";
import type { QuickLink, Service, ServiceStatus } from "@devdeck/shared";

// ── Primitives ────────────────────────────────────────────────────────────────

function dotProps(status: ServiceStatus): React.CSSProperties {
  if (status === "running") {
    return { background: "var(--accent)", boxShadow: "0 0 10px var(--accent)" };
  }
  if (status === "starting") {
    return { background: "var(--warn)", boxShadow: "0 0 10px var(--warn)" };
  }
  if (status === "error") {
    return { background: "var(--error)", boxShadow: "0 0 6px var(--error)" };
  }
  return { background: "var(--dot-off)" };
}

function StatusDot({ status }: { status: ServiceStatus }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        flexShrink: 0,
        ...dotProps(status),
      }}
    />
  );
}

function IconBtn({
  title,
  accent,
  onClick,
  children,
}: {
  title: string;
  accent: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 18,
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1px solid ${hov ? accent + "55" : "transparent"}`,
        background: hov ? accent + "18" : "transparent",
        color: hov ? accent : "var(--text-ghost)",
        borderRadius: 3,
        cursor: "pointer",
        padding: 0,
        transition: "all 0.1s ease",
      }}
    >
      {children}
    </button>
  );
}

// ── Service row ───────────────────────────────────────────────────────────────

function ServiceRow({
  service,
  isActive,
  onClick,
  onStart,
  onStop,
  onRestart,
}: {
  service: Service;
  isActive: boolean;
  onClick: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
}) {
  const [hov, setHov] = useState(false);
  const lit = isActive || hov;
  const showActions = hov && service.status !== "starting";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 8px 6px 0",
        background: lit ? "var(--surface)" : "transparent",
        /* inset box-shadow gives the 3px left strip without layout shift */
        boxShadow: lit
          ? "inset 3px 0 0 var(--accent)"
          : "inset 3px 0 0 transparent",
        transition: "box-shadow 0.15s ease, background 0.15s ease",
      }}
    >
      {/* Name + dot */}
      <button
        type="button"
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          minWidth: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "0 0 0 12px",
          textAlign: "left",
        }}
      >
        <StatusDot status={service.status} />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontFamily: "-apple-system, sans-serif",
            color: lit ? "var(--text-bright)" : "var(--text-dim)",
            fontWeight: isActive ? 600 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            transition: "color 0.15s ease",
          }}
        >
          {service.name}
        </span>
        {!showActions && service.port != null && (
          <span
            style={{
              fontFamily: "'SF Mono', monospace",
              fontSize: 9,
              color: "var(--text-ghost)",
              flexShrink: 0,
              paddingRight: 4,
            }}
          >
            :{service.port}
          </span>
        )}
      </button>

      {/* Hover actions */}
      {showActions && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, paddingRight: 6 }}>
          {(service.status === "stopped" || service.status === "error") && (
            <IconBtn title="Start" accent="var(--accent)" onClick={onStart}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <polygon points="2,1 2,7 7,4" fill="currentColor" />
              </svg>
            </IconBtn>
          )}
          {service.status === "running" && (
            <IconBtn title="Stop" accent="var(--error)" onClick={onStop}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <rect x="1.5" y="1.5" width="5" height="5" rx="1" fill="currentColor" />
              </svg>
            </IconBtn>
          )}
          <IconBtn title="Restart" accent="var(--warn)" onClick={onRestart}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path
                d="M1 4.5A3.5 3.5 0 1 1 1.6 7M1 4.5V2M1 4.5H3.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </IconBtn>
        </div>
      )}
    </div>
  );
}

// ── Quick link row ────────────────────────────────────────────────────────────

function QuickLinkRow({ link }: { link: QuickLink }) {
  const [hov, setHov] = useState(false);
  const portMatch = link.url.match(/:(\d{2,5})/);
  const port = portMatch ? portMatch[1] : null;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px 5px 12px",
        textDecoration: "none",
        background: hov ? "var(--surface)" : "transparent",
        transition: "background 0.15s ease",
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M1 4h6M4.5 1l3 3-3 3"
          stroke="var(--accent)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={hov ? 1 : 0.5}
          style={{ transition: "opacity 0.15s ease" }}
        />
      </svg>
      <span
        style={{
          flex: 1,
          fontSize: 12,
          fontFamily: "-apple-system, sans-serif",
          color: "var(--accent)",
          opacity: hov ? 1 : 0.5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          transition: "opacity 0.15s ease",
        }}
      >
        {link.label}
      </span>
      {port && (
        <span
          style={{
            fontFamily: "'SF Mono', monospace",
            fontSize: 9,
            color: "var(--text-ghost)",
            flexShrink: 0,
          }}
        >
          :{port}
        </span>
      )}
    </a>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "var(--text-ghost)",
  fontFamily: "-apple-system, sans-serif",
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({
  services,
  quickLinks,
  selectedId,
  onSelect,
  onStart,
  onStop,
  onRestart,
}: {
  services: Service[];
  quickLinks: QuickLink[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
}) {
  const running = services.filter((s) => s.status === "running").length;

  return (
    <aside
      style={{
        width: 180,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "2px solid var(--border)",
        background: "var(--bg)",
        overflow: "hidden",
      }}
    >
      {/* SERVICES header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px 7px",
        }}
      >
        <span style={SECTION_LABEL}>Services</span>
        <span
          style={{
            fontFamily: "'SF Mono', monospace",
            fontSize: 9,
            color: "var(--text-ghost)",
          }}
        >
          {running}/{services.length}
        </span>
      </div>

      {/* Service list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {services.map((s) => (
          <ServiceRow
            key={s.id}
            service={s}
            isActive={selectedId === s.id}
            onClick={() => onSelect(selectedId === s.id ? null : s.id)}
            onStart={() => onStart(s.id)}
            onStop={() => onStop(s.id)}
            onRestart={() => onRestart(s.id)}
          />
        ))}
        {services.length === 0 && (
          <p
            style={{
              padding: "8px 12px",
              fontFamily: "'SF Mono', monospace",
              fontSize: 10,
              color: "var(--text-ghost)",
            }}
          >
            No services configured
          </p>
        )}
      </div>

      {/* QUICK LINKS */}
      {quickLinks.length > 0 && (
        <>
          <div style={{ height: 1, background: "var(--border)" }} />
          <div style={{ padding: "8px 0 6px" }}>
            <div style={{ padding: "0 12px 6px", ...SECTION_LABEL }}>
              Quick Links
            </div>
            {quickLinks.map((l) => (
              <QuickLinkRow key={l.url + l.label} link={l} />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
