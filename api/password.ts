import { apiClient, ApiResult } from "./core";
import { Password, NewPassword } from "../utils/types/passwordTypes";

/**
 * Creates a new password entry
 * @param passwordData - Complete password data object
 * @returns Object containing the created password data or error information
 */
export async function createPassword(passwordData: any): Promise<ApiResult<NewPassword>> {
  return apiClient.post("/password", {
    ciphertext: passwordData.ciphertext,
    metadataPublic: passwordData.metadataPublic,
    IKWrappedByDEK: passwordData.IKWrappedByDEK,
    itemId: passwordData.itemId,
    version: passwordData.version,
  });
}

/**
 * Retrieves all password entries for the authenticated user
 * @returns Array of password entries or error information
 */
export async function getAllPassword(): Promise<ApiResult<Password[]>> {
  return apiClient.get("/password/all");
}

/**
 * Retrieves a specific password entry by ID
 * @param id - ID of the password entry to retrieve
 * @returns Password entry data or error information
 */
export async function _getPassword(id: number | string): Promise<ApiResult<Password>> {
  return apiClient.get("/password", {
    params: { id },
  });
}

/**
 * Deletes a password entry by ID
 * @param id - ID of the password entry to delete
 * @returns Server response indicating success or failure
 */
export async function _removePassword(id: number | string): Promise<ApiResult> {
  return apiClient.delete("/password", {
    data: { id },
  });
}

/**
 * Updates a password entry by ID
 * @param id - ID of the password entry to update
 * @param passwordDetail - Object containing the fields to update
 * @returns Server response indicating success or failure
 */
export async function _updatePassword(
  id: number | string,
  passwordDetail: any,
): Promise<ApiResult<NewPassword>> {
  return apiClient.put("/password", {
    id: id,
    passwordDetail: passwordDetail,
  });
}
