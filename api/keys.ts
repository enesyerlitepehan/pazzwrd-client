import { apiClient, ApiResult } from "./core";
import { GetPublicKeyByEmailData, GetBackupData } from "../type/apiType";

// --- Keys: Bootstrap ---
/**
 * Shape of the data returned by bootstrap-init
 */
export interface BootstrapInitData {
  saltMP: string;
  kdfParams: {
    iterations: number;
    dkLen: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Initializes the bootstrap process
 */
export async function apiBootstrapInit(): Promise<ApiResult<BootstrapInitData>> {
  return apiClient.post("/keys/bootstrap-init");
}

/**
 * Completes the bootstrap process
 * @param body - Bootstrap data
 */
export async function apiBootstrap(body: any): Promise<ApiResult> {
  return apiClient.post("/keys/bootstrap", body);
}

// --- Keys: Wrapped DEK ---
/**
 * Shape of the data returned by wrapped-dek
 */
export interface WrappedDEKData {
  dekWrappedByMP: {
    nonce: string;
    ct: string;
  };
  saltMP: string;
  kdfParams: {
    iterations: number;
    dkLen: number;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Retrieves the wrapped DEK
 */
export async function apiGetWrappedDEK(): Promise<ApiResult<WrappedDEKData>> {
  return apiClient.get("/keys/wrapped-dek");
}

/**
 * Updates the wrapped DEK
 * @param body - Wrapped DEK data
 */
export async function apiUpdateWrappedDEK(body: {
  DEK_wrapped_by_MP: { nonce: string; ct: string };
  kdfVersion?: number;
  bindingTag?: string;
  prevGeneration?: number;
}): Promise<ApiResult> {
  return apiClient.put("/keys/wrapped-dek", body);
}

// --- Keys: Master Password status ---
/**
 * Retrieves the Master Password status
 */
export async function apiGetMpStatus(): Promise<
  ApiResult<{ mpStatus: "NONE" | "SKIPPED" | "SET" | "CONFIGURED" | null }>
> {
  return apiClient.get("/keys/mp-status");
}

// --- Keys: public key (POST/GET) ---
/**
 * Posts a public key
 * @param body - Public key data
 */
export async function apiPostPublicKey(body: {
  keyType?: "x25519" | "ed25519";
  keyVersion?: number;
  publicKey: string; // base64url
}): Promise<ApiResult> {
  return apiClient.post("/keys/public", body);
}

/**
 * Retrieves a public key by email
 * @param email - User email
 */
export async function apiGetPublicKeyByEmail(
  email: string,
): Promise<ApiResult<GetPublicKeyByEmailData>> {
  return apiClient.get("/keys/public", {
    params: { email },
  });
}

// --- Keys: backup (POST/GET) ---
/**
 * Posts a backup
 * @param body - Backup data
 */
export async function apiPostBackup(body: any): Promise<ApiResult> {
  return apiClient.post("/keys/backup", body);
}

/**
 * Retrieves a backup
 * @param params - Backup type and version
 */
export async function apiGetBackup(params: {
  backupType?: string;
  backupVersion?: number;
  keyType?: string;
}): Promise<ApiResult<GetBackupData>> {
  return apiClient.get("/keys/backup", {
    params,
  });
}
