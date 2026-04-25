import apiClient, {
  setTokens,
  setUnauthorizedHandler,
  setOnTokenRefresh,
  setUnauthorizedFlag,
} from "./apiClient";
import { ApiResult, ApiError, ApiSuccess, ApiResponseEnvelope, ApiErrorUtils } from "./types";

export {
  apiClient,
  setTokens,
  setUnauthorizedHandler,
  setOnTokenRefresh,
  setUnauthorizedFlag,
  ApiErrorUtils,
};
export type { ApiResult, ApiError, ApiSuccess, ApiResponseEnvelope };

import { CONFIG } from "../utils/config";

export const url = CONFIG.apiURL;

/**
 * Sets the stored refresh token for use in the apiClient
 * @param refreshToken - The refresh token to store
 */
export function setStoredRefreshToken(refreshToken: string | null) {
  setTokens(undefined, refreshToken);
}

/**
 * Sets the stored access token for use in the apiClient
 * @param accessToken - The access token to store
 */
export function setStoredAccessToken(accessToken: string | null) {
  setTokens(accessToken, undefined);
}

/**
 * Registers a handler that will be called when the API detects a 401 Unauthorized
 * due to an invalid/expired refresh token. AuthContext should register its logout here.
 */
export function setOnUnauthorized(handler: (() => void) | null) {
  setUnauthorizedHandler(handler);
}

/**
 * Refreshes the access token using a refresh token.
 * Can be used manually, but apiClient handles this automatically for 401s.
 * @param refreshToken - The refresh token to use for obtaining a new access token
 * @returns Object containing the new tokens or error information
 */
export async function refreshToken(
  refreshToken: string,
): Promise<ApiResult<{ accessToken: string }>> {
  return apiClient.post("/auth/refresh-token", { refreshToken });
}
