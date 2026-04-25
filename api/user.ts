import type { PostLoginResponse } from "../utils/types";
import { apiClient, ApiResult } from "./core";

/**
 * Logs out a user by invalidating their access token
 * @returns Server response data or error information
 */
export async function _userLogout(): Promise<ApiResult> {
  return apiClient.post("/user/logout");
}

/**
 * Authenticates a user with email and password
 * @param mail - User's email address
 * @param password - User's password
 * @returns Object containing authentication tokens and user data or error information
 */
export async function login(mail: string, password: string): Promise<ApiResult<PostLoginResponse>> {
  return apiClient.post("/user/login", { mail, password });
}

/**
 * Creates a new user account
 * @param mail - Email address for the new account
 * @param password - Password for the new account
 * @returns Server response with account creation status or error information
 */
export async function create(
  mail: string,
  password: string,
): Promise<ApiResult<PostLoginResponse>> {
  return apiClient.post("/user", { mail, password });
}

/**
 * User profile detail shape
 */
export interface UserProfile {
  id: string | number;
  mail: string;
  fullName: string | null;
  nickname: string | null;
  dateOfBirth: string | null;
  mpStatus: "NONE" | "SKIPPED" | "SET" | null;
  [key: string]: any;
}

/**
 * Fetches the currently authenticated user's profile
 * @returns Object containing user profile data or error information
 */
export async function getUser(): Promise<ApiResult<UserProfile>> {
  return apiClient.get("/user");
}

/**
 * Updates the currently authenticated user's profile
 * @param userDetail - Object containing the fields to update
 * @returns Server response with update status or error information
 */
export async function updateUser(userDetail: any): Promise<ApiResult> {
  return apiClient.put("/user", userDetail);
}

/**
 * Deletes the authenticated user account.
 * @param currentPassword - Current account password for confirmation
 */
export async function apiDeleteAccount(currentPassword: string): Promise<ApiResult> {
  return apiClient.delete("/user", { data: { currentPassword } });
}

/**
 * Requests the server to resend the account activation email
 */
export async function apiResendActivationEmail(): Promise<ApiResult> {
  return apiClient.post("/user/resend-activation");
}

/**
 * Updates the user's Master Password status to SKIPPED
 */
export async function apiUpdateMpStatusSkip(): Promise<ApiResult> {
  return apiClient.put("/user/mp-status", { mpStatus: "SKIPPED" });
}

/**
 * Updates the authenticated user's account password
 * @param body - { currentPassword, newPassword }
 */
export async function apiUpdateUserPassword(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<ApiResult> {
  return apiClient.put("/user/password", body);
}

/**
 * Invites friends to the app by sending their email addresses to the server.
 * @param emails - List of email addresses to invite
 */
export async function apiInviteFriends(emails: string[]): Promise<ApiResult> {
  return apiClient.post("/user/invite", { emails });
}
