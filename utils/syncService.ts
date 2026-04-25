import {
  createPassword,
  _updatePassword,
  _removePassword,
  updateCard as apiUpdateCard,
  createCard as apiCreateCard,
  _removeCard,
} from "../api/api";

import { syncCloudCardsFromBackend } from "./cardUtils";
import { CONFIG } from "./config";
import { isOffline } from "./network";
import { syncCloudPasswordsFromBackend } from "./passwordUtils";
import { AsyncStorage } from "./userScopedStorage";

// ---- Sync policies (defaults) ----
const DEFAULTS = CONFIG.sync;

// ---- Circuit breaker state ----
let errorTimestamps: number[] = [];
let circuitOpenUntil = 0;

function now() {
  return Date.now();
}

function recordError() {
  const t = now();
  errorTimestamps.push(t);
  // trim outside of window
  const cutoff = t - DEFAULTS.circuitWindowMs;
  errorTimestamps = errorTimestamps.filter((x) => x >= cutoff);
  if (errorTimestamps.length >= DEFAULTS.circuitErrorThreshold) {
    circuitOpenUntil = t + DEFAULTS.circuitCooldownMs;
  }
}

function isCircuitOpen() {
  return now() < circuitOpenUntil;
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function backoffDelay(attempt: number) {
  const base = DEFAULTS.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * DEFAULTS.jitterMs);
  return base + jitter;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<{ ok: boolean; value?: T }> {
  for (let attempt = 0; attempt < DEFAULTS.maxRetries; attempt++) {
    try {
      const v = await fn();
      return { ok: true, value: v };
    } catch (e) {
      recordError();
      if (attempt < DEFAULTS.maxRetries - 1) {
        await sleep(backoffDelay(attempt));
      }
    }
  }
  return { ok: false };
}

type PendingPasswordOp = {
  op: "create" | "update" | "delete";
  id?: number; // server id for updates
  tempId?: string; // temporary id for offline-created items
  data?: any; // payload for create/update; not required for delete
  timestamp: string;
};

type PendingCardOp = {
  op: "create" | "update" | "delete";
  id?: number;
  tempId?: string;
  data?: any;
  timestamp: string;
};

async function loadPendingPasswordOps(): Promise<PendingPasswordOp[]> {
  try {
    const raw = await AsyncStorage.getItem("pendingPasswordOps");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePendingPasswordOps(ops: PendingPasswordOp[]) {
  try {
    await AsyncStorage.setItem("pendingPasswordOps", JSON.stringify(ops));
  } catch {}
}

async function loadPendingCardOps(): Promise<PendingCardOp[]> {
  try {
    const raw = await AsyncStorage.getItem("pendingCardOps");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePendingCardOps(ops: PendingCardOp[]) {
  try {
    await AsyncStorage.setItem("pendingCardOps", JSON.stringify(ops));
  } catch {}
}

export async function enqueueCardOp(op: PendingCardOp) {
  const ops = await loadPendingCardOps();
  ops.push(op);
  await savePendingCardOps(ops);
}

let syncing = false;

export async function syncPendingQueues() {
  if (syncing) return;
  syncing = true;
  try {
    if (await isOffline()) return;
    if (isCircuitOpen()) return;

    // ---- Password ops (batched) ----
    const pwdOps = await loadPendingPasswordOps();
    if (pwdOps.length > 0) {
      const remaining: PendingPasswordOp[] = [];
      // Process in batches
      for (let i = 0; i < pwdOps.length; i += DEFAULTS.batchSize) {
        const batch = pwdOps.slice(i, i + DEFAULTS.batchSize);
        const keep: PendingPasswordOp[] = [];

        for (const op of batch) {
          if (op.op === "create") {
            const r = await withRetry(() => createPassword(op.data));
            if (!r.ok || !r.value || !r.value.ok) {
              keep.push(op);
            }
          } else if (op.op === "update") {
            if (typeof op.id === "number") {
              const r = await withRetry(() => _updatePassword(op.id!, op.data));
              if (!r.ok || !r.value || !r.value.ok) {
                keep.push(op);
              }
            } else {
              keep.push(op);
            }
          } else if (op.op === "delete") {
            if (typeof op.id === "number") {
              const r = await withRetry(() => _removePassword(op.id!));
              if (!r.ok || !r.value || !r.value.ok) {
                keep.push(op);
              }
            }
          }
        }

        // one sync per batch
        await syncCloudPasswordsFromBackend();
        remaining.push(...keep);
        // brief pause between batches to avoid hammering
        await sleep(50);
      }
      await savePendingPasswordOps(remaining);
    }

    // ---- Card ops (batched) ----
    const cardOps = await loadPendingCardOps();
    if (cardOps.length > 0) {
      const remaining: PendingCardOp[] = [];
      for (let i = 0; i < cardOps.length; i += DEFAULTS.batchSize) {
        const batch = cardOps.slice(i, i + DEFAULTS.batchSize);
        const keep: PendingCardOp[] = [];

        for (const op of batch) {
          if (op.op === "create") {
            const r = await withRetry(() => apiCreateCard(op.data));
            if (!r.ok || !r.value || !r.value.ok) {
              keep.push(op);
            }
          } else if (op.op === "update") {
            if (typeof op.id === "number") {
              const r = await withRetry(() => apiUpdateCard(op.id!, op.data));
              if (!r.ok || !r.value || !r.value.ok) {
                keep.push(op);
              }
            } else {
              keep.push(op);
            }
          } else if (op.op === "delete") {
            if (typeof op.id === "number") {
              const r = await withRetry(() => _removeCard(op.id!));
              if (!r.ok || !r.value || !r.value.ok) {
                keep.push(op);
              }
            }
          }
        }

        await syncCloudCardsFromBackend();
        remaining.push(...keep);
        await sleep(50);
      }
      await savePendingCardOps(remaining);
    }
  } finally {
    syncing = false;
  }
}
