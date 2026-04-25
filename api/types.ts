/**
 * Standardized server-side envelope shape.
 * Used for parsing responses from server2.
 */
export interface ApiResponseEnvelope<T = any> {
  success: boolean;
  code: string;
  message: string;
  data: T | null;
  errors: any[] | null;
  meta: any | null;
}

/**
 * Standardized client-side API result model.
 * A union type that provides type safety for success and failure cases.
 */
export type ApiResult<T = unknown> = ApiSuccess<T> | ApiError;

/**
 * Represents a successful API response.
 */
export interface ApiSuccess<T> {
  ok: true;
  success: true;
  status: number;
  code: string;
  message: string;
  data: T | null;
  errors?: null;
  meta?: Record<string, unknown> | null;
}

/**
 * Represents a failed API operation, covering both network and server-side errors.
 */
export interface ApiError {
  ok: false;
  success: false;
  status: number | null; // null for network/transport errors
  code: string;
  message: string;
  data: null;
  errors?: unknown[] | null;
  meta?: Record<string, unknown> | null;
  isNetworkError: boolean;
}

/**
 * Helper to determine the type of error from an ApiError
 */
export const ApiErrorUtils = {
  isNetworkError: (error: ApiError): boolean => error.isNetworkError,
  isAuthError: (error: ApiError): boolean => error.status === 401,
  isValidationError: (error: ApiError): boolean =>
    error.status === 400 || error.code === "VALIDATION_ERROR",
  isQuotaError: (error: ApiError): boolean =>
    error.status === 429 || error.code === "QUOTA_EXCEEDED",
};
