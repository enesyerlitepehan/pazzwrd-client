import { apiClient, ApiResult } from "./core";

// Types
export type PostShareBody = {
  itemId: string;
  recipientEmail: string;
  wrappedIK: { nonce: string; ct: string; sender_ephemeral_pub: string };
  metadata?: Record<string, any>;
};

export type RemoveShareRecipientsBody = {
  recipientIds?: number[];
  recipientId?: number;
};

export type RewrapShareBody = {
  itemId: string;
  version: number;
  recipients: Array<{
    recipientId: number;
    wrappedIK: { nonce: string; ct: string; sender_ephemeral_pub: string };
  }>;
};

export interface ShareStatusData {
  recipients: Array<{
    recipient: string;
    status: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface ShareDetailData {
  item: {
    itemId: string;
    ciphertext: { nonce: string; ct: string };
    ciphertext_aad: string;
    version: number;
    metadata_public: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
  };
  wrappedIK: {
    nonce: string;
    ct: string;
    sender_ephemeral_pub: string;
  };
  owner?: {
    mail: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface SharesByItemData {
  shares: Array<{
    shareId: string | number;
    recipient: string;
    status: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

/**
 * Creates a new share
 */
export async function apiPostShare(body: PostShareBody): Promise<ApiResult> {
  return apiClient.post("/shares", body);
}

/**
 * Retrieves all received shares
 */
export async function apiGetReceivedShares(): Promise<ApiResult> {
  return apiClient.get("/shares/received");
}

/**
 * Retrieves a specific share detail by ID
 */
export async function apiGetShareDetail(
  shareId: number | string,
): Promise<ApiResult<ShareDetailData>> {
  return apiClient.get(`/shares/${shareId}`);
}

/**
 * Accepts or rejects a received share
 */
export async function apiPostReceivedShareCheck(body: {
  shareId: number | string;
  accept: boolean;
}): Promise<ApiResult> {
  return apiClient.post("/shares/received/check", body);
}

/**
 * Retrieves pending received shares
 */
export async function apiGetPendingReceivedShares(): Promise<ApiResult> {
  return apiClient.get("/shares/received/pending");
}

/**
 * Retrieves share status by item ID
 */
export async function apiGetShareStatusByItemId(
  itemId: string,
): Promise<ApiResult<ShareStatusData>> {
  return apiClient.get(`/shares/status/${encodeURIComponent(itemId)}`);
}

/**
 * Recipient removes their own access to a share
 */
export async function apiRemoveReceivedShareAccess(shareId: number | string): Promise<ApiResult> {
  return apiClient.delete(`/shares/received/${shareId}`);
}

/**
 * List active shares for an owned item
 */
export async function apiGetSharesByItem(itemId: string): Promise<ApiResult<SharesByItemData>> {
  return apiClient.get(`/shares/by-item/${encodeURIComponent(itemId)}`);
}

/**
 * Owner removes one or more recipients from a share
 */
export async function apiRemoveShareRecipients(
  shareId: number | string,
  body: RemoveShareRecipientsBody,
): Promise<ApiResult> {
  return apiClient.delete(`/shares/${shareId}/recipients`, { data: body });
}

/**
 * Owner re-wraps recipient IKs after rotation
 */
export async function apiPostShareRewrap(
  shareId: number | string,
  body: RewrapShareBody,
): Promise<ApiResult> {
  return apiClient.post(`/shares/${shareId}/rewrap`, body);
}
