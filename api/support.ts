import { apiClient, ApiResult } from "./core";

/**
 * Sends a support message to the server.
 * @param title - The title of the message
 * @param body - The body/description of the message
 */
export async function apiPostSupportMessage(title: string, body: string): Promise<ApiResult> {
  return apiClient.post("/support/message", { title, body });
}
