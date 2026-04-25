import { apiClient, ApiResult } from "./core";

/**
 * Gets a specific card by ID
 * @param id - Card ID
 */
export async function getCard(id: number): Promise<ApiResult> {
  return apiClient.get("/card", {
    params: { id },
  });
}

/**
 * Gets all cards for the authenticated user
 */
export async function getAllCards(): Promise<ApiResult> {
  return apiClient.get("/card/all");
}

/**
 * Creates a new card
 * @param cardData - Card data object
 */
export async function createCard(cardData: any): Promise<ApiResult> {
  return apiClient.post("/card", {
    ciphertext: cardData.ciphertext,
    metadataPublic: cardData.metadataPublic,
    IKWrappedByDEK: cardData.IKWrappedByDEK,
    itemId: cardData.itemId,
    version: cardData.version,
  });
}

/**
 * Updates an existing card
 * @param id - Card ID
 * @param cardDetail - Updated card detail
 */
export async function updateCard(id: number, cardDetail: any): Promise<ApiResult> {
  return apiClient.put("/card", cardDetail, {
    params: { id },
  });
}

/**
 * Removes a card by ID
 * @param id - Card ID
 */
export async function _removeCard(id: number): Promise<ApiResult> {
  return apiClient.delete("/card", {
    params: { id },
  });
}
