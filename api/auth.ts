import { apiClient, ApiResult } from "./core";

/**
 * Requests a password reset email.
 * Always returns 200 from server to avoid leaking account existence.
 */
export async function forgotPassword(email: string): Promise<ApiResult> {
  return apiClient.post("/auth/forgot-password", { email });
}

/**
 * Social login with Google ID Token
 * @param idToken - Google ID token obtained from expo-auth-session
 * @returns Object containing tokens and security object or error info
 */
export async function socialGoogleLogin(idToken: string): Promise<ApiResult> {
  return apiClient.post("/auth/social/google", { idToken });
}

/**
 * Social login with Apple identity token
 * @param identityToken - Apple identity token obtained from expo-apple-authentication
 * @param rawNonce - Optional raw nonce used for hashing and verification
 * @returns Object containing tokens and security object or error info
 */
export async function socialAppleLogin(
  identityToken: string,
  rawNonce?: string,
): Promise<ApiResult> {
  return apiClient.post("/auth/social/apple", { identityToken, rawNonce });
}
