import { Platform } from "react-native";
import { pbkdf2 } from "@noble/hashes/pbkdf2";
import { sha256 } from "@noble/hashes/sha2";
import { XChaCha20Poly1305 } from "@stablelib/xchacha20poly1305";
import * as Random from "expo-crypto";

import type { Password } from "./types/passwordTypes";

type QuickCryptoModule = {
  pbkdf2: (
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    keylen: number,
    digest: string,
    callback: (err: Error | null, derivedKey?: Uint8Array) => void,
  ) => void;
};

let quickCryptoModule: QuickCryptoModule | null | undefined;

async function deriveKEK_MPNative(
  mpBytes: Uint8Array,
  salt: Uint8Array,
  params: { iterations: number; dkLen: number },
): Promise<Uint8Array | null> {
  if (Platform.OS === "web") return null;

  try {
    if (quickCryptoModule === undefined) {
      quickCryptoModule = require("react-native-quick-crypto") as QuickCryptoModule;
    }
    if (!quickCryptoModule) return null;

    return await new Promise<Uint8Array>((resolve, reject) => {
      quickCryptoModule!.pbkdf2(
        mpBytes,
        salt,
        params.iterations,
        params.dkLen,
        "sha256",
        (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }
          if (!derivedKey) {
            reject(new Error("PBKDF2 returned no key"));
            return;
          }
          resolve(new Uint8Array(derivedKey));
        },
      );
    });
  } catch {
    quickCryptoModule = null;
    return null;
  }
}

/**
 * Derives a Key Encryption Key from a Master Password using PBKDF2-HMAC-SHA-256.
 * @param mp - Master Password in UTF-8 string
 * @param saltMP_b64 - User-specific salt (base64url)
 * @param params - KDF parameters { iterations, dkLen }
 * @returns Uint8Array - KEK_MP (length = dkLen)
 */
export async function deriveKEK_MP(
  mp: string,
  saltMP_b64: string,
  params: {
    iterations: number;
    dkLen: number;
  },
) {
  const mpBytes = new TextEncoder().encode(mp);
  const salt = fromB64Any(saltMP_b64);
  const nativeKey = await deriveKEK_MPNative(mpBytes, salt, params);
  if (nativeKey) return nativeKey;

  return pbkdf2(sha256, mpBytes, salt, {
    c: params.iterations,
    dkLen: params.dkLen,
  });
}

/**
 * Generates a 256-bit Data Encryption Key (DEK).
 * @returns Uint8Array - 32 random bytes
 */
export async function generateDEK(): Promise<Uint8Array> {
  return Random.getRandomBytes(32);
}

// utils/encoding.ts
import { Buffer } from "buffer";

/**
 * Decodes base64 or base64url into bytes (RN/Expo friendly).
 * Accepts URL-safe input, normalizes padding, and returns a Uint8Array.
 * @param b64 - base64 or base64url string (padding optional)
 * @returns Uint8Array
 */
export function fromB64Any(b64: string): Uint8Array {
  // RN’da Buffer global olmayabilir; polyfill et
  if (typeof (globalThis as any).Buffer === "undefined") {
    (globalThis as any).Buffer = Buffer;
  }
  // URL-safe -> normal base64
  let s = b64.replace(/-/g, "+").replace(/_/g, "/");
  // padding ekle
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad === 1) throw new Error("Invalid base64/base64url string");

  const buf = Buffer.from(s, "base64");
  return new Uint8Array(buf);
}

/**
 * Encodes bytes as URL-safe base64 without padding (RFC 4648 §5).
 * @param u8 - Input bytes
 * @returns base64url string
 */
export function toB64Url(u8: Uint8Array): string {
  if (typeof (globalThis as any).Buffer === "undefined") {
    (globalThis as any).Buffer = Buffer;
  }
  return Buffer.from(u8)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Deterministically encodes an object as Additional Authenticated Data (AAD).
 * Keys are sorted recursively to ensure a stable byte representation across platforms.
 * @param obj - Plain object (e.g., { itemId, version })
 * @returns Uint8Array - UTF-8 bytes of canonical JSON
 */
export function makeAAD(obj: Record<string, any>): Uint8Array {
  const encoder = new TextEncoder();
  const canonical = (v: any): any => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(canonical);
    const keys = Object.keys(v).sort();
    const out: any = {};
    for (const k of keys) out[k] = canonical(v[k]);
    return out;
  };
  const json = JSON.stringify(canonical(obj));
  return encoder.encode(json);
}

/**
 * Encrypts (seals) data with XChaCha20-Poly1305.
 * @param key - 32-byte AEAD key
 * @param plaintext - Bytes to encrypt
 * @param aad - Optional Additional Authenticated Data (not encrypted)
 * @returns Object containing raw nonce (Uint8Array, 24B) and ciphertext+tag (Uint8Array)
 */
export async function aeadSeal(key: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array) {
  const nonce = Random.getRandomBytes(24); // XChaCha20-Poly1305 nonce 24B
  const aead = new XChaCha20Poly1305(key);
  const ct = aead.seal(nonce, plaintext, aad);
  return { nonce, ct };
}

/**
 * Decrypts (opens) XChaCha20-Poly1305 ciphertext.
 * @param key - 32-byte AEAD key
 * @param nonce_b64url - Nonce as base64url string (24B)
 * @param ct_b64url - Ciphertext+tag as base64url string
 * @param aad - Optional AAD (must match what was used during seal)
 * @returns Plaintext bytes (Uint8Array)
 * @throws Error if authentication fails
 */
export function aeadOpen(
  key: Uint8Array,
  nonce_b64url: string,
  ct_b64url: string,
  aad?: Uint8Array,
) {
  const aead = new XChaCha20Poly1305(key);
  const nonce = fromB64Any(nonce_b64url);
  const ct = fromB64Any(ct_b64url);
  const pt = aead.open(nonce, ct, aad);
  if (!pt) throw new Error("AEAD open failed");
  return pt; // Uint8Array
}

/**
 * Wraps a DEK with KEK_MP using AEAD (for server storage).
 * Returns base64url-encoded fields suitable for JSON transport.
 * @param DEK - Data Encryption Key (32B)
 * @param KEK_MP - Key derived from Master Password
 * @returns { nonce: string, ct: string }
 */
export async function wrapDEKWithMP(DEK: Uint8Array, KEK_MP: Uint8Array) {
  const { nonce, ct } = await aeadSeal(KEK_MP, DEK);
  return {
    nonce: toB64Url(nonce),
    ct: toB64Url(ct),
  };
}

/**
 * Generates a new per-item key (IK) for encrypting a single item.
 * @returns Uint8Array - 32 random bytes
 */
export function generateIK(): Uint8Array {
  return Random.getRandomBytes(32); // 256-bit item key
}

/**
 * Encrypts a single item payload with its Item Key (IK).
 * Uses deterministic AAD derived from { itemId, version } for integrity binding.
 * @param IK - Item Key (32B)
 * @param itemJson - Plain object to encrypt (will be JSON-stringified)
 * @param aadObj - Object to canonicalize into AAD (e.g., { itemId, version })
 * @returns { nonce: Uint8Array, ct: Uint8Array }
 */
export async function encryptItemWithIK(
  IK: Uint8Array,
  itemJson: any,
  aadObj: { itemId: string; version: number },
) {
  const plaintext = new TextEncoder().encode(JSON.stringify(itemJson));
  const aad = makeAAD(aadObj);
  return aeadSeal(IK, plaintext, aad); // => { nonce, ct }
}

/**
 * Unwraps (decrypts) an IK using the device's DEK.
 * @param DEK - Data Encryption Key (32B)
 * @param IK_wrapped - Object containing base64url nonce & ciphertext
 * @returns Uint8Array - Raw IK (32B)
 */
export function openIKWithDEK(DEK: Uint8Array, IK_wrapped: { nonce: string; ct: string }) {
  return aeadOpen(DEK, IK_wrapped.nonce, IK_wrapped.ct); // => Uint8Array(32)
}

export interface EncryptedItem {
  itemId?: string;
  version?: number | string;
  ciphertext?: { nonce: string; ct: string; aad?: string };
  IKWrappedByDEK?: { nonce: string; ct: string };
  [key: string]: any;
}

/**
 * Helper to decrypt an encrypted password/item entry using the locally stored DEK.
 * @param item - Encrypted password/card entry containing ciphertext & wrapped IK
 * @param getDEKFn - Function that resolves the locally stored DEK
 * @returns Decrypted payload object or null when decrypt fails/unavailable
 */
export async function decryptEncryptedItem(
  item: EncryptedItem,
  getDEKFn: () => Promise<Uint8Array | null>,
): Promise<Record<string, any> | null> {
  if (!item?.ciphertext || !item?.IKWrappedByDEK) {
    return null;
  }

  try {
    const localDEK = await getDEKFn();
    if (!localDEK) {
      return null;
    }

    const itemKey = openIKWithDEK(localDEK, item.IKWrappedByDEK);
    const rawVersion =
      typeof item.version === "number"
        ? item.version
        : item.version !== undefined
          ? Number(item.version)
          : undefined;
    const version =
      typeof rawVersion === "number" && Number.isFinite(rawVersion) ? rawVersion : undefined;
    const aad = item.itemId && version !== undefined ? { itemId: item.itemId, version } : undefined;
    const decrypted = decryptItemWithIK(itemKey, item.ciphertext, aad);

    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt item", error);
    return null;
  }
}

/**
 * Decrypts an item ciphertext using its Item Key (IK).
 * AAD must match what was used during encryption; if provided, it's canonicalized similarly.
 * @param IK - Item Key (32B)
 * @param ciphertext - { nonce, ct, aad? } with base64url strings
 * @param aadObj - Optional object to canonicalize into AAD (e.g., { itemId, version })
 * @returns Decrypted object (parsed from JSON)
 */
export function decryptItemWithIK(
  IK: Uint8Array,
  ciphertext: { nonce: string; ct: string; aad?: string },
  aadObj?: { itemId: string; version: number },
) {
  const aad = aadObj ? makeAAD(aadObj) : undefined;
  const pt = aeadOpen(IK, ciphertext.nonce, ciphertext.ct, aad);
  return JSON.parse(new TextDecoder().decode(pt));
}

/**
 * Wraps an Item Key (IK) with the DEK for storage on the server.
 * @param IK - Item Key (32B)
 * @param DEK - Data Encryption Key (32B)
 * @returns { nonce: Uint8Array, ct: Uint8Array }
 */
export async function wrapIKWithDEK(IK: Uint8Array, DEK: Uint8Array) {
  return aeadSeal(DEK, IK); // => { nonce, ct }  (IK_wrapped_by_DEK)
}

export async function recoverDEKWithMP(opts: {
  mp: string; // kullanıcının girdiği Master Password
  apiGetWrappedDek: () => Promise<{
    saltMP: string;
    kdfParams: { iterations: number; dkLen: number };
    dekWrappedByMP: { nonce: string; ct: string };
  }>;
}) {
  const { mp, apiGetWrappedDek } = opts;

  // 1) Server'dan blobları al
  const { saltMP, kdfParams, dekWrappedByMP } = await apiGetWrappedDek();

  // 2) KEK_MP türet
  const KEK_MP = await deriveKEK_MP(mp, saltMP, {
    iterations: kdfParams.iterations,
    dkLen: kdfParams.dkLen,
  });

  try {
    // 3) Sargıyı aç → DEK (Uint8Array(32))
    const DEK = aeadOpen(KEK_MP, dekWrappedByMP.nonce, dekWrappedByMP.ct);

    try {
      // 4) DEK’i cihazda sakla (biometrik şartıyla)
      /*await SecureStore.setItemAsync("dek_raw", toB64Url(DEK), {
        keychainService: "vault_dek",
        requireAuthentication: true,
      });*/
    } finally {
      // 5) RAM temizliği
      DEK.fill(0);
    }
  } finally {
    KEK_MP.fill(0);
  }
}

/**
 * Extract a sortable timestamp from an item, prioritizing deletedAt, then updatedAt, then createdAt.
 * Also checks inside metadataPublic for normalized or legacy-cache items.
 */
function getEffectiveTimestamp(item: any): number {
  if (!item) return 0;
  const ts =
    item.deletedAt ||
    item.updatedAt ||
    item.createdAt ||
    item.metadataPublic?.updatedAt ||
    item.metadataPublic?.createdAt ||
    item.deleted_at ||
    item.updated_at ||
    item.created_at ||
    item.metadata_public?.updatedAt ||
    item.metadata_public?.createdAt ||
    0;
  try {
    const val = new Date(ts).getTime();
    return isNaN(val) ? 0 : val;
  } catch {
    return 0;
  }
}

/**
 * Sorts items from newest to oldest based on available timestamps.
 * Prefers deletedAt, then updatedAt, then createdAt.
 */
export function sortItemsNewestFirst<T>(items: T[]): T[] {
  if (!items || !Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const ta = getEffectiveTimestamp(a);
    const tb = getEffectiveTimestamp(b);
    return tb - ta; // newest first
  });
}
