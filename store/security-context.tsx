import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useContext,
  useRef,
} from "react";
import { Platform } from "react-native";

import {
  AccountAccess,
  MpStatus,
  Connectivity,
  Capabilities,
  EmailStatus,
  deriveCapabilities,
} from "../types/security";
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
import { AsyncStorage } from "../utils/userScopedStorage";

import { AuthContext } from "./auth-context";
import { useSecurityBootstrap } from "./useSecurityBootstrap";
import { useConnectivity } from "./useConnectivity";

// Keys for persistence
export const STORAGE_KEYS = {
  // New keys
  accountAccess: "security.accountAccess",
  mpStatus: "security.mpStatus",
  connectivity: "security.connectivity", // informational; will be derived live, but we persist last known
  emailStatus: "security.emailStatus",
  // Legacy keys (read-only migration)
  legacyAccountMode: "security.accountMode",
};

export type SecurityContextValue = {
  accountAccess: AccountAccess;
  mpStatus: MpStatus;
  emailStatus: EmailStatus;
  connectivity: Connectivity;
  capabilities: Capabilities;
  isHydrated: boolean;
  isLocked: boolean;
  setAccountAccess: (access: AccountAccess) => Promise<void>;
  setMpStatus: (status: MpStatus) => Promise<void>;
  setEmailStatus: (status: EmailStatus) => Promise<void>;
  setConnectivity: (conn: Connectivity) => Promise<void>;
  setLocked: (locked: boolean) => void;
  // Device security helpers
  getAndroidBiometricPrompt: () => Promise<boolean>;
  setAndroidBiometricPrompt: (enabled: boolean) => Promise<void>;
  clearAndroidBiometricPrompt: () => Promise<void>;
  getIOSBiometricPrompt: () => Promise<boolean>;
  setIOSBiometricPrompt: (enabled: boolean) => Promise<void>;
  clearIOSBiometricPrompt: () => Promise<void>;
  getAndroidPin: () => Promise<string | null>;
  setAndroidPin: (pin: string) => Promise<void>;
  verifyAndroidPin: (pin: string) => Promise<boolean>;
  clearAndroidPin: () => Promise<void>;
  getDevicePin: () => Promise<string | null>;
  setDevicePin: (pin: string) => Promise<void>;
  verifyDevicePin: (pin: string) => Promise<boolean>;
  clearDevicePin: () => Promise<void>;
};

// Defaults
const defaultAccountAccess: AccountAccess = "LOCAL_ONLY";
const defaultMpStatus: MpStatus = "NONE";
const defaultConnectivity: Connectivity = "OFFLINE";
const defaultEmailStatus: EmailStatus = "UNVERIFIED";

const SecurityContext = createContext<SecurityContextValue | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [accountAccess, _setAccountAccess] = useState<AccountAccess>(defaultAccountAccess);
  const [mpStatus, _setMpStatus] = useState<MpStatus>(defaultMpStatus);
  const [connectivity, _setConnectivity] = useState<Connectivity>(defaultConnectivity);
  const [emailStatus, _setEmailStatus] = useState<EmailStatus>(defaultEmailStatus);
  const [isLocked, setIsLocked] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);

  // Load persisted values on mount & startup lock-check logic
  const { isHydrated } = useSecurityBootstrap(
    isAuthenticated,
    _setAccountAccess,
    _setMpStatus,
    _setConnectivity,
    _setEmailStatus,
    setIsLocked,
  );

  // Listen to NetInfo for live connectivity updates
  useConnectivity(_setConnectivity);

  const setAccountAccess = useCallback(
    async (access: AccountAccess) => {
      // Normalize: CLOUD only if MP configured AND email verified
      const normalized: AccountAccess =
        access === "CLOUD" && mpStatus === "CONFIGURED" && emailStatus === "VERIFIED"
          ? "CLOUD"
          : "LOCAL_ONLY";
      _setAccountAccess(normalized);
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.accountAccess, normalized);
      } catch {}
    },
    [mpStatus, emailStatus],
  );

  // Keep accountAccess consistent with mpStatus/emailStatus changes
  useEffect(() => {
    const target: AccountAccess =
      mpStatus === "CONFIGURED" && emailStatus === "VERIFIED" ? "CLOUD" : "LOCAL_ONLY";
    _setAccountAccess((prev) => {
      if (prev !== target) {
        AsyncStorage.setItem(STORAGE_KEYS.accountAccess, target).catch(() => {});
        return target;
      }
      return prev;
    });
  }, [mpStatus, emailStatus]);

  const setMpStatus = useCallback(async (status: MpStatus) => {
    _setMpStatus(status);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.mpStatus, status);
    } catch {}
  }, []);

  const setEmailStatus = useCallback(async (status: EmailStatus) => {
    _setEmailStatus(status);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.emailStatus, status);
    } catch {}
  }, []);

  const setConnectivity = useCallback(async (conn: Connectivity) => {
    _setConnectivity(conn);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.connectivity, conn);
    } catch {}
  }, []);

  const setLocked = useCallback((locked: boolean) => {
    setIsLocked(locked);
  }, []);

  const capabilities = useMemo(
    () => deriveCapabilities(accountAccess, mpStatus),
    [accountAccess, mpStatus],
  );

  // Delegate helpers to shared storage utilities
  const getAndroidBiometricPrompt = useCallback(() => getAndroidBiometricPromptStore(), []);
  const setAndroidBiometricPrompt = useCallback(
    (enabled: boolean) => setAndroidBiometricPromptStore(enabled),
    [],
  );
  const clearAndroidBiometricPrompt = useCallback(() => clearAndroidBiometricPromptStore(), []);

  const getIOSBiometricPrompt = useCallback(() => getIOSBiometricPromptStore(), []);
  const setIOSBiometricPrompt = useCallback(
    (enabled: boolean) => setIOSBiometricPromptStore(enabled),
    [],
  );
  const clearIOSBiometricPrompt = useCallback(() => clearIOSBiometricPromptStore(), []);

  const getAndroidPin = useCallback(() => getAndroidPinStore(), []);
  const setAndroidPin = useCallback((pin: string) => setAndroidPinStore(pin), []);
  const verifyAndroidPin = useCallback((pin: string) => verifyAndroidPinStore(pin), []);
  const clearAndroidPin = useCallback(() => clearAndroidPinStore(), []);

  const getDevicePin = useCallback(() => getDevicePinStore(), []);
  const setDevicePin = useCallback((pin: string) => setDevicePinStore(pin), []);
  const verifyDevicePin = useCallback((pin: string) => verifyDevicePinStore(pin), []);
  const clearDevicePin = useCallback(() => clearDevicePinStore(), []);

  const value = useMemo<SecurityContextValue>(
    () => ({
      accountAccess,
      mpStatus,
      emailStatus,
      connectivity,
      capabilities,
      isHydrated,
      isLocked,
      setAccountAccess,
      setMpStatus,
      setEmailStatus,
      setConnectivity,
      setLocked,
      // security helpers (implemented below)
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
    }),
    [
      accountAccess,
      mpStatus,
      emailStatus,
      connectivity,
      capabilities,
      isHydrated,
      isLocked,
      setAccountAccess,
      setMpStatus,
      setEmailStatus,
      setConnectivity,
      setLocked,
      // helpers deps (no-op; stable wrappers)
    ],
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity(): SecurityContextValue {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error("useSecurity must be used within a SecurityProvider");
  return ctx;
}

// Using centralized user-scoped AsyncStorage from utils/userScopedStorage
