import type { ApiResult, UserProfile, BootstrapInitData } from "../api/api";
import type { CardData, CardResponse, LocalCardData } from "./types/cardTypes";
import type {
  newPasswordRequestPayload,
  NewPassword,
  NewPasswordQueue,
  InputPassword,
  EncryptedPasswordPayload,
  Password,
  HandleFieldChange,
  PasswordResponse,
  updatePasswordResponse,
  LocalPasswordData,
} from "./types/passwordTypes";

export interface AuthContextType {
  accessToken: string;
  refreshToken: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  authenticate: (accessToken: string, refreshToken: string) => void;
  login: (email: string, password: string) => Promise<ApiResult<PostLoginResponse>>;
  createUser: (email: string, password: string) => Promise<ApiResult<PostLoginResponse>>;
  forgotPassword: (email: string) => Promise<ApiResult>;
  logout: (removeLocalData?: boolean) => void;
  updatePassword: (
    id: number | string,
    password: EncryptedPasswordPayload,
  ) => Promise<ApiResult<Password>>;
  localPasswords: Password[];
  addNewPassword: (password: InputPassword, toCloud?: boolean) => Promise<ApiResult<Password>>;
  removePassword: (
    id?: number | string,
    isLocal?: boolean,
    fromTrash?: boolean,
    skipTrash?: boolean,
  ) => Promise<PasswordResponse>;
  fetchPasswords: (source?: "cloud" | "local" | "trash" | string) => Promise<PasswordResponse>;
  fetchCards: (source?: "cloud" | "local" | "trash" | string) => Promise<CardResponse>;
  refreshAccessToken: () => Promise<ApiResult<{ accessToken: string }>>;
  createCard: (cardData: CardData) => Promise<CardResponse>;
  updateCard: (id: number | string, cardData: Partial<CardData>) => Promise<CardResponse>;
  removeCard: (
    id: number | string,
    isLocal?: boolean,
    fromTrash?: boolean,
    skipTrash?: boolean,
  ) => Promise<CardResponse>;
  getAllCards: () => Promise<CardResponse>;
  // User profile methods
  getUser: () => Promise<ApiResult<UserProfile>>;
  resendActivationEmail: () => Promise<ApiResult>;
  updateUser: (userDetail: {
    userName?: string;
    password?: string;
    mail?: string;
    expireDate?: Date | string;
    fullName?: string;
    nickname?: string;
    dateOfBirth?: Date | string;
  }) => Promise<ApiResult>;
  deleteAccount: (currentPassword: string) => Promise<ApiResult>;
  // Crypto and Keys bootstrap
  getCryptoParams: () => Promise<ApiResult>;
  bootstrapInit: () => Promise<ApiResult<BootstrapInitData>>;
  // Biometric & PIN & First Login helpers
  // Android-specific (kept for backward compatibility)
  getAndroidBiometricPrompt: () => Promise<boolean>;
  setAndroidBiometricPrompt: (enabled: boolean) => Promise<void>;
  clearAndroidBiometricPrompt: () => Promise<void>;
  getAndroidPin: () => Promise<string | null>;
  setAndroidPin: (pin: string) => Promise<void>;
  verifyAndroidPin: (pin: string) => Promise<boolean>;
  clearAndroidPin: () => Promise<void>;
  // iOS-specific
  getIOSBiometricPrompt: () => Promise<boolean>;
  setIOSBiometricPrompt: (enabled: boolean) => Promise<void>;
  clearIOSBiometricPrompt: () => Promise<void>;
  // Device-agnostic PIN helpers (preferred)
  getDevicePin: () => Promise<string | null>;
  setDevicePin: (pin: string) => Promise<void>;
  verifyDevicePin: (pin: string) => Promise<boolean>;
  clearDevicePin: () => Promise<void>;
  // Key management helpers
  getWrapDEK: () => Promise<{ nonce: string; ct: string } | null>;
  // Returns locally stored DEK bytes (or null if not present)
  getDEK: () => Promise<Uint8Array | null>;
  // Set wrapped DEK (for server) and/or plain DEK (for local secure storage)
  // If wrapDEK is null, do NOT send to server; only store DEK locally if provided
  setWrapDEK: (
    wrapDEK: { nonce: string; ct: string } | null,
    DEK?: Uint8Array,
  ) => Promise<ApiResult>;
  // Share password / key management action (moved from passwordService)
  sharePassword: () => Promise<void>;
}

export type AuthContextProvider = {
  children: React.ReactNode;
};

// --- Auth / Login API result types ---
import type { MpStatus, AccountAccess, EmailStatus } from "../types/security";

export interface PostLoginSecurity {
  activate: boolean;
  saltMP: string;
  kdfVersion: number;
  mpStatus: MpStatus;
  accountAccess?: AccountAccess; // optional, for new clients
  emailStatus?: EmailStatus; // optional, for new clients
  bootstrapIssuedAt: string; // ISO timestamp
}

export interface PostLoginResponse {
  message: string;
  type: "PostLogin"; // discriminator from server response
  accessToken: string;
  refreshToken: string;
  security: PostLoginSecurity;
}

// The login call returns normalized ApiResult
export type LoginResult = ApiResult<PostLoginResponse>;
