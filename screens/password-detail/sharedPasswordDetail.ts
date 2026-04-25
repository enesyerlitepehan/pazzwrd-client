/**
 * Pure helpers for shared password detail normalization.
 */

export interface SharedMetadata {
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

/**
 * Normalizes metadata_public -> metadataPublic for consistency across the app.
 * Handles variations in property naming from server responses.
 */
export const normalizeSharedMetadata = (item: any): SharedMetadata => {
  const mp = (item?.metadata_public || {}) as Record<string, any>;
  return {
    ...mp,
    createdAt: mp.createdAt ?? item?.createdAt ?? mp.created_at,
    updatedAt: mp.updatedAt ?? item?.updatedAt ?? mp.updated_at,
  };
};
