export type ServiceStatus = "stopped" | "starting" | "running" | "error";

export type LogLevel = "info" | "warn" | "error";

export interface QuickLink {
  label: string;
  url: string;
}

export interface QuickCommand {
  label: string;
  command: string;
}

export interface ServiceConfig {
  id: string;
  name: string;
  command: string;
  port?: number;
  autoStart?: boolean;
  color?: string;
  cwd?: string;
  env?: Record<string, string>;
}

export interface DevDeckConfig {
  project: string;
  services: ServiceConfig[];
  quickLinks?: QuickLink[];
  quickCommands?: QuickCommand[];
}

export interface Service extends ServiceConfig {
  status: ServiceStatus;
  pid?: number;
  /** Normalized from config; default false */
  autoStart: boolean;
}

export interface LogLine {
  id: string;
  ts: number;
  serviceId: string;
  serviceName: string;
  level: LogLevel;
  text: string;
}

export interface MetricsSnapshot {
  serviceId: string;
  cpu: number;
  memory: number;
  timestamp: number;
}

/** Daemon → UI and UI → Daemon WebSocket payloads */
export type WSMessage =
  | { type: "services:snapshot"; services: Service[]; project: string }
  | { type: "service:update"; service: Service }
  | { type: "log:line"; line: LogLine }
  | { type: "metrics:snapshot"; metrics: MetricsSnapshot[] }
  | { type: "service:start"; serviceId: string }
  | { type: "service:stop"; serviceId: string }
  | { type: "service:restart"; serviceId: string };

/** @deprecated Use ServiceEnvPayload from multi-file env API */
export interface EnvVarsPayload {
  path: string;
  vars: Record<string, string>;
}

export interface EnvLayerInfo {
  name: string;
  path: string;
  vars: Record<string, string>;
}

export interface ServiceEnvPayload {
  merged: Record<string, string>;
  provenance: Record<string, string>;
  layers: EnvLayerInfo[];
  nodeEnv: string;
}

export interface DbQueryRequestBody {
  serviceId: string;
  sql: string;
}

export interface DbFieldInfo {
  name: string;
}

export interface DbQueryResult {
  rows: Record<string, unknown>[];
  fields: DbFieldInfo[];
  rowCount: number;
  durationMs: number;
  error?: string;
}

export interface QuickCommandRequestBody {
  label: string;
  command: string;
}
