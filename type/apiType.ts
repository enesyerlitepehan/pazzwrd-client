import { API_GET_PUBLIC_KEY_BY_EMAIL_CODE, GetPublicKeyByEmailCode } from "./apiCode";

// Generic standardized response shapes matching server contract
export interface ApiBaseResponse<C extends string = string> {
  success: boolean;
  code: C;
  message: string;
}

export interface ApiSuccessResponse<T, C extends string = string> extends ApiBaseResponse<C> {
  success: true;
  data: T | null;
  meta: Record<string, any> | null;
}

export interface ApiErrorResponse<
  E = Record<string, string[]>,
  C extends string = string,
> extends ApiBaseResponse<C> {
  success: false;
  errors: E | null;
  data: null;
}

// Types specific to GET /keys/public (getPublicKeyByEmail)
export type PublicKeyItem = {
  keyType: "x25519" | "ed25519";
  keyVersion: number;
  publicKey: string;
  isActive: boolean;
};

export type GetPublicKeyByEmailData = {
  exists: boolean;
  keys: PublicKeyItem[];
};

export type GetPublicKeyByEmailSuccessCode =
  | typeof API_GET_PUBLIC_KEY_BY_EMAIL_CODE.USER_NOT_FOUND
  | typeof API_GET_PUBLIC_KEY_BY_EMAIL_CODE.PUBLIC_KEYS_FOUND;

export type GetPublicKeyByEmailErrorCode =
  | typeof API_GET_PUBLIC_KEY_BY_EMAIL_CODE.UNAUTHORIZED
  | typeof API_GET_PUBLIC_KEY_BY_EMAIL_CODE.INVALID_EMAIL
  | typeof API_GET_PUBLIC_KEY_BY_EMAIL_CODE.INVALID_EMAIL_OWNER
  | typeof API_GET_PUBLIC_KEY_BY_EMAIL_CODE.PUBLIC_KEYS_NOT_FOUND
  | typeof API_GET_PUBLIC_KEY_BY_EMAIL_CODE.INTERNAL_ERROR;

export type GetPublicKeyByEmailSuccessResponse = ApiSuccessResponse<
  GetPublicKeyByEmailData,
  GetPublicKeyByEmailSuccessCode
>;

export type GetPublicKeyByEmailErrorResponse = ApiErrorResponse<
  Record<string, string[]>,
  GetPublicKeyByEmailErrorCode
>;

export type GetPublicKeyByEmailResponse =
  | GetPublicKeyByEmailSuccessResponse
  | GetPublicKeyByEmailErrorResponse;

export interface GetBackupData {
  keyType: string;
  keyVersion: number;
  x25519PrivWrapped: { nonce: string; ct: string };
  updatedAt: string | null;
}

export type GetBackupResponse = ApiSuccessResponse<GetBackupData> | ApiErrorResponse;
