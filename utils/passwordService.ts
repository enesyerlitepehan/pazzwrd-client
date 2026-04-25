import { getAllPassword, ApiResult } from "../api/api";

import { pickAvatarForName } from "./avatarService";
import { isOffline } from "./network";
import { computePasswordStrength } from "./passwordStrength";
import {
  saveCloudPasswords,
  handleAddPasswordCloudOffline,
  handleAddPasswordCloudOnline,
  handleAddPasswordLocal,
  handleRemovePasswordLocal,
  removePasswordFromTrash,
  handleRemovePasswordCloudOffline,
  handleRemovePasswordCloudOnline,
  handleUpdatePasswordCloudOffline,
  handleUpdatePasswordCloudOnline,
  handleUpdatePasswordLocal,
  syncCloudPasswordsFromBackend,
  createId,
} from "./passwordUtils";
import { syncPendingQueues as syncPendingQueuesService } from "./syncService";
import {
  EncryptedPasswordPayload,
  PasswordResponse,
  InputPassword,
  Password,
} from "./types/passwordTypes";
import { AsyncStorage } from "./userScopedStorage";
import {
  toB64Url,
  wrapIKWithDEK,
  encryptItemWithIK,
  generateIK,
  sortItemsNewestFirst,
} from "./util";

export async function fetchPasswords(
  source: "cloud" | "local" | "trash" | string = "local",
): Promise<PasswordResponse> {
  const emptySuccess = (data: any[] = []): PasswordResponse => ({
    ok: true,
    success: true,
    status: 200,
    data,
    message: "OK",
    code: "OK",
    meta: null,
  });

  switch (source) {
    case "cloud": {
      const offline = await isOffline();
      if (offline) {
        const cached = await AsyncStorage.getItem("cloudPasswords");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const items = Array.isArray(parsed.passwords) ? parsed.passwords : [];
            return emptySuccess(sortItemsNewestFirst(items));
          } catch {
            return emptySuccess([]);
          }
        }
        return emptySuccess([]);
      }
      // When online, push pending ops first, fetch latest, save normalized to cache,
      // then always serve from AsyncStorage (normalized shape)
      try {
        await syncPendingQueuesService();
      } catch {}
      try {
        const cloudResponse = await getAllPassword();
        if (cloudResponse && cloudResponse.ok && Array.isArray(cloudResponse.data)) {
          await saveCloudPasswords(cloudResponse.data);
        }
      } catch {}

      // Read back normalized cache and return to UI
      try {
        const cached = await AsyncStorage.getItem("cloudPasswords");
        if (cached) {
          const parsed = JSON.parse(cached);
          const items = Array.isArray(parsed.passwords) ? parsed.passwords : [];
          return emptySuccess(sortItemsNewestFirst(items));
        }
      } catch {}
      return emptySuccess([]);
    }
    case "local": {
      try {
        const raw = await AsyncStorage.getItem("localPasswords");
        if (raw) {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed.passwords) ? parsed.passwords : [];
          let changed = false;
          const updated = items.map((it: any) => {
            const meta = (it && it.metadataPublic) || {};
            const hasScore = typeof meta?.strength?.score === "number";
            // If local plaintext password exists and score missing, compute now
            const plain = (it && it.password) || null;
            if (!hasScore && typeof plain === "string") {
              const score = computePasswordStrength(plain).score;
              const newMeta = {
                ...meta,
                strength: { score },
              };
              changed = true;
              return { ...it, metadataPublic: newMeta };
            }
            return it;
          });
          if (changed) {
            try {
              await AsyncStorage.setItem(
                "localPasswords",
                JSON.stringify({
                  passwords: updated,
                  lastUpdated: parsed.lastUpdated || new Date().toISOString(),
                }),
              );
            } catch {}
            return emptySuccess(sortItemsNewestFirst(updated));
          }
          return emptySuccess(sortItemsNewestFirst(items));
        }
        return emptySuccess([]);
      } catch {
        return emptySuccess([]);
      }
    }
    case "trash": {
      try {
        const raw = await AsyncStorage.getItem("trashPasswords");
        if (raw) {
          const parsed = JSON.parse(raw);
          const items = Array.isArray(parsed.passwords) ? parsed.passwords : [];
          return emptySuccess(sortItemsNewestFirst(items));
        }
        return emptySuccess([]);
      } catch {
        return emptySuccess([]);
      }
    }
    default:
      return emptySuccess([]);
  }
}

export async function removePassword(
  id?: number | string,
  isLocal: boolean = false,
  fromTrash: boolean = false,
  skipTrash: boolean = false,
): Promise<PasswordResponse> {
  const emptySuccess = (data: any[] = []): PasswordResponse => ({
    ok: true,
    success: true,
    status: 200,
    data,
    message: "OK",
    code: "OK",
    meta: null,
  });

  if (id === undefined) {
    await AsyncStorage.removeItem("localPasswords");
    return emptySuccess([]);
  }
  if (fromTrash) return await removePasswordFromTrash(id);
  if (isLocal) {
    const { response } = await handleRemovePasswordLocal(id, skipTrash);
    return response;
  }
  if (await isOffline()) {
    return await handleRemovePasswordCloudOffline(id, skipTrash);
  }
  return await handleRemovePasswordCloudOnline(id, skipTrash);
}

export async function updatePassword(
  id: number | string,
  detail: EncryptedPasswordPayload,
): Promise<ApiResult<Password>> {
  const { sync: syncFlag, ...payload } = detail || {};
  const isCloud = syncFlag === true;
  if (isCloud) {
    if (await isOffline()) {
      return (await handleUpdatePasswordCloudOffline(
        id,
        payload as EncryptedPasswordPayload,
      )) as ApiResult<Password>;
    }
    return (await handleUpdatePasswordCloudOnline(
      id as number,
      payload as EncryptedPasswordPayload,
    )) as ApiResult<Password>;
  }
  const { response } = await handleUpdatePasswordLocal(id, payload as EncryptedPasswordPayload);
  return response as ApiResult<Password>;
}

export async function addNewPassword(
  password: InputPassword,
  getDEK: () => Promise<Uint8Array | null>,
  toCloud: boolean = false,
): Promise<ApiResult<Password>> {
  // Build encrypted payload for cloud sync (if DEK available)
  let payloadOverride: any;
  try {
    const local_DEK = await getDEK();
    if (local_DEK) {
      const local_IK = generateIK();
      const itemId = createId();
      const version = 1;
      const nowISO = new Date().toISOString();
      const score = computePasswordStrength(password.password || "").score;
      const avatar_id =
        password.avatar_id ||
        pickAvatarForName(password.name || "", {
          randomness: 0.35,
          topK: 8,
          minScore: 0.75,
        })?.id;
      const metadataPublic = {
        name: password.name,
        tags: password.tags || [],
        createdAt: nowISO,
        updatedAt: nowISO,
        sorting: password.sorting,
        sortingPin: password.sortingPin,
        strength: { score },
        avatar_id,
      };
      const privatePayload = {
        password: password.password,
        userName: password.userName,
        url: password.url,
        description: password.description,
        additionalFields: password.additionalFields,
        expireDate: password.expireDate,
      };
      const enc = await encryptItemWithIK(local_IK, privatePayload, {
        itemId,
        version,
      });
      const wrapped = await wrapIKWithDEK(local_IK, local_DEK);
      payloadOverride = {
        ciphertext: { nonce: toB64Url(enc.nonce), ct: toB64Url(enc.ct) },
        version,
        itemId,
        IKWrappedByDEK: {
          nonce: toB64Url(wrapped.nonce),
          ct: toB64Url(wrapped.ct),
        },
        metadataPublic,
      };
    } else {
      // No DEK yet: store plaintext locally (no automatic migration)
      const nowISO = new Date().toISOString();
      const score = computePasswordStrength(password.password || "").score;
      const avatar_id =
        password.avatar_id ||
        pickAvatarForName(password.name || "", {
          randomness: 0.35,
          topK: 8,
          minScore: 0.75,
        })?.id;
      payloadOverride = {
        metadataPublic: {
          name: password.name,
          tags: password.tags || [],
          createdAt: nowISO,
          updatedAt: nowISO,
          sorting: password.sorting,
          sortingPin: password.sortingPin,
          strength: { score },
          avatar_id,
        },
        // Carry plaintext fields for local-only storage
        name: password.name,
        userName: password.userName,
        password: password.password,
        url: password.url,
        description: password.description,
        additionalFields: password.additionalFields,
        expireDate: password.expireDate,
        tags: password.tags || [],
        sorting: password.sorting,
        sortingPin: password.sortingPin,
      } as any;
    }
  } catch {}

  // If DEK-derived payload is available and user chose cloud, attempt cloud path; otherwise force local
  if (toCloud && payloadOverride && payloadOverride.ciphertext && payloadOverride.IKWrappedByDEK) {
    if (await isOffline()) {
      return (await handleAddPasswordCloudOffline(payloadOverride)) as ApiResult<Password>;
    }
    return (await handleAddPasswordCloudOnline(payloadOverride)) as ApiResult<Password>;
  }
  // Fallback to local creation
  const { response } = await handleAddPasswordLocal(payloadOverride);
  return response as ApiResult<Password>;
}
