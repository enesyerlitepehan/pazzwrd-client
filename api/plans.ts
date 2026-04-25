import { apiClient, ApiResult } from "./core";

/**
 * Lists available premium plans
 */
export async function apiGetPlans(): Promise<ApiResult> {
  return apiClient.get("/plans");
}
