import RNAsyncStorage from "@react-native-async-storage/async-storage";

export type LogLevel = "info" | "warn" | "error";
export type LogEvent = {
  id: string;
  ts: number;
  level: LogLevel;
  tag: string;
  message: string;
  meta?: any;
};

const STORAGE_KEY = "activityLogs";
let MAX_LOGS = 50;
let buffer: LogEvent[] = [];
let loaded = false;
let loadingPromise: Promise<void> | null = null;

export function setMaxLogs(limit: number) {
  if (![20, 50, 100].includes(limit)) return;
  MAX_LOGS = limit;
  if (buffer.length > MAX_LOGS) {
    buffer = buffer.slice(buffer.length - MAX_LOGS);
    persist().catch(() => {});
  }
}

// Redaction helpers
const EMAIL_RE = /([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+)\.[a-zA-Z0-9-.]+/g;
const PHONE_RE = /\b\+?\d[\d\s().-]{6,}\b/g;
const TOKEN_RE = /(Bearer\s+)?([A-Za-z0-9-_]{8,}|eyJ[a-zA-Z0-9._-]{10,})/g;
const PASSWORD_RE = /(password|pass|pwd|pin|secret|cvv)\s*[:=]\s*([^\s,}{"]+)/gi;
const CARD_RE = /\b(\d{4})[-\s]?\d{4}[-\s]?\d{4}[-\s]?(\d{4})\b/g;

function maskString(s: string): string {
  let out = s;
  out = out.replace(PASSWORD_RE, (_m, k) => `${k}: ***`);
  out = out.replace(/authorization\s*[:=]\s*[^\s,}{"]+/gi, "authorization: ***");
  out = out.replace(TOKEN_RE, "***");
  out = out.replace(CARD_RE, "**** **** **** ****");
  out = out.replace(/\bcvv\b[:=]?\s*\d{3,4}/gi, "cvv: ***");
  out = out.replace(EMAIL_RE, "***@***");
  out = out.replace(PHONE_RE, "***");
  return out;
}

export function redactDeep<T>(val: T): T {
  return _redact(val) as T;
}

function _redact(val: any): any {
  if (val == null) return val;
  if (typeof val === "string") return maskString(val);
  if (typeof val === "number" || typeof val === "boolean") return val;
  if (Array.isArray(val)) return val.map(_redact);
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") {
    const out: any = Array.isArray(val) ? [] : {};
    for (const [k, v] of Object.entries(val)) {
      const lk = k.toLowerCase();
      if (
        [
          "password",
          "pass",
          "pwd",
          "pin",
          "secret",
          "token",
          "authorization",
          "auth",
          "cvv",
        ].includes(lk)
      ) {
        out[k] = "***";
      } else if (["card", "cardNumber", "number"].includes(lk) && typeof v === "string") {
        out[k] = "**** **** **** ****";
      } else if (["email", "mail"].includes(lk) && typeof v === "string") {
        out[k] = "***@***";
      } else if (["phone", "tel", "mobile"].includes(lk) && typeof v === "string") {
        out[k] = "***";
      } else {
        out[k] = _redact(v);
      }
    }
    return out;
  }
  try {
    return maskString(String(val));
  } catch {
    return val;
  }
}

async function persist() {
  try {
    const serialized = JSON.stringify(buffer);
    await RNAsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    // swallow
  }
}

export async function load() {
  if (loaded) return;
  if (loadingPromise) {
    return loadingPromise;
  }
  loadingPromise = (async () => {
    try {
      const raw = await RNAsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) buffer = arr;
      }
      if (buffer.length > MAX_LOGS) buffer = buffer.slice(buffer.length - MAX_LOGS);
    } catch {
      buffer = [];
    } finally {
      loaded = true;
      loadingPromise = null;
    }
  })();
  return loadingPromise;
}

export function getAll(): LogEvent[] {
  const sorted = [...buffer].sort((a, b) => b.ts - a.ts);
  return sorted;
}

export async function clear() {
  buffer = [];
  try {
    await RNAsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export async function log(level: LogLevel, tag: string, message: string, meta?: any) {
  await load();
  const evt: LogEvent = {
    id:
      (global as any).crypto?.randomUUID?.() ||
      `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    ts: Date.now(),
    level,
    tag,
    message: maskString(message || ""),
    meta: meta === undefined ? undefined : redactDeep(meta),
  };
  buffer.push(evt);
  if (buffer.length > MAX_LOGS) buffer.shift();
  persist().catch(() => {});
}

export const logger = {
  load,
  getAll,
  clear,
  log,
  info: (tag: string, message: string, meta?: any) => log("info", tag, message, meta),
  warn: (tag: string, message: string, meta?: any) => log("warn", tag, message, meta),
  error: (tag: string, message: string, meta?: any) => log("error", tag, message, meta),
  setMaxLogs,
};
