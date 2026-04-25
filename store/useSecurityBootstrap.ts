import { useEffect, useRef, useState, Dispatch, SetStateAction } from "react";
import { Platform } from "react-native";
import { AsyncStorage } from "../utils/userScopedStorage";
import { AccountAccess, MpStatus, Connectivity, EmailStatus } from "../types/security";
import {
  getAndroidBiometricPrompt,
  getIOSBiometricPrompt,
  getAndroidPin,
  getDevicePin,
} from "../utils/securityStorage";

// Re-using the keys from security-context.tsx (they will be exported)
const STORAGE_KEYS = {
  accountAccess: "security.accountAccess",
  mpStatus: "security.mpStatus",
  connectivity: "security.connectivity",
  emailStatus: "security.emailStatus",
  legacyAccountMode: "security.accountMode",
};

export function useSecurityBootstrap(
  isAuthenticated: boolean,
  setAccountAccess: Dispatch<SetStateAction<AccountAccess>>,
  setMpStatus: Dispatch<SetStateAction<MpStatus>>,
  setConnectivity: Dispatch<SetStateAction<Connectivity>>,
  setEmailStatus: Dispatch<SetStateAction<EmailStatus>>,
  setIsLocked: Dispatch<SetStateAction<boolean>>,
) {
  const [isHydrated, setIsHydrated] = useState(false);
  const lockCheckedOnStart = useRef(false);

  // Load persisted values on mount
  useEffect(() => {
    (async () => {
      try {
        const [access, legacyMode, mp, conn, email] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.accountAccess),
          AsyncStorage.getItem(STORAGE_KEYS.legacyAccountMode),
          AsyncStorage.getItem(STORAGE_KEYS.mpStatus),
          AsyncStorage.getItem(STORAGE_KEYS.connectivity),
          AsyncStorage.getItem(STORAGE_KEYS.emailStatus),
        ]);
        console.log("access: ", access);
        console.log("legacyMode: ", legacyMode);
        console.log("mp: ", mp);
        console.log("conn: ", conn);
        console.log("email: ", email);

        // Prefer new access value
        if (access === "LOCAL_ONLY" || access === "CLOUD") {
          setAccountAccess(access as AccountAccess);
        } else if (
          legacyMode === "LOCAL_ONLY" ||
          legacyMode === "MP_ENABLED" ||
          legacyMode === "NONE"
        ) {
          // Migrate legacy AccountMode => AccountAccess
          const migrated: AccountAccess = legacyMode === "MP_ENABLED" ? "CLOUD" : "LOCAL_ONLY";
          setAccountAccess(migrated);
          AsyncStorage.setItem(STORAGE_KEYS.accountAccess, migrated).catch(() => {});
        }

        if (mp === "NONE" || mp === "PENDING" || mp === "CONFIGURED" || mp === "SKIPPED") {
          setMpStatus(mp as MpStatus);
        }
        if (conn === "ONLINE" || conn === "OFFLINE") {
          setConnectivity(conn as Connectivity);
        }
        if (email === "VERIFIED" || email === "UNVERIFIED") {
          setEmailStatus(email as EmailStatus);
        }
      } catch (err) {
        console.warn("Security bootstrap hydration error:", err);
      }
      setIsHydrated(true);
    })();
  }, [setAccountAccess, setMpStatus, setConnectivity, setEmailStatus]);

  // Check if we should lock on app start (cold start with existing session)
  useEffect(() => {
    if (isHydrated && isAuthenticated && !lockCheckedOnStart.current) {
      lockCheckedOnStart.current = true;
      (async () => {
        const isIOS = Platform.OS === "ios";
        const bioEnabled = isIOS
          ? await getIOSBiometricPrompt()
          : await getAndroidBiometricPrompt();
        const pin = isIOS ? await getDevicePin() : await getAndroidPin();

        if (bioEnabled || pin) {
          setIsLocked(true);
        }
      })();
    }
  }, [isHydrated, isAuthenticated, setIsLocked]);

  return { isHydrated };
}
