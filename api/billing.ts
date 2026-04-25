import { apiClient, ApiResult } from "./core";

/**
 * Gets user entitlements
 */
export async function apiGetEntitlements(): Promise<ApiResult> {
  return apiClient.get("/user/entitlements");
}

/**
 * Triggers server-side sync from RevenueCat
 */
export async function apiSyncRevenueCat(): Promise<ApiResult> {
  return apiClient.post("/billing/revenuecat/sync");
}
