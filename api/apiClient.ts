import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosRequestConfig,
} from "axios";
import { CONFIG } from "../utils/config";
import { ApiResult, ApiError, ApiSuccess, ApiResponseEnvelope } from "./types";

export type { ApiResult, ApiError, ApiSuccess, ApiResponseEnvelope };

const rawApiClient: AxiosInstance = axios.create({
  baseURL: CONFIG.apiURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
let onTokenRefresh: ((accessToken: string, refreshToken: string) => void) | null = null;
let isRefreshing = false;
let failedQueue: any[] = [];
let isUnauthorizedCalled = false;

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setTokens = (access?: string | null, refresh?: string | null) => {
  if (access !== undefined) {
    accessToken = access;
    // Reset the flag if we are setting a new valid access token
    if (access) {
      isUnauthorizedCalled = false;
    }
  }
  if (refresh !== undefined) {
    refreshToken = refresh;
  }
};

/**
 * Manually set the isUnauthorizedCalled flag to prevent multiple triggers.
 * Useful for suppressing the handler during a manual logout process.
 */
export const setUnauthorizedFlag = (val: boolean) => {
  isUnauthorizedCalled = val;
};

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

export const setOnTokenRefresh = (
  handler: ((accessToken: string, refreshToken: string) => void) | null,
) => {
  onTokenRefresh = handler;
};

rawApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

rawApiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 and Token Refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return rawApiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Use a clean axios instance for refresh to avoid interceptors
        const response = await axios.post(`${CONFIG.apiURL}/auth/refresh-token`, {
          refreshToken,
        });

        // Parse from standardized server envelope
        const envelope: ApiResponseEnvelope = response.data || {};
        const resultData = envelope.data;
        const newAccessToken = resultData?.accessToken;
        const newRefreshToken = resultData?.refreshToken || refreshToken;

        if (!newAccessToken) {
          throw new Error("Failed to obtain new access token");
        }

        setTokens(newAccessToken, newRefreshToken);

        if (onTokenRefresh) {
          onTokenRefresh(newAccessToken, newRefreshToken);
        }

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return rawApiClient(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Normalizes a raw axios response/error into an ApiResult.
 */
async function toApiResult<T>(
  promise: Promise<AxiosResponse<ApiResponseEnvelope<T>>>,
): Promise<ApiResult<T>> {
  try {
    const response = await promise;
    const envelope: ApiResponseEnvelope<T> = response.data || {};
    const success = envelope.success ?? true;

    if (success) {
      return {
        ok: true,
        success: true,
        status: response.status,
        code: envelope.code || "OK",
        message: envelope.message || "Success",
        data: envelope.data !== undefined ? envelope.data : (envelope as any),
        meta: envelope.meta,
      };
    } else {
      return {
        ok: false,
        success: false,
        status: response.status,
        code: envelope.code || "API_ERROR",
        message: envelope.message || "An error occurred",
        data: null,
        errors: envelope.errors,
        meta: envelope.meta,
        isNetworkError: false,
      };
    }
  } catch (error: any) {
    const isNetworkError = !error.response;
    const envelope: ApiResponseEnvelope = error.response?.data || {};

    // Handle terminal 401 Unauthorized
    // We only trigger this if we were authenticated (accessToken exists)
    // and we haven't already triggered it for this session/event.
    if (error.response?.status === 401 && accessToken && onUnauthorized && !isUnauthorizedCalled) {
      isUnauthorizedCalled = true;
      onUnauthorized();
    }

    return {
      ok: false,
      success: false,
      status: error.response?.status || (isNetworkError ? null : 500),
      code: envelope.code || (isNetworkError ? "NETWORK_ERROR" : "API_ERROR"),
      message: envelope.message || error.message || "An error occurred",
      data: null,
      errors: envelope.errors || null,
      meta: envelope.meta || null,
      isNetworkError,
    };
  }
}

/**
 * Public apiClient wrapper that maintains the ApiResult contract.
 */
const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    toApiResult<T>(rawApiClient.get<ApiResponseEnvelope<T>>(url, config)),
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    toApiResult<T>(rawApiClient.post<ApiResponseEnvelope<T>>(url, data, config)),
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    toApiResult<T>(rawApiClient.put<ApiResponseEnvelope<T>>(url, data, config)),
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    toApiResult<T>(rawApiClient.patch<ApiResponseEnvelope<T>>(url, data, config)),
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    toApiResult<T>(rawApiClient.delete<ApiResponseEnvelope<T>>(url, config)),
};

export default apiClient;
