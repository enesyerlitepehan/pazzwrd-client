import RNAsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";
import { createContext, useEffect, useRef, useState } from "react";

// Centralized user-scoped storage is imported from utils/userScopedStorage
import { queryClient } from "../api/queryClient";
import { QUERY_KEYS } from "../constants/queryKeys";
import { persistActiveLanguage } from "../i18n";
import {
  _userLogout,
  login as apiLogin,
  refreshToken as apiRefreshToken,
  create,
  getAllPassword,
  setStoredRefreshToken,
  setStoredAccessToken,
  setOnUnauthorized,
  setOnTokenRefresh,
  setUnauthorizedFlag,
  getUser as apiGetUser,
  updateUser as apiUpdateUser,
  forgotPassword as apiForgotPassword,
  apiGetCryptoParams,
  apiBootstrapInit,
  apiBootstrap,
  apiGetBackup,
  apiPostBackup,
  apiPostPublicKey,
  apiResendActivationEmail,
  apiDeleteAccount,
  ApiResult,
  UserProfile,
  BootstrapInitData,
} from "../api/api";
import LoadingModal from "../components/ui/LoadingModal";
import { API_STATUS } from "../constants";
import {
  derivePublicKey,
  generateX25519Keypair,
  getPrivateKey,
  setPrivateKey,
  setPublicKey,
  unwrapPrivateKeyWithDEK,
  wrapPrivateKeyWithDEK,
} from "../service/key-management-service";
import * as RC from "../service/revenuecat";
import * as CardService from "../utils/cardService";
import { syncCloudCardsFromBackend } from "../utils/cardUtils";
import { updateLocalWrapInfoFromServer } from "../utils/dekWrapVersion";
import { decodeJwtPayload } from "../utils/jwt";
import { logger } from "../utils/logger";
import { isOffline } from "../utils/network";
import * as PasswordService from "../utils/passwordService";
import { syncCloudPasswordsFromBackend } from "../utils/passwordUtils";
import {
  getAndroidBiometricPrompt as getAndroidBiometricPromptStore,
  setAndroidBiometricPrompt as setAndroidBiometricPromptStore,
  clearAndroidBiometricPrompt as clearAndroidBiometricPromptStore,
  getIOSBiometricPrompt as getIOSBiometricPromptStore,
  setIOSBiometricPrompt as setIOSBiometricPromptStore,
  clearIOSBiometricPrompt as clearIOSBiometricPromptStore,
  getAndroidPin as getAndroidPinStore,
  setAndroidPin as setAndroidPinStore,
  verifyAndroidPin as verifyAndroidPinStore,
  clearAndroidPin as clearAndroidPinStore,
  getDevicePin as getDevicePinStore,
  setDevicePin as setDevicePinStore,
  verifyDevicePin as verifyDevicePinStore,
  clearDevicePin as clearDevicePinStore,
} from "../utils/securityStorage";
import { syncPendingQueues as syncPendingQueuesService } from "../utils/syncService";
import type { AuthContextType, PostLoginResponse } from "../utils/types";
import type { CardData, CardResponse } from "../utils/types/cardTypes";
import type {
  Password,
  PasswordResponse,
  LocalPasswordData,
  InputPassword,
  newPasswordRequestPayload,
  EncryptedPasswordPayload,
} from "../utils/types/passwordTypes";
import {
  AsyncStorage,
  setActiveUserIdGlobal,
  getActiveUserIdGlobal,
  getUserPrefix,
  clearActiveUserContextGlobal,
} from "../utils/userScopedStorage";
import { fromB64Any, toB64Url } from "../utils/util";

// Wrapped DEK key (module-level)
const WRAP_DEK_KEY = "wrapDEK";
// Plain DEK key (new storage)
const DEK_KEY = "DEK";
const AUTH_NOTICE_KEY = "auth.notice";
const AUTH_NOTICE_SESSION_EXPIRED = "SESSION_EXPIRED";

// Exported helper to read wrapped DEK for current user (legacy; kept for compatibility)
export async function getWrapDEK(): Promise<{
  nonce: string;
  ct: string;
} | null> {
  try {
    const prefix = await getUserPrefix();
    if (!prefix) return null;
    const key = prefix + WRAP_DEK_KEY;
    const current = await SecureStore.getItemAsync(key);
    if (!current) return null;
    try {
      return JSON.parse(current);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

// New: read locally stored plain DEK for current user
export async function getDEK(): Promise<Uint8Array | null> {
  try {
    const prefix = await getUserPrefix();
    if (!prefix) return null;
    const key = prefix + DEK_KEY;
    const b64 = await SecureStore.getItemAsync(key);
    if (!b64) return null;
    try {
      return fromB64Any(b64);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Authentication context for managing user authentication state and password operations
 */
export const AuthContext = createContext<AuthContextType>({
  accessToken: "",
  refreshToken: null,
  userId: null,
  isAuthenticated: false,
  authenticate: (accessToken: string, refreshToken: string) => {},
  addNewPassword: (password: InputPassword, toCloud?: boolean) =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 200,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<Password>),
  removePassword: (
    id?: number | string,
    isLocal?: boolean,
    fromTrash?: boolean,
    skipTrash?: boolean,
  ) =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 200,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<any>),
  fetchCards: (source?: string) =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 200,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<any>),
  createCard: (_cardData: CardData) =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 201,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<any>),
  updateCard: (_id: number | string, _cardData: Partial<CardData>) =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 200,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<any>),
  getAllCards: () =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 200,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<any>),
  removeCard: (id: number | string, isLocal?: boolean, fromTrash?: boolean, skipTrash?: boolean) =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 200,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<any>),
  fetchPasswords: (source?: string) =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 200,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<any>),
  logout: (_removeLocalData?: boolean) => {},
  updatePassword: (id: number | string, password: EncryptedPasswordPayload) =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 200,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<Password>),
  localPasswords: [],
  login: (mail: string, password: string) =>
    Promise.resolve({
      ok: false,
      success: false,
      status: 500,
      code: "STUB",
      message: "Stubbed",
      data: null,
      isNetworkError: false,
    } as ApiResult<PostLoginResponse>),
  refreshAccessToken: () =>
    Promise.resolve({
      ok: false,
      success: false,
      status: 500,
      code: "STUB",
      message: "Stubbed",
      data: null,
      isNetworkError: false,
    } as ApiResult<any>),
  createUser: (mail: string, password: string) =>
    Promise.resolve({
      ok: false,
      success: false,
      message: "Stubbed",
      code: "STUB",
      status: 500,
      data: null,
      isNetworkError: false,
    } as ApiResult<any>),
  forgotPassword: (email: string) =>
    Promise.resolve({
      ok: false,
      success: false,
      message: "Stubbed",
      code: "STUB",
      status: 500,
      data: null,
      isNetworkError: false,
    } as ApiResult<any>),
  getUser: () =>
    Promise.resolve({
      ok: false,
      success: false,
      message: "Stubbed",
      code: "STUB",
      status: 500,
      data: null,
      isNetworkError: false,
    } as ApiResult<UserProfile>),
  resendActivationEmail: () =>
    Promise.resolve({
      ok: false,
      success: false,
      message: "Stubbed",
      code: "STUB",
      status: 500,
      data: null,
      isNetworkError: false,
    } as ApiResult<any>),
  updateUser: () =>
    Promise.resolve({
      ok: false,
      success: false,
      message: "Stubbed",
      code: "STUB",
      status: 500,
      data: null,
      isNetworkError: false,
    } as ApiResult<any>),
  deleteAccount: (_currentPassword: string) =>
    Promise.resolve({
      ok: false,
      success: false,
      message: "Stubbed",
      code: "STUB",
      status: 500,
      data: null,
      isNetworkError: false,
    } as ApiResult<any>),
  // Crypto and Keys bootstrap (default stubs)
  getCryptoParams: () =>
    Promise.resolve({
      ok: false,
      success: false,
      message: "Stubbed",
      code: "STUB",
      status: 500,
      data: null,
      isNetworkError: false,
    } as ApiResult<any>),
  bootstrapInit: () =>
    Promise.resolve({
      ok: false,
      success: false,
      message: "Stubbed",
      code: "STUB",
      status: 500,
      data: null,
      isNetworkError: false,
    } as ApiResult<BootstrapInitData>),
  // New Android/iOS security helpers (default stubs)
  getAndroidBiometricPrompt: () => Promise.resolve(false),
  setAndroidBiometricPrompt: (_enabled: boolean) => Promise.resolve(),
  clearAndroidBiometricPrompt: () => Promise.resolve(),
  getIOSBiometricPrompt: () => Promise.resolve(false),
  setIOSBiometricPrompt: (_enabled: boolean) => Promise.resolve(),
  clearIOSBiometricPrompt: () => Promise.resolve(),
  getAndroidPin: () => Promise.resolve(null),
  setAndroidPin: (_pin: string) => Promise.resolve(),
  verifyAndroidPin: (_pin: string) => Promise.resolve(false),
  clearAndroidPin: () => Promise.resolve(),
  getDevicePin: () => Promise.resolve(null),
  setDevicePin: (_pin: string) => Promise.resolve(),
  verifyDevicePin: (_pin: string) => Promise.resolve(false),
  clearDevicePin: () => Promise.resolve(),
  getWrapDEK: () => Promise.resolve(null),
  getDEK: () => Promise.resolve(null),
  setWrapDEK: (_w: { nonce: string; ct: string } | null, _d?: Uint8Array) =>
    Promise.resolve({
      ok: true,
      success: true,
      data: null,
      status: 200,
      code: "STUB",
      message: "Stubbed",
    } as ApiResult<any>),
  sharePassword: () => Promise.resolve(),
});

/**
 * Props for the AuthContextProvider component
 */
type AuthContextProviderProps = {
  children: React.ReactNode;
};

/**
 * Provider component for the authentication context
 * Manages authentication state and password operations
 */
function AuthContextProvider({ children }: AuthContextProviderProps) {
  const accessTokenRef = useRef("");
  const kdfVersionRef = useRef<number | null>(null);
  const [refreshToken, setRefreshToken] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [passwords, setPasswords] = useState<Password[]>([]);
  const syncingRef = useRef(false);

  /**
   * Load authentication tokens from AsyncStorage on app start
   */
  useEffect(() => {
    async function loadTokens() {
      try {
        const storedAccessToken = await AsyncStorage.getItem("accessToken");
        const storedRefreshToken = await AsyncStorage.getItem("refreshToken");
        const activeUserId = await getActiveUserIdGlobal();

        if (storedAccessToken && storedRefreshToken) {
          accessTokenRef.current = storedAccessToken;
          setRefreshToken(storedRefreshToken);
          setUserId(activeUserId);
          // Also store the tokens in the API utility for interceptors
          setStoredAccessToken(storedAccessToken);
          setStoredRefreshToken(storedRefreshToken);
          // RevenueCat: log in using user id from token payload (fallback to /user)
          try {
            let uid: string | null = null;
            try {
              const pld: any = decodeJwtPayload(storedAccessToken);
              uid = pld?.id != null ? String(pld.id) : null;
            } catch {}
            if (!uid) {
              try {
                const resp = await apiGetUser();
                const id = resp?.data?.id;
                if (id != null) uid = String(id);
              } catch {}
            }
            if (uid) await RC.logIn(uid);
          } catch {}
          // Background sync of cloud caches on app start
          try {
            syncCloudCachesBackground();
          } catch {}
          // Fetch and cache wrapped DEK version/meta from server
          try {
            await updateLocalWrapInfoFromServer();
          } catch {}
          // Optionally, a post-auth bootstrap could run here.
        }
      } catch (error) {
        // Error handling without console.log
      }
    }

    loadTokens();
  }, []);

  /**
   * Store authentication tokens in state and AsyncStorage
   * @param accessToken - The user's access token
   * @param refreshToken - The user's refresh token
   */
  function authenticate(accessToken: string, refreshToken: string) {
    accessTokenRef.current = accessToken;
    setRefreshToken(refreshToken);
    // Also store the tokens in the API utility for interceptors
    setStoredAccessToken(accessToken);
    setStoredRefreshToken(refreshToken);
    AsyncStorage.setItem("accessToken", accessToken);
    AsyncStorage.setItem("refreshToken", refreshToken);
    // After setting tokens, get the active userId for scoping
    getActiveUserIdGlobal().then((id) => setUserId(id));

    // Persist current language choice if it's the first login
    persistActiveLanguage();

    // RevenueCat: log in with app_user_id from token payload (fallback to /user)
    (async () => {
      try {
        let uid: string | null = null;
        try {
          const pld: any = decodeJwtPayload(accessToken);
          uid = pld?.id != null ? String(pld.id) : null;
        } catch {}
        if (!uid) {
          try {
            const resp = await apiGetUser();
            const id = resp?.data?.id;
            if (id != null) uid = String(id);
          } catch {}
        }
        if (uid) await RC.logIn(uid);
      } catch {}
    })();
    // After setting tokens, background-sync cloud caches
    try {
      syncCloudCachesBackground();
    } catch {}
    // Fetch and cache wrapped DEK version/meta from server
    try {
      updateLocalWrapInfoFromServer();
    } catch {}
    // Post-auth background tasks could be triggered here
  }

  /**
   * Refresh the access token using the stored refresh token
   * @returns Object indicating success and the new access token if successful
   */
  async function refreshAccessToken(): Promise<ApiResult<{ accessToken: string }>> {
    try {
      if (!refreshToken) {
        return {
          ok: false,
          success: false,
          status: 400,
          code: "NO_REFRESH_TOKEN",
          message: "No refresh token available",
          data: null,
          isNetworkError: false,
        };
      }

      const result = await apiRefreshToken(refreshToken);
      if (result.ok && result.data?.accessToken) {
        accessTokenRef.current = result.data.accessToken;
        AsyncStorage.setItem("accessToken", result.data.accessToken);
      }

      return result;
    } catch (error: any) {
      const isRefreshNetworkError = !error.response;
      return {
        ok: false,
        success: false,
        status: error.response?.status || (isRefreshNetworkError ? null : 500),
        code: isRefreshNetworkError ? "NETWORK_ERROR" : "REFRESH_FAILED",
        message: error.message || "Refresh failed",
        data: null,
        isNetworkError: isRefreshNetworkError,
      };
    }
  }

  /**
   * Authenticate user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Authentication result from API
   */
  async function login(email: string, password: string): Promise<ApiResult<PostLoginResponse>> {
    logger.info("auth", "login attempt", { email });
    try {
      const result = await apiLogin(email, password);
      // If login is successful, set the active user so subsequent storage uses the correct prefix
      try {
        if (result && result.ok) {
          await setActiveUserIdGlobal(email);
          setUserId(email);
        }
      } catch {}
      return result;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Create a new user account
   * @param email - Email address for the new account
   * @param password - Password for the new account
   * @returns Object with success status, message, and original response
   */
  async function createUser(
    email: string,
    password: string,
  ): Promise<ApiResult<PostLoginResponse>> {
    logger.info("auth", "signup attempt", { email });
    try {
      const result = await create(email, password);
      if (result && result.ok && result.data) {
        // Set active user for scoping storage before saving tokens
        try {
          await setActiveUserIdGlobal(email);
          setUserId(email);
        } catch {}
        // Extract accessToken and refreshToken from the response
        const { accessToken, refreshToken } = result.data;
        if (accessToken && refreshToken) {
          // Pass both tokens to authenticate
          authenticate(accessToken, refreshToken);
        }
      }
      return result;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Request a password reset email for the account.
   */
  async function forgotPassword(email: string): Promise<ApiResult> {
    try {
      const result = await apiForgotPassword(email);
      return result;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Add a new password to local storage and optionally to the cloud
   * @param password - Password data to save
   * @param toCloud - Whether to also save to cloud storage
   */
  async function addNewPassword(
    password: InputPassword,
    toCloud: boolean = false,
  ): Promise<ApiResult<Password>> {
    const res = await PasswordService.addNewPassword(password, getDEK, toCloud);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.PASSWORDS.ROOT] });
    }
    return res;
  }

  /**
   * Delete a password by ID or clear all passwords if no ID is provided
   * Moves deleted passwords to trash instead of permanently deleting them
   * @param id - Optional ID of the password to delete
   * @param isLocal - Whether the password is stored locally (not in the cloud)
   * @param fromTrash
   */
  async function removePassword(
    id?: number | string,
    isLocal: boolean = false,
    fromTrash: boolean = false,
    skipTrash: boolean = false,
  ) {
    const res = await PasswordService.removePassword(id, isLocal, fromTrash, skipTrash);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.PASSWORDS.ROOT] });
    }
    return res;
  }

  async function fetchPasswords(
    source: "cloud" | "local" | "trash" | string = "local",
  ): Promise<PasswordResponse> {
    return PasswordService.fetchPasswords(source);
  }

  /**
   * Log out the current user by clearing tokens and state
   */
  function logout(removeLocalData: boolean = true) {
    setUnauthorizedFlag(true);
    logger.info("auth", "logout");
    // Clear any provider-level overlay first so logout cannot leave behind a blocking scrim.
    setModalVisible(false);
    setModalMsg(undefined);
    setModalTitle(undefined);
    // Clear React Query cache on logout to prevent data leaking between users
    queryClient.clear();
    setUserId(null);
    // Call _userLogout with the current accessToken before clearing it
    if (accessTokenRef.current) {
      _userLogout().then(() => {
        // Logout completed
      });
    }

    // Perform conditional local data removal based on user preference
    (async () => {
      try {
        const opt = await AsyncStorage.getItem("logoutOption");
        const shouldRemove = opt === "true";
        if (shouldRemove && removeLocalData) {
          // Remove only this user's local data (scoped by prefix in AsyncStorage wrapper)
          await AsyncStorage.removeItem("localPasswords");
          await AsyncStorage.removeItem("trashPasswords");
          await AsyncStorage.removeItem("localCards");
          await AsyncStorage.removeItem("trashCards");
        }

        const optMP = await AsyncStorage.getItem("removeMPOption");
        if (optMP === "true") {
          // Remove Master Password configuration and encryption keys from SecureStore
          const prefix = await getUserPrefix();
          if (prefix) {
            try {
              await SecureStore.deleteItemAsync(prefix + DEK_KEY);
            } catch {}
            try {
              await SecureStore.deleteItemAsync(prefix + WRAP_DEK_KEY);
            } catch {}
          }
          // Also clear security configs to force re-verification upon next login
          await AsyncStorage.removeItem("security.mpStatus");
          await AsyncStorage.removeItem("security.accountAccess");
          await AsyncStorage.removeItem("AndroidBiometricPrompt");
          await AsyncStorage.removeItem("IOSBiometricPrompt");
          await clearAndroidPinStore();
          await clearDevicePinStore();
          await AsyncStorage.removeItem("security.fingerprintStatus");
          await AsyncStorage.removeItem("security.faceidstatus");
          await AsyncStorage.removeItem("security.pinstatus");
        }
      } catch {
        // ignore errors
      } finally {
        // Clear device-stored asymmetric keys
        const prefix = await getUserPrefix();
        if (prefix) {
          try {
            await SecureStore.deleteItemAsync(prefix + "PrivateKey");
          } catch {}
        }
        // Always try to clean up legacy global key
        try {
          await SecureStore.deleteItemAsync("PrivateKey");
        } catch {}

        // Public key might exist both as prefixed (via wrapper) and unprefixed (legacy)
        try {
          await AsyncStorage.removeItem("PublicKey"); // prefixed variant (wrapper)
        } catch {}
        try {
          await RNAsyncStorage.removeItem("PublicKey"); // ensure legacy/unprefixed is removed
        } catch {}

        // Clear tokens and auth state after local data handling
        accessTokenRef.current = "";
        setRefreshToken("");
        // Also clear the stored tokens in the API utility
        setStoredAccessToken(null);
        setStoredRefreshToken(null);
        AsyncStorage.removeItem("accessToken");
        AsyncStorage.removeItem("refreshToken");
        // RevenueCat logout (best effort)
        try {
          await RC.logOut();
        } catch {}
      }
    })();
  }

  // Register global unauthorized handler to automatically logout on 401 Unauthorized from refresh
  useEffect(() => {
    setOnUnauthorized(() => {
      RNAsyncStorage.setItem(AUTH_NOTICE_KEY, AUTH_NOTICE_SESSION_EXPIRED).catch(() => {});
      logout(false);
    });

    setOnTokenRefresh((newAccessToken, newRefreshToken) => {
      accessTokenRef.current = newAccessToken;
      setRefreshToken(newRefreshToken);
      AsyncStorage.setItem("accessToken", newAccessToken);
      AsyncStorage.setItem("refreshToken", newRefreshToken);
    });

    return () => {
      setOnUnauthorized(null);
      setOnTokenRefresh(null);
    };
  }, []);

  /**
   * Update an existing password in the cloud or local storage
   * @param id - ID of the password to update
   * @param passwordDetail - New password details
   * @returns API response with status and data
   */
  async function updatePassword(
    id: number | string,
    passwordDetail: EncryptedPasswordPayload,
  ): Promise<ApiResult<Password>> {
    const res = await PasswordService.updatePassword(id, passwordDetail);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.PASSWORDS.ROOT] });
    }
    return res;
  }

  /**
   * Generate a unique ID for new password entries
   * @returns A unique string ID with format PREFIX_RANDOM_TIMESTAMP
   */

  // Card local save moved to utils/cardService

  /**
   * Save local passwords to AsyncStorage
   * @param passwords - Array of password data to save
   */
  async function saveLocalPasswords(passwords: Password[]) {
    try {
      const localPasswordData: LocalPasswordData = {
        passwords: passwords,
        lastUpdated: new Date().toISOString(),
      };
      await AsyncStorage.setItem("localPasswords", JSON.stringify(localPasswordData));
    } catch (error) {
      // Error saving local passwords
    }
  }

  function syncCloudCachesBackground(token?: string) {
    const t = token || accessTokenRef.current;
    syncCloudPasswordsFromBackend();
    syncCloudCardsFromBackend();
    ensureEncryptionKeys(t);
  }
  // (Queues and queue sync moved to utils/syncService)

  // Listen to connectivity changes and attempt sync when back online
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      if (online) {
        syncPendingQueuesService();
      }
    });
    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, []);

  /**
   * Create a new card
   */
  async function createCard(cardData: CardData): Promise<CardResponse> {
    const res = await CardService.createCard(cardData);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.CARDS.ROOT] });
    }
    return res;
  }

  /**
   * Update an existing card
   * @param id - ID of the card to update
   * @param cardData - Object containing the updated card details
   * @returns Object containing the updated card data or error information
   */
  async function updateCard(
    id: number | string,
    cardData: Partial<CardData>,
  ): Promise<CardResponse> {
    const res = await CardService.updateCard(id, cardData);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.CARDS.ROOT] });
    }
    return res;
  }

  /**
   * Get all cards for the current user
   * @returns Object containing the cards data or error information
   */
  async function getAllCards(): Promise<CardResponse> {
    return CardService.getAllCards();
  }

  // User profile methods
  async function getUser(): Promise<ApiResult<UserProfile>> {
    try {
      const response = await apiGetUser();
      return response;
    } catch (error) {
      return {
        ok: false,
        success: false,
        data: null,
        message: "Get user failed",
        status: 500,
        code: "GET_USER_FAILED",
        errors: null,
        meta: null,
        isNetworkError: false,
      };
    }
  }

  async function resendActivationEmail(): Promise<ApiResult> {
    try {
      const response = await apiResendActivationEmail();
      return response;
    } catch (error) {
      return {
        ok: false,
        success: false,
        data: null,
        message: "Resend activation email failed",
        status: 500,
        code: "RESEND_EMAIL_FAILED",
        errors: null,
        meta: null,
        isNetworkError: false,
      };
    }
  }

  async function updateUser(userDetail: {
    userName?: string;
    password?: string;
    mail?: string;
    expireDate?: Date | string;
    fullName?: string;
    nickname?: string;
    dateOfBirth?: Date | string;
  }): Promise<ApiResult> {
    try {
      const response = await apiUpdateUser(userDetail);
      return response;
    } catch (error) {
      return {
        ok: false,
        success: false,
        data: null,
        message: "Update user failed",
        status: 500,
        code: "UPDATE_USER_FAILED",
        errors: null,
        meta: null,
        isNetworkError: false,
      };
    }
  }

  async function wipeLocalDataAfterAccountDeletion(): Promise<void> {
    try {
      const prefix = await getUserPrefix();

      // User requested full local cleanup after account deletion.
      try {
        const allKeys = await RNAsyncStorage.getAllKeys();
        if (allKeys.length > 0) {
          await RNAsyncStorage.multiRemove(allKeys);
        }
      } catch {}

      if (prefix) {
        try {
          await SecureStore.deleteItemAsync(prefix + DEK_KEY);
        } catch {}
        try {
          await SecureStore.deleteItemAsync(prefix + WRAP_DEK_KEY);
        } catch {}
        try {
          await SecureStore.deleteItemAsync(prefix + "PrivateKey");
        } catch {}

        // New: Clear secure PIN material using existing store helpers
        try {
          await clearAndroidPinStore();
        } catch {}
        try {
          await clearDevicePinStore();
        } catch {}
      }

      try {
        await SecureStore.deleteItemAsync("PrivateKey");
      } catch {}
      try {
        await AsyncStorage.removeItem("PublicKey");
      } catch {}
      try {
        await RNAsyncStorage.removeItem("PublicKey");
      } catch {}

      const secureKeysToDelete = [
        "activeUserId",
        "accessToken",
        "refreshToken",
        "knownUsers",
        "new_screen_last_blur",
      ];
      for (const key of secureKeysToDelete) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {}
      }

      await AsyncStorage.removeItem("accessToken");
      await AsyncStorage.removeItem("refreshToken");
      await AsyncStorage.removeItem("activeUserId");
      await AsyncStorage.removeItem("knownUsers");
    } catch {
      // ignore cleanup errors
    } finally {
      clearActiveUserContextGlobal();
    }
  }

  async function deleteAccount(currentPassword: string): Promise<ApiResult> {
    try {
      const response = await apiDeleteAccount(currentPassword);
      if (response && response.ok) {
        await wipeLocalDataAfterAccountDeletion();
        // Account is already removed on server, skip server logout call.
        accessTokenRef.current = "";
        logout(false);
      }
      return response;
    } catch {
      return {
        ok: false,
        success: false,
        data: null,
        message: "Delete account failed",
        status: 500,
        code: "DELETE_ACCOUNT_FAILED",
        errors: null,
        meta: null,
        isNetworkError: false,
      };
    }
  }

  // Crypto and Keys bootstrap methods
  async function getCryptoParams(): Promise<ApiResult> {
    try {
      const response = await apiGetCryptoParams();
      return response;
    } catch (error) {
      return {
        ok: false,
        success: false,
        data: null,
        message: "Get crypto params failed",
        status: 500,
        code: "GET_CRYPTO_PARAMS_FAILED",
        errors: null,
        meta: null,
        isNetworkError: false,
      };
    }
  }

  async function bootstrapInit(): Promise<ApiResult<BootstrapInitData>> {
    try {
      try {
        const response = await apiBootstrapInit();
        // Cache kdfVersion for subsequent /keys/bootstrap call
        const ver = response?.data?.kdfVersion ?? response?.data?.kdfParams?.kdfVersion;
        if (typeof ver === "number" && Number.isFinite(ver)) {
          kdfVersionRef.current = ver;
        } else {
          // Fallback to default 1 if not provided
          kdfVersionRef.current = 1;
        }
        return response;
      } catch (e) {
        throw e;
      }
    } catch (error) {
      return {
        ok: false,
        success: false,
        data: null,
        message: "Bootstrap init failed",
        status: 500,
        code: "BOOTSTRAP_INIT_FAILED",
        errors: null,
        meta: null,
        isNetworkError: false,
      };
    }
  }

  /**
   * Fetch cards from different sources: cloud, local, or trash
   * @param source - The source to fetch cards from: 'cloud', 'local', or 'trash'
   * @param encrypted - Encrypted card data string (for local storage)
   */
  async function fetchCards(
    source: "cloud" | "local" | "trash" | string = "local",
  ): Promise<CardResponse> {
    return CardService.fetchCards(source);
  }

  /**
   * Removes a card by ID and moves it to trash
   * @param id - ID of the card to remove
   * @param isLocal - Whether the card is stored locally (not in the cloud)
   * @param fromTrash
   */
  async function removeCard(
    id: number | string,
    isLocal: boolean = false,
    fromTrash: boolean = false,
    skipTrash: boolean = false,
  ) {
    const res = await CardService.removeCard(id, isLocal, fromTrash, skipTrash);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.CARDS.ROOT] });
    }
    return res;
  }

  // Android/iOS biometric, PIN, and first-login helpers delegated to securityStorage
  async function getAndroidBiometricPrompt(): Promise<boolean> {
    return getAndroidBiometricPromptStore();
  }
  async function setAndroidBiometricPrompt(enabled: boolean): Promise<void> {
    return setAndroidBiometricPromptStore(enabled);
  }
  async function clearAndroidBiometricPrompt(): Promise<void> {
    return clearAndroidBiometricPromptStore();
  }
  async function getAndroidPin(): Promise<string | null> {
    return getAndroidPinStore();
  }
  async function setAndroidPin(pin: string): Promise<void> {
    return setAndroidPinStore(pin);
  }
  async function verifyAndroidPin(pin: string): Promise<boolean> {
    return verifyAndroidPinStore(pin);
  }
  async function clearAndroidPin(): Promise<void> {
    return clearAndroidPinStore();
  }
  async function getIOSBiometricPrompt(): Promise<boolean> {
    return getIOSBiometricPromptStore();
  }
  async function setIOSBiometricPrompt(enabled: boolean): Promise<void> {
    return setIOSBiometricPromptStore(enabled);
  }
  async function clearIOSBiometricPrompt(): Promise<void> {
    return clearIOSBiometricPromptStore();
  }
  async function getDevicePin(): Promise<string | null> {
    return getDevicePinStore();
  }
  async function setDevicePin(pin: string): Promise<void> {
    return setDevicePinStore(pin);
  }
  async function verifyDevicePin(pin: string): Promise<boolean> {
    return verifyDevicePinStore(pin);
  }
  async function clearDevicePin(): Promise<void> {
    return clearDevicePinStore();
  }

  // ensureWrappedDEK removed per request

  // getWrapDEK is provided as a module-level export

  async function setWrapDEK(
    w: { nonce: string; ct: string } | null,
    DEK?: Uint8Array,
  ): Promise<ApiResult> {
    try {
      const prefix = await getUserPrefix();
      if (!prefix) {
        return {
          ok: false,
          success: false,
          status: 400,
          code: "NO_PREFIX",
          message: "No user prefix",
          data: null,
          isNetworkError: false,
        };
      }
      const wrapKey = prefix + WRAP_DEK_KEY;
      const dekKey = prefix + DEK_KEY;

      // Always clean up legacy local wrapDEK storage (we no longer store it)
      try {
        await SecureStore.deleteItemAsync(wrapKey);
      } catch {}

      // Store DEK locally (if provided)
      if (DEK && DEK.length) {
        try {
          await SecureStore.setItemAsync(dekKey, toB64Url(DEK));
          // Background task: ensure encryption keys are ready now that we have the DEK
          ensureEncryptionKeys(accessTokenRef.current);
        } catch {}
      }

      // If wrapDEK is null, do NOT call server (used in re-auth flows)
      if (w === null) {
        return {
          ok: true,
          success: true,
          status: 200,
          code: "OK",
          message: "Local DEK set",
          data: null,
        };
      }

      // Attempt to send wrapped DEK to server (initial bootstrap)
      const kdfVer =
        typeof kdfVersionRef.current === "number" && Number.isFinite(kdfVersionRef.current)
          ? (kdfVersionRef.current as number)
          : 1;

      try {
        const result = await apiBootstrap({
          DEK_wrapped_by_MP: { nonce: w.nonce, ct: w.ct },
          kdfVersion: kdfVer,
        });
        // Best-effort: fetch server wrapGeneration/meta and persist locally
        try {
          if (accessTokenRef.current) {
            await updateLocalWrapInfoFromServer();
          }
        } catch {}
        return result;
      } catch (err: any) {
        // ignore network/server errors here; caller can handle retry logic if needed
        const isBootstrapNetworkError = !err.response;
        return {
          ok: false,
          success: false,
          status: err.response?.status || (isBootstrapNetworkError ? null : 500),
          code: isBootstrapNetworkError ? "NETWORK_ERROR" : "BOOTSTRAP_FAILED",
          message: err.message || "Bootstrap failed",
          data: null,
          isNetworkError: isBootstrapNetworkError,
        };
      }
    } catch (e: any) {
      return {
        ok: false,
        success: false,
        status: 500,
        code: "INTERNAL_ERROR",
        message: e.message || "An error occurred",
        data: null,
        isNetworkError: false,
      };
    }
  }

  async function ensureEncryptionKeys(providedAccessToken?: string) {
    const token = providedAccessToken || accessTokenRef.current;
    if (!token) return;

    try {
      const localPriv = await getPrivateKey();
      const hasLocalPriv = !!(localPriv && localPriv.length > 0);
      const dek = await getDEK();

      const resp = await apiGetBackup({ keyType: "x25519" });
      const serverHasBackup = resp && resp.ok && resp.data?.x25519PrivWrapped;
      const backupMissing =
        resp && !resp.ok && (resp.status === 404 || resp.code === "BACKUP_NOT_FOUND");

      if (backupMissing) {
        if (!dek) {
          return;
        }

        let privToBackup = localPriv;
        let pubToPost: Uint8Array;
        let pubB64: string;

        if (!hasLocalPriv) {
          const {
            publicKey,
            privateKey: newPriv,
            publicKey_b64url,
          } = await generateX25519Keypair();
          privToBackup = newPriv;
          pubToPost = publicKey;
          pubB64 = publicKey_b64url;
          await setPrivateKey(newPriv);
          await setPublicKey(publicKey);
        } else {
          pubToPost = derivePublicKey(localPriv!);
          pubB64 = toB64Url(pubToPost);
          await setPublicKey(pubToPost);
        }

        // Upload
        const wrappedKEY = await wrapPrivateKeyWithDEK(dek, privToBackup!);
        await apiPostPublicKey({
          keyVersion: wrappedKEY.keyVersion,
          keyType: wrappedKEY.keyType,
          publicKey: pubB64,
        });

        await apiPostBackup({
          keyVersion: wrappedKEY.keyVersion,
          keyType: wrappedKEY.keyType,
          x25519PrivWrapped: {
            ct: wrappedKEY.ct,
            nonce: wrappedKEY.nonce,
          },
        });
      } else if (resp.ok && resp.data?.x25519PrivWrapped && !hasLocalPriv) {
        if (!dek) {
          return;
        }

        const wrapped = resp.data.x25519PrivWrapped;
        const priv = unwrapPrivateKeyWithDEK(dek, {
          nonce: wrapped.nonce,
          ct: wrapped.ct,
          keyType: "x25519",
          keyVersion: resp.data.keyVersion || 1,
        });
        await setPrivateKey(priv);
        const pub = derivePublicKey(priv);
        await setPublicKey(pub);
      }
    } catch (e) {
      // ensureEncryptionKeys error
    }
  }

  // Share Password action moved from passwordService
  async function sharePassword(): Promise<void> {
    return ensureEncryptionKeys();
  }

  /**
   * Context value object containing all authentication state and functions
   */
  const value: AuthContextType = {
    accessToken: accessTokenRef.current,
    refreshToken,
    userId,
    isAuthenticated: !!refreshToken,
    authenticate,
    login,
    createUser,
    addNewPassword,
    removePassword,
    removeCard,
    fetchPasswords,
    fetchCards,
    logout,
    updatePassword,
    localPasswords: passwords,
    refreshAccessToken,
    createCard,
    updateCard,
    getAllCards,
    getUser,
    resendActivationEmail,
    updateUser,
    deleteAccount,
    forgotPassword,
    // Crypto & Keys
    getCryptoParams,
    bootstrapInit,
    // Biometric & PIN & first-login helpers (Android + iOS) and unified device helpers
    getAndroidBiometricPrompt,
    setAndroidBiometricPrompt,
    clearAndroidBiometricPrompt,
    getIOSBiometricPrompt,
    setIOSBiometricPrompt,
    clearIOSBiometricPrompt,
    getAndroidPin,
    setAndroidPin,
    verifyAndroidPin,
    clearAndroidPin,
    getDevicePin,
    setDevicePin,
    verifyDevicePin,
    clearDevicePin,
    getWrapDEK,
    getDEK,
    setWrapDEK,
    sharePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoadingModal
        visible={modalVisible}
        message={modalMsg}
        titleKey={modalTitle}
        resultMode={true}
        showActionButton={true}
        onAction={() => setModalVisible(false)}
      />
    </AuthContext.Provider>
  );
}

export default AuthContextProvider;
