import { apiGetWrappedDEK } from "../api/api";

import { AsyncStorage } from "./userScopedStorage";

// Keys are user-scoped via AsyncStorage wrapper (prefix applied in wrapper)
const KEY_WRAP_VERSION = "keys.dekWrap.version";
const KEY_WRAP_META = "keys.dekWrap.meta";

export type KdfParams = { iterations: number; dkLen: number; kdfVersion?: number };
export type DekWrapMeta = {
  nonce: string;
  ct: string;
  saltMP?: string;
  kdfParams?: KdfParams;
  updatedAt?: string;
  bindingTag?: string;
  // TODO(ETag): cache ETag string from last successful GET to enable 304 handling
  // etag?: string;
};

export async function getLocalWrapVersion(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(KEY_WRAP_VERSION);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function setLocalWrapVersion(ver: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_WRAP_VERSION, String(ver));
  } catch {}
}

export async function getLocalWrapMeta(): Promise<DekWrapMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_WRAP_META);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DekWrapMeta;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function setLocalWrapMeta(meta: DekWrapMeta): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_WRAP_META, JSON.stringify(meta));
  } catch {}
}

export async function clearLocalWrapInfo(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_WRAP_VERSION);
  } catch {}
  try {
    await AsyncStorage.removeItem(KEY_WRAP_META);
  } catch {}
}

// Fetch remote wrap info (non-mutating)
export async function fetchRemoteWrapInfo(): Promise<{
  ok: boolean;
  wrapGeneration: number | null;
  meta: DekWrapMeta | null;
}> {
  try {
    // TODO(ETag): Pass cached etag via If-None-Match and handle 304 Not Modified
    const resp: any = await apiGetWrappedDEK();
    const body = resp?.data || {};
    // Support both new and transitional response shapes
    const wrapGeneration: number | null =
      typeof body.wrapGeneration === "number" && Number.isFinite(body.wrapGeneration)
        ? body.wrapGeneration
        : null;
    const dekWrapped = body.dekWrappedByMP || body.DEK_wrapped_by_MP || null;
    const saltMP: string | undefined = body.saltMP;
    const kdfParams: KdfParams | undefined = body.kdfParams;
    const updatedAt: string | undefined = body.updatedAt;
    const bindingTag: string | undefined = body.bindingTag;
    const meta: DekWrapMeta | null =
      dekWrapped?.nonce && dekWrapped?.ct
        ? {
            nonce: dekWrapped.nonce,
            ct: dekWrapped.ct,
            saltMP,
            kdfParams,
            updatedAt,
            bindingTag,
          }
        : null;
    // TODO(ETag): If resp.status === 304, return ok:true with wrapGeneration/meta as null,
    // and let caller keep existing local cache.
    return { ok: true, wrapGeneration, meta };
  } catch {
    return { ok: false, wrapGeneration: null, meta: null };
  }
}

// Convenience: fetch from server and persist locally if data is present
export async function updateLocalWrapInfoFromServer(): Promise<{
  ok: boolean;
  wrapGeneration: number | null;
}> {
  const res = await fetchRemoteWrapInfo();
  if (!res.ok) return { ok: false, wrapGeneration: null };
  if (res.wrapGeneration !== null) {
    await setLocalWrapVersion(res.wrapGeneration);
  }
  if (res.meta) await setLocalWrapMeta(res.meta);
  return { ok: true, wrapGeneration: res.wrapGeneration };
}
