import { apiClient, ApiResult } from "./core";

/**
 * Gets crypto parameters
 */
export async function apiGetCryptoParams(): Promise<
  ApiResult<{ kdfVersion: number; kdfParams: any }>
> {
  return apiClient.get("/crypto/params");
}
