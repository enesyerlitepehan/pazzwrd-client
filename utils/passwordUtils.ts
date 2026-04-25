import {
  createPassword,
  getAllPassword,
  _getPassword,
  _removePassword,
  _updatePassword,
  ApiResult,
} from "../api/api";

import {
  EncryptedPasswordPayload,
  NewPassword,
  NewPasswordBackendResponse,
  NewPasswordQueue,
  newPasswordRequestPayload,
  PasswordResponse,
} from "./types/passwordTypes";
import { AsyncStorage } from "./userScopedStorage";

/**
 * Generate a unique ID for new password entries
 * @returns A unique string ID with format PREFIX_RANDOM_TIMESTAMP
 */
export function createId(): string {
  const PREFIX = "LOCAL"; // Password prefix
  const randomNumber = Math.floor(Math.random() * 1_000_000);
  const timestamp = Date.now();
  return `${PREFIX}_${randomNumber}_${timestamp}`;
}

// Save cloud passwords (latest synced from server) to AsyncStorage for offline use
function normalizePasswordShape(
  p:
    | NewPasswordBackendResponse
    | NewPassword
    | NewPasswordQueue
    | newPasswordRequestPayload
    | Record<string, any>
    | undefined,
): NewPassword {
  if (!p) {
    return {
      id: createId(),
      sync: true,
    } as NewPassword;
  }

  // Already normalized (camelCase)
  if ((p as any).itemId || (p as any).metadataPublic || (p as any).IKWrappedByDEK) {
    const normalized = { ...(p as any) } as NewPassword;
    normalized.metadataPublic = normalized.metadataPublic || {};

    // Backfill root timestamps from metadataPublic if missing
    if (!normalized.createdAt) {
      normalized.createdAt = normalized.metadataPublic.createdAt;
    }
    if (!normalized.updatedAt) {
      normalized.updatedAt = normalized.metadataPublic.updatedAt;
    }

    return normalized;
  }

  const metadataPublic = {
    ...((p as any).metadata_public || {}),
  } as Record<string, any>;

  if (!metadataPublic.createdAt) {
    metadataPublic.createdAt = (p as any).created_at ?? (p as any).createdAt;
  }
  metadataPublic.updatedAt =
    metadataPublic.updatedAt || (p as any).updated_at || (p as any).updatedAt;

  const normalized: NewPassword = {
    id: (p as any).id ?? (p as any).item_id ?? createId(),
    itemId: (p as any).item_id ?? undefined,
    version: (p as any).version ?? undefined,
    ciphertext: (p as any).ciphertext,
    IKWrappedByDEK: (p as any).IK_wrapped_by_DEK,
    metadataPublic,
    sync: typeof (p as any).sync === "boolean" ? (p as any).sync : true,
    createdAt: (p as any).createdAt ?? (p as any).created_at,
    updatedAt: (p as any).updatedAt ?? (p as any).updated_at,
    deletedAt: (p as any).deletedAt ?? (p as any).deleted_at,
  } as NewPassword;

  return normalized;
}

export async function saveCloudPasswords(
  passwords: (
    | NewPasswordBackendResponse
    | NewPassword
    | NewPasswordQueue
    | newPasswordRequestPayload
  )[],
) {
  try {
    // Normalize any server/client shapes to internal NewPassword for consistent caching
    const normalized: NewPassword[] = (passwords || []).map((p: any) => normalizePasswordShape(p));

    const payload = {
      passwords: normalized,
      lastUpdated: new Date().toISOString(),
    };
    await AsyncStorage.setItem("cloudPasswords", JSON.stringify(payload));
  } catch (error) {
    console.error("Error saving cloud passwords to AsyncStorage:", error);
  }
}

export async function getCloudPasswordsCache(): Promise<NewPassword[]> {
  try {
    const raw = await AsyncStorage.getItem("cloudPasswords");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.passwords) ? parsed.passwords : [];
  } catch {
    return [];
  }
}

// ---- Password helpers (extracted for readability) ----
export function buildPasswordItemFromAdd(
  add: newPasswordRequestPayload,
  id: string | number,
  sync: boolean,
  pending: boolean = false,
): NewPassword {
  const base: any = {
    id,
    itemId: (add as any).itemId,
    version: (add as any).version,
    ciphertext: (add as any).ciphertext,
    IKWrappedByDEK: (add as any).IKWrappedByDEK,
    metadataPublic: (add as any).metadataPublic,
    sync,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(pending ? { pendingSync: true, pendingOp: "create" as const } : {}),
  };
  // If plaintext fields are provided (no DEK scenario), persist them for local-only use
  if (!(add as any).ciphertext && !(add as any).IKWrappedByDEK) {
    base.name = (add as any).name;
    base.userName = (add as any).userName;
    base.password = (add as any).password;
    base.url = (add as any).url;
    base.description = (add as any).description;
    base.additionalFields = (add as any).additionalFields;
    base.expireDate = (add as any).expireDate;
    base.tags = (add as any).tags;
    base.sorting = (add as any).sorting;
    base.sortingPin = (add as any).sortingPin;
  }
  return base as NewPassword;
}

function mergeEncryptedPassword(
  existing: NewPassword,
  payload: EncryptedPasswordPayload,
): NewPassword {
  const metadataPublic = {
    ...(existing.metadataPublic || {}),
    ...(payload.metadataPublic || {}),
  } as Record<string, any>;

  if (!metadataPublic.createdAt) {
    metadataPublic.createdAt = existing.metadataPublic?.createdAt;
  }

  metadataPublic.updatedAt =
    payload.metadataPublic?.updatedAt || metadataPublic.updatedAt || new Date().toISOString();

  if (metadataPublic.sorting === undefined) {
    metadataPublic.sorting = existing.metadataPublic?.sorting;
  }

  if (metadataPublic.sortingPin === undefined) {
    metadataPublic.sortingPin = existing.metadataPublic?.sortingPin;
  }

  return {
    ...existing,
    itemId: payload.itemId ?? existing.itemId,
    version: payload.version ?? existing.version,
    ciphertext: payload.ciphertext ?? existing.ciphertext,
    IKWrappedByDEK: payload.IKWrappedByDEK ?? existing.IKWrappedByDEK,
    metadataPublic: metadataPublic as any,
    updatedAt: metadataPublic.updatedAt,
  } as NewPassword;
}

export async function upsertIntoCloudCache(item: NewPasswordQueue) {
  const cache = await getCloudPasswordsCache();
  const idx = cache.findIndex((p) => p.id === item.id);
  if (idx >= 0) cache[idx] = item;
  else cache.push(item);
  await saveCloudPasswords(cache);
}

// Pending operations queue types (local to utility)
interface PendingPasswordOp {
  op: "create" | "update" | "delete";
  id?: number; // server id for updates
  tempId?: string; // temporary id for offline-created items
  data?: any; // payload for create/update; not required for delete
  timestamp: string;
}

export async function enqueueCreatePasswordOp(data: any, tempId: string) {
  try {
    const raw = await AsyncStorage.getItem("pendingPasswordOps");
    const ops: PendingPasswordOp[] = raw ? JSON.parse(raw) : [];
    ops.push({
      op: "create",
      tempId: String(tempId),
      data,
      timestamp: new Date().toISOString(),
    });
    await AsyncStorage.setItem("pendingPasswordOps", JSON.stringify(ops));
  } catch (e) {
    // swallow errors to avoid blocking UI
  }
}

export async function handleAddPasswordCloudOffline(payload: newPasswordRequestPayload) {
  const tempId = (payload && payload.itemId) || createId();
  const now = new Date().toISOString();
  const localItem: NewPasswordQueue = {
    id: tempId,
    sync: true,
    createdAt: now,
    updatedAt: now,
    pendingSync: true,
    pendingOp: "create",
    // Crypto metadata only; no plaintext fields stored
    itemId: payload?.itemId,
    version: payload?.version,
    ciphertext: payload?.ciphertext,
    IKWrappedByDEK: payload?.IKWrappedByDEK,
    metadataPublic: payload?.metadataPublic,
  };
  await upsertIntoCloudCache(localItem);
  await enqueueCreatePasswordOp(payload, String(tempId));
  return {
    ok: true,
    success: true,
    status: 201,
    data: localItem,
    message: "Password created offline (queued)",
    code: "CREATED_OFFLINE",
    meta: null,
  };
}

export async function syncCloudPasswordsFromBackend() {
  try {
    const resp = await getAllPassword();
    if (resp && resp.ok && Array.isArray(resp.data)) {
      await saveCloudPasswords(resp.data);
    }
  } catch (e) {
    console.error("Error syncing cloud passwords7:", e);
  }
}

export async function handleAddPasswordCloudOnline(payload: any) {
  try {
    const result = await createPassword(payload);
    if (result && (result.status === 200 || result.status === 201)) {
      await syncCloudPasswordsFromBackend();
      return result;
    }
    // If quota exceeded or cloud-not-ready, do NOT fallback to offline (it will just fail again or is expected)
    if (
      result &&
      (result.code === "QUOTA_EXCEEDED" ||
        result.code === "FEATURE_DISABLED" ||
        result.code === "EMAIL_NOT_VERIFIED" ||
        result.code === "MP_NOT_CONFIGURED")
    ) {
      return result;
    }
  } catch (e) {
    // ignore; fallback to offline queue
  }
  return handleAddPasswordCloudOffline(payload);
}

export async function handleAddPasswordLocal(newPassword: newPasswordRequestPayload): Promise<{
  updatedPasswords: NewPassword[];
  passwordToSave: NewPassword;
  response: ApiResult<NewPassword>;
}> {
  // Get existing local passwords
  const storedLocalPasswords = await AsyncStorage.getItem("localPasswords");
  let existingPasswords: NewPassword[] = [];

  if (storedLocalPasswords) {
    try {
      const parsed = JSON.parse(storedLocalPasswords);
      const arr = Array.isArray(parsed.passwords) ? parsed.passwords : [];
      existingPasswords = arr as NewPassword[];
    } catch {
      existingPasswords = [];
    }
  }

  // Generate a local ID for the password if it doesn't have one
  const localId = newPassword.id || createId();

  // Create a Password object from the encrypted payload
  const passwordToSave: NewPassword = buildPasswordItemFromAdd(newPassword, localId, false, false);

  // Add the new password to the existing passwords
  const updatedPasswords = [...existingPasswords, passwordToSave];

  // Save to AsyncStorage
  try {
    await AsyncStorage.setItem(
      "localPasswords",
      JSON.stringify({
        passwords: updatedPasswords,
        lastUpdated: new Date().toISOString(),
      }),
    );
  } catch (e) {
    console.error("Error saving local passwords to AsyncStorage:", e);
  }

  const response: ApiResult<NewPassword> = {
    ok: true,
    success: true,
    status: 201,
    data: passwordToSave,
    message: "Password created successfully in local storage",
    code: "CREATED",
    meta: null,
  };

  return { updatedPasswords, passwordToSave, response };
}

// ----------------- Remove password utilities -----------------

// Shared helper to move a password into trash store (unless skipTrash)
export async function addPasswordToTrash(password: NewPassword, skipTrash: boolean): Promise<void> {
  if (skipTrash) return;
  try {
    const TRASH_LIMIT = 5;
    const storedTrashPasswords = await AsyncStorage.getItem("trashPasswords");
    let trashPasswords: NewPassword[] = [];
    if (storedTrashPasswords) {
      const trashPasswordData = JSON.parse(storedTrashPasswords);
      trashPasswords = Array.isArray(trashPasswordData.passwords)
        ? trashPasswordData.passwords
        : [];
    }
    const passwordWithDeletedAt: NewPassword = {
      ...password,
      deletedAt: password.deletedAt ?? new Date().toISOString(),
    };
    trashPasswords.push(passwordWithDeletedAt);

    // Enforce trash limit by removing the oldest item when exceeding the cap
    if (trashPasswords.length > TRASH_LIMIT) {
      trashPasswords.sort((a: any, b: any) => {
        const ta = new Date(a.deletedAt || a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.deletedAt || b.updatedAt || b.createdAt || 0).getTime();
        return ta - tb; // oldest first
      });
      // Remove oldest extras beyond TRASH_LIMIT
      while (trashPasswords.length > TRASH_LIMIT) {
        trashPasswords.shift();
      }
    }
    await AsyncStorage.setItem(
      "trashPasswords",
      JSON.stringify({
        passwords: trashPasswords,
        lastUpdated: new Date().toISOString(),
      }),
    );
  } catch (e) {
    console.error("Error adding password to trash:", e);
  }
}

export async function removePasswordFromTrash(id: number | string): Promise<PasswordResponse> {
  try {
    const storedTrashPasswords = await AsyncStorage.getItem("trashPasswords");
    if (storedTrashPasswords) {
      const trashPasswordData = JSON.parse(storedTrashPasswords);
      const filtered = (trashPasswordData.passwords || []).filter((p: NewPassword) => p.id !== id);
      await AsyncStorage.setItem(
        "trashPasswords",
        JSON.stringify({
          passwords: filtered,
          lastUpdated: new Date().toISOString(),
        }),
      );
      return {
        ok: true,
        success: true,
        status: 200,
        data: filtered,
        message: "Password removed from trash",
        code: "OK",
        meta: null,
      };
    } else {
      return {
        ok: true,
        success: true,
        status: 200,
        data: [],
        message: "No passwords in trash",
        code: "OK",
        meta: null,
      };
    }
  } catch (error) {
    return {
      ok: false,
      success: false,
      status: 500,
      data: null,
      message: "Remove from trash failed",
      code: "ERROR",
      isNetworkError: false,
    };
  }
}

export async function handleRemovePasswordLocal(
  id: number | string,
  skipTrash: boolean,
): Promise<{ updatedPasswords: NewPassword[]; response: PasswordResponse }> {
  try {
    const storedLocalPasswords = await AsyncStorage.getItem("localPasswords");

    if (storedLocalPasswords) {
      const localPasswordData = JSON.parse(storedLocalPasswords);
      const passwords: NewPassword[] = Array.isArray(localPasswordData.passwords)
        ? localPasswordData.passwords
        : [];

      const passwordToTrash = passwords.find((p) => p.id === id);
      if (passwordToTrash) {
        await addPasswordToTrash(passwordToTrash, skipTrash);

        const updatedPasswords = passwords.filter((p) => p.id !== id);

        // Persist updated locals
        try {
          await AsyncStorage.setItem(
            "localPasswords",
            JSON.stringify({
              passwords: updatedPasswords,
              lastUpdated: new Date().toISOString(),
            }),
          );
        } catch (e) {
          console.error("Error saving local passwords to AsyncStorage:", e);
        }

        return {
          updatedPasswords,
          response: {
            ok: true,
            success: true,
            status: 200,
            data: [],
            message: "Password removed locally",
            code: "OK",
            meta: null,
          },
        };
      }
    }
  } catch (error) {}
  return {
    updatedPasswords: [],
    response: {
      ok: true,
      success: true,
      status: 200,
      data: [],
      message: "Password not found locally",
      code: "OK",
      meta: null,
    },
  };
}

export async function enqueueDeletePasswordOp(id: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem("pendingPasswordOps");
    const ops: PendingPasswordOp[] = raw ? JSON.parse(raw) : [];
    ops.push({ op: "delete", id, timestamp: new Date().toISOString() });
    await AsyncStorage.setItem("pendingPasswordOps", JSON.stringify(ops));
  } catch {}
}

export async function handleRemovePasswordCloudOffline(
  id: number | string,
  skipTrash: boolean,
): Promise<PasswordResponse> {
  try {
    const cache = await getCloudPasswordsCache();
    const passwordToTrash = cache.find((p) => p.id === id);
    if (passwordToTrash) {
      await addPasswordToTrash(passwordToTrash, skipTrash);
      const filtered = cache.filter((p) => p.id !== id);
      await saveCloudPasswords(filtered);
      if (typeof id === "number") {
        await enqueueDeletePasswordOp(id as number);
      }
      return {
        ok: true,
        success: true,
        status: 200,
        data: [],
        message: "Password delete queued offline",
        code: "OK",
        meta: null,
      };
    }
  } catch (e) {
    // ignore
  }
  return {
    ok: true,
    success: true,
    status: 200,
    data: [],
    message: "Password not found in cache",
    code: "OK",
    meta: null,
  };
}

export async function handleRemovePasswordCloudOnline(
  id: number | string,
  skipTrash: boolean,
): Promise<PasswordResponse> {
  try {
    const parsedId =
      typeof id === "number" ? id : Number.isFinite(Number(id)) ? Number(id) : (id as any);
    const passwordResponse = await _getPassword(parsedId as number);
    let passwordToTrash: NewPassword | null = null;
    if (passwordResponse && passwordResponse.ok) {
      const raw = passwordResponse.data;
      passwordToTrash = raw ? normalizePasswordShape(raw) : null;
    }

    if (passwordToTrash) {
      await addPasswordToTrash(passwordToTrash, skipTrash);
    }

    const deleteResponse = await _removePassword(parsedId as number);
    if (deleteResponse && deleteResponse.ok) {
      await syncCloudPasswordsFromBackend();
      return { ...deleteResponse, data: [] } as PasswordResponse;
    }

    return deleteResponse as any as PasswordResponse;
  } catch (error) {
    // Fallback to offline queue/cache approach
    return handleRemovePasswordCloudOffline(id, skipTrash);
  }
}

// ----------------- Update password utilities -----------------
async function loadPendingPasswordOpsLocal(): Promise<PendingPasswordOp[]> {
  try {
    const raw = await AsyncStorage.getItem("pendingPasswordOps");
    return raw ? (JSON.parse(raw) as PendingPasswordOp[]) : [];
  } catch {
    return [];
  }
}

async function savePendingPasswordOpsLocal(ops: PendingPasswordOp[]): Promise<void> {
  try {
    await AsyncStorage.setItem("pendingPasswordOps", JSON.stringify(ops));
  } catch {}
}

async function mergeUpdateIntoCreateOp(tempId: string, updatePayload: any): Promise<void> {
  const ops = await loadPendingPasswordOpsLocal();
  const idxOp = ops.findIndex((o) => o.op === "create" && o.tempId === tempId);
  if (idxOp >= 0) {
    const current = ops[idxOp].data || {};
    ops[idxOp].data = {
      ...current,
      ...updatePayload,
      metadataPublic: {
        ...(current.metadataPublic || {}),
        ...(updatePayload.metadataPublic || {}),
      },
    };
    await savePendingPasswordOpsLocal(ops);
  }
}

async function enqueueUpdatePasswordOp(id: number, data: any): Promise<void> {
  const ops = await loadPendingPasswordOpsLocal();
  ops.push({ op: "update", id, data, timestamp: new Date().toISOString() });
  await savePendingPasswordOpsLocal(ops);
}

export async function handleUpdatePasswordCloudOffline(
  id: number | string,
  passwordDetail: EncryptedPasswordPayload,
) {
  // Update cached item
  const cache = await getCloudPasswordsCache();
  const idx = cache.findIndex((p) => p.id === id);
  if (idx >= 0) {
    const updated = mergeEncryptedPassword(cache[idx], passwordDetail);
    cache[idx] = {
      ...updated,
      pendingSync: true,
      pendingOp: "update",
    } as NewPassword;
    await saveCloudPasswords(cache);
  }
  if (typeof id === "string") {
    await mergeUpdateIntoCreateOp(String(id), passwordDetail);
  } else {
    await enqueueUpdatePasswordOp(id as number, passwordDetail);
  }
  return {
    ok: true,
    success: true,
    status: 200,
    data: null,
    message: "Password update queued offline",
    code: "OK",
    meta: null,
  };
}

export async function handleUpdatePasswordCloudOnline(
  id: number,
  passwordDetail: EncryptedPasswordPayload,
) {
  try {
    const response = await _updatePassword(id as number, {
      ciphertext: passwordDetail.ciphertext!,
      metadataPublic: passwordDetail.metadataPublic || {},
      IKWrappedByDEK: passwordDetail.IKWrappedByDEK!,
      itemId: passwordDetail.itemId!,
      version: passwordDetail.version!,
    });
    if (response && response.ok) {
      await syncCloudPasswordsFromBackend();
      return response;
    }
  } catch (e) {
    // fallthrough to offline handling
  }
  // Fallback when online update fails
  return handleUpdatePasswordCloudOffline(id, passwordDetail);
}

export async function handleUpdatePasswordLocal(
  id: number | string,
  passwordDetail: EncryptedPasswordPayload,
): Promise<{
  updatedPasswords: NewPassword[];
  response: ApiResult<NewPassword>;
}> {
  try {
    const storedLocalPasswords = await AsyncStorage.getItem("localPasswords");
    if (storedLocalPasswords) {
      const localPasswordData = JSON.parse(storedLocalPasswords);
      const passwords: NewPasswordQueue[] = Array.isArray(localPasswordData.passwords)
        ? localPasswordData.passwords
        : [];

      const updatedPasswords = passwords.map((password) => {
        if (password.id === id) {
          const merged = mergeEncryptedPassword(password, passwordDetail);
          return {
            ...merged,
            pendingSync: password.pendingSync,
            pendingOp: password.pendingOp,
          } as NewPassword;
        }
        return password;
      });

      await AsyncStorage.setItem(
        "localPasswords",
        JSON.stringify({
          passwords: updatedPasswords,
          lastUpdated: new Date().toISOString(),
        }),
      );

      const updatedPassword = updatedPasswords.find((p) => p.id === id);
      return {
        updatedPasswords,
        response: {
          ok: true,
          success: true,
          status: 200,
          data: updatedPassword || null,
          message: "Password updated successfully in local storage",
          code: "OK",
          meta: null,
        },
      };
    }
    return {
      updatedPasswords: [],
      response: {
        ok: false,
        success: false,
        status: 404,
        data: null,
        message: "No local passwords found",
        code: "NOT_FOUND",
        isNetworkError: false,
      },
    };
  } catch (e) {
    return {
      updatedPasswords: [],
      response: {
        ok: false,
        success: false,
        status: 500,
        data: null,
        message: "Password update failed",
        code: "ERROR",
        isNetworkError: false,
      },
    };
  }
}
