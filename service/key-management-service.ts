import { HKDF } from "@stablelib/hkdf";
import { SHA256 } from "@stablelib/sha256";
import { generateKeyPairFromSeed, sharedKey } from "@stablelib/x25519";
import { XChaCha20Poly1305 } from "@stablelib/xchacha20poly1305";
import * as Random from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import RNAsyncStorage from "@react-native-async-storage/async-storage";
import { AsyncStorage, getUserPrefix } from "../utils/userScopedStorage";
import { toB64Url, fromB64Any, makeAAD, aeadSeal, aeadOpen } from "../utils/util";

const PRIVATE_KEY_STORAGE_KEY = "PrivateKey";
const PUBLIC_KEY_STORAGE_KEY = "PublicKey";

/** Generate an X25519 keypair on device. */
export async function generateX25519Keypair(): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  publicKey_b64url: string; // handy for POST /v1/keys/public
}> {
  // 32-byte seed for key generation
  const seed = Random.getRandomBytes(32);

  const { publicKey, secretKey } = generateKeyPairFromSeed(seed);

  // Zeroize seed ASAP
  seed.fill(0);

  return {
    publicKey,
    privateKey: secretKey,
    publicKey_b64url: toB64Url(publicKey),
  };
}

/** Derive the public key from an existing private key (seed). */
export function derivePublicKey(privateKey: Uint8Array): Uint8Array {
  const { publicKey } = generateKeyPairFromSeed(privateKey);
  return publicKey;
}

/** Store the private key securely on device (user-scoped). */
export async function setPrivateKey(privateKey: Uint8Array): Promise<void> {
  try {
    const prefix = await getUserPrefix();
    const key = prefix ? prefix + PRIVATE_KEY_STORAGE_KEY : PRIVATE_KEY_STORAGE_KEY;
    await SecureStore.setItemAsync(key, toB64Url(privateKey));
  } catch (e) {
    // swallow to avoid crashing callers; optionally log elsewhere
  }
}

/** Retrieve the private key from secure storage (user-scoped with migration). */
export async function getPrivateKey(): Promise<Uint8Array | null> {
  try {
    const prefix = await getUserPrefix();
    const scopedKey = prefix ? prefix + PRIVATE_KEY_STORAGE_KEY : null;

    let b64: string | null = null;
    if (scopedKey) {
      b64 = await SecureStore.getItemAsync(scopedKey);
    }

    // Migration: if scoped key is missing but legacy global key exists, migrate it.
    if (!b64) {
      const legacyB64 = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
      if (legacyB64) {
        if (scopedKey) {
          try {
            await SecureStore.setItemAsync(scopedKey, legacyB64);
            await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
          } catch {}
          b64 = legacyB64;
        } else {
          // Fallback to legacy key if no user is active (rare but possible)
          b64 = legacyB64;
        }
      }
    }

    if (!b64) return null;
    try {
      return fromB64Any(b64);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/** Store the public key in AsyncStorage (user-scoped via wrapper). */
export async function setPublicKey(publicKey: Uint8Array): Promise<void> {
  try {
    await AsyncStorage.setItem(PUBLIC_KEY_STORAGE_KEY, toB64Url(publicKey));
  } catch (e) {
    // swallow to avoid crashing callers; optionally log elsewhere
  }
}

/** Retrieve the public key from AsyncStorage (user-scoped with migration). */
export async function getPublicKey(): Promise<Uint8Array | null> {
  try {
    let b64 = await AsyncStorage.getItem(PUBLIC_KEY_STORAGE_KEY);

    // Migration: if scoped key is missing but legacy global key exists in raw AsyncStorage
    if (!b64) {
      const prefix = await getUserPrefix();
      if (prefix) {
        const legacyB64 = await RNAsyncStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
        if (legacyB64) {
          try {
            await AsyncStorage.setItem(PUBLIC_KEY_STORAGE_KEY, legacyB64);
            await RNAsyncStorage.removeItem(PUBLIC_KEY_STORAGE_KEY);
          } catch {}
          b64 = legacyB64;
        }
      }
    }

    if (!b64) return null;
    try {
      return fromB64Any(b64);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

type WrappedBlob = {
  nonce: string;
  ct: string;
  keyType: "x25519" | "ed25519";
  keyVersion: number;
};

/**
 * Wrap (encrypt) X25519 private key with DEK using XChaCha20-Poly1305.
 * Returns base64url nonce + ct ready to POST /v1/keys/backup.
 */
export async function wrapPrivateKeyWithDEK(
  dek: Uint8Array, // 32B
  x25519Priv: Uint8Array, // 32B secretKey
  opts?: { keyType?: "x25519" | "ed25519"; keyVersion?: number },
): Promise<WrappedBlob> {
  const keyType = opts?.keyType ?? "x25519";
  const keyVersion = opts?.keyVersion ?? 1;

  // Bind ciphertext to what it is: a user-key backup blob
  const aad = makeAAD({
    scope: "user-key-backup",
    kty: keyType,
    ver: keyVersion,
  });

  const { nonce, ct } = await aeadSeal(dek, x25519Priv, aad);
  // Zeroize sensitive buffer after use (optional if you keep it)
  // x25519Priv.fill(0); // only if you won't reuse

  return {
    nonce: toB64Url(nonce),
    ct: toB64Url(ct),
    keyType: keyType,
    keyVersion: keyVersion,
  };
}

/**
 * Unwrap (decrypt) X25519 private key with DEK.
 * Throws on failure. Returns 32B Uint8Array secretKey.
 */
export function unwrapPrivateKeyWithDEK(
  dek: Uint8Array,
  wrapped: WrappedBlob,
  opts?: { keyType?: "x25519" | "ed25519"; keyVersion?: number },
): Uint8Array {
  const keyType = opts?.keyType ?? "x25519";
  const keyVersion = opts?.keyVersion ?? 1;

  const aad = makeAAD({
    scope: "user-key-backup",
    kty: keyType,
    ver: keyVersion,
  });

  const priv = aeadOpen(dek, wrapped.nonce, wrapped.ct, aad); // Uint8Array
  if (priv.length !== 32) throw new Error("Invalid private key length");
  return priv;
}

// base64url → Uint8Array
function fromB64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/**
 * Derives K_share (32B) for wrapping IK:
 * 1) ECDH: shared = X25519(eph_priv, recipient_pub)
 * 2) HKDF-SHA256(shared, salt, info="pm-share-ik-v1") → 32 bytes
 */
/**
 * Derive K_share (32 bytes) with X25519 + HKDF-SHA256
 */
const te = new TextEncoder();
/**
 * Derive K_share (32 bytes) with X25519 + HKDF-SHA256 (class style)
 */
/**
 * Derive K_share (32 bytes) with X25519 + HKDF-SHA256
 */
export function deriveKShareForRecipient(
  ephPriv: Uint8Array,
  recipientPub_b64url: string,
  salt?: Uint8Array,
): Uint8Array {
  const recipPub = fromB64Url(recipientPub_b64url); // 32B
  const shared = sharedKey(ephPriv, recipPub); // ECDH → 32B
  const info = te.encode("pm-share-ik-v1");

  // HKDF instance
  const hkdf = new HKDF(SHA256, shared, salt ?? new Uint8Array(0), info);

  // 👇 length veriyoruz, o bize Uint8Array döndürüyor
  const okm = hkdf.expand(32);

  shared.fill(0); // zeroize
  return okm; // 32B ready for AEAD
}

/** 4) IK’yi sar (AEAD: XChaCha20-Poly1305) */
export function wrapIKWithKShare(
  IK: Uint8Array, // 32B
  K_share: Uint8Array, // 32B
  aad?: Uint8Array,
): { nonce: string; ct: string } {
  const aead = new XChaCha20Poly1305(K_share);
  let nonce: Uint8Array;
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    nonce = globalThis.crypto.getRandomValues(new Uint8Array(24));
  } else {
    // fallback: Math.random
    nonce = new Uint8Array(24);
    for (let i = 0; i < nonce.length; i++) {
      nonce[i] = Math.floor(Math.random() * 256);
    }
  }
  const ct = aead.seal(nonce, IK, aad);
  return { nonce: toB64Url(nonce), ct: toB64Url(ct) };
}

/**
 * IK'yi alıcıya kilitlemek için tek noktadan helper.
 * Dönen wrappedIK server'a POST /v1/shares ile gönderilir.
 */
export async function produceWrappedIKForShare(args: {
  IK: Uint8Array; // 32B item key (DEK ile açılmış)
  recipientPublicKey_b64url: string;
  itemId: string; // AAD/salt bağlamı
}) {
  const { IK, recipientPublicKey_b64url, itemId } = args;

  // 1) Ephemeral X25519 keypair (tek kullanımlık; SecureStore'a yazma)
  const eph = await generateX25519Keypair(); // { publicKey, privateKey, publicKey_b64url }

  // 2) ECDH→HKDF ile K_share
  // Salt olarak deterministik ve basit: itemId (istersen sha256(itemId) de yapabilirsin)
  const salt = te.encode(itemId);
  const K_share = deriveKShareForRecipient(eph.privateKey, recipientPublicKey_b64url, salt);

  // 3) AAD: bu ciphertext'in hangi kayda ait olduğunu bağlayalım
  const aad = makeAAD({ itemId, mode: "user" });

  // 4) IK'yi AEAD ile sar (nonce, ct → Uint8Array döndüğünü varsayıyorum)
  const { nonce, ct } = await aeadSeal(K_share, IK, aad);

  // 5) Server'a gidecek payload (base64url)
  const wrappedIK = {
    nonce: toB64Url(nonce),
    ct: toB64Url(ct),
    sender_ephemeral_pub: eph.publicKey_b64url,
  };

  // 6) Hafıza temizliği
  const zeroize = () => {
    IK.fill(0);
    K_share.fill(0);
    eph.privateKey.fill(0);
  };

  return { wrappedIK, zeroize };
}
