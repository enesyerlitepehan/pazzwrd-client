// pazzwrd/utils/navigationGuard.ts
import NetInfo from "@react-native-community/netinfo";
import type { NavigationContainerRef } from "@react-navigation/native";
import { Platform } from "react-native";

import { apiGetMpStatus } from "../api/api";
import { getDEK } from "../store/auth-context";
import { RootStackParamList } from "../navigation/types";
import type {
  AccountAccess,
  MpStatus,
  EmailStatus,
  // New tri-state for fingerprint setup flow
  BiometricStatus,
  PinStatus,
} from "../types/security";

import { isBiometricAvailable } from "./biometricLogin";
import {
  fetchRemoteWrapInfo,
  getLocalWrapVersion,
  setLocalWrapMeta,
  setLocalWrapVersion,
} from "./dekWrapVersion";
import { toastBus } from "./toastBus";
import { getItem as getUserItem } from "./userScopedStorage";

const GUARD_SCREENS = new Set<string>([
  // Auth screens
  "Login",
  "SignUp",
  "ForgotPasswordMethods",
  "ForgotPasswordEmail",
  "ForgotPasswordPhoneNumber",
  "OTPVerification",
  "CreateNewPassword",
  // Security/first-login flow screens
  "MasterPassword",
  "FingerPrint",
  "FaceID",
  "CreateNewPin",
  // Confirmation screen for re-auth with MP (avoid guard loop)
  "ConfirmMasterPassword",
]);

export function shouldSkipGuard(routeName?: string) {
  if (!routeName) return true;
  return GUARD_SCREENS.has(routeName);
}

function decideBiometricDestination(): "FingerPrint" | "FaceID" | "CreateNewPin" {
  if (Platform.OS === "android") return "FingerPrint";
  if (Platform.OS === "ios") return "FaceID";
  return "CreateNewPin";
}

export async function runSecurityGate(
  navRef: NavigationContainerRef<RootStackParamList>,
  accountAccess: AccountAccess,
  mpStatus: MpStatus,
  emailStatus: EmailStatus,
  checkAuth: () => boolean,
  syncMpStatus?: (status: MpStatus) => Promise<void> | void,
) {
  const gateCheck = () => {
    if (!navRef.isReady() || !checkAuth()) return false;
    return true;
  };

  try {
    if (!gateCheck()) return;
    const route = navRef.getCurrentRoute();
    const current = route?.name;

    if (shouldSkipGuard(current)) return;

    // 1) Require master password setup based on account mode
    const isOfflineMode = await isOffline();
    if (!gateCheck()) return;
    console.log("isOfflineMode", isOfflineMode);
    console.log("accountAccess", accountAccess);
    console.log("mpStatus", mpStatus);
    console.log("emailStatus", emailStatus);

    // Require email verification if unverified and online
    /*if (emailStatus === "UNVERIFIED" && !isOfflineMode) {
      if (!gateCheck()) return;
      navRef.navigate("OTPVerification");
      return;
    }*/

    if ((mpStatus === "NONE" || mpStatus === "PENDING") && !isOfflineMode) {
      try {
        const remoteMpStatus = await apiGetMpStatus();
        if (!gateCheck()) return;
        const normalizedRemote =
          remoteMpStatus?.data?.mpStatus === "SET"
            ? "CONFIGURED"
            : remoteMpStatus?.data?.mpStatus === null
              ? "NONE"
              : remoteMpStatus?.data?.mpStatus;

        if (
          normalizedRemote === "NONE" ||
          normalizedRemote === "CONFIGURED" ||
          normalizedRemote === "SKIPPED"
        ) {
          if (normalizedRemote !== mpStatus) {
            await syncMpStatus?.(normalizedRemote);
            if (!gateCheck()) return;
          }

          if (normalizedRemote === "CONFIGURED") {
            const remoteDek = await getDEK().catch(() => null);
            if (!gateCheck()) return;
            if (!remoteDek) {
              navRef.navigate("ConfirmMasterPassword");
              return;
            }
          }

          if (normalizedRemote === "SKIPPED" || normalizedRemote === "CONFIGURED") {
            // Reconciled with server; do not continue down the create-MP path.
            return;
          }
        }
      } catch {}

      // Bootstrap writes the DEK locally before security-context state fully re-renders.
      // If a DEK already exists, avoid bouncing the user back onto MasterPassword during
      // that brief synchronization window and continue with the rest of the onboarding gate.
      const localDek = await getDEK().catch(() => null);
      if (!gateCheck()) return;
      if (!localDek) {
        navRef.navigate("MasterPassword");
        return;
      }
    }

    // ConfirmMasterPassword: if MP is configured but local DEK missing, ask user to confirm MP
    // Also: if remote wrapGeneration is ahead of local and DEK is missing, force confirm.
    if (mpStatus === "CONFIGURED") {
      try {
        const dek = await getDEK();
        if (!gateCheck()) return;
        // First, try a version check against server (best-effort)
        try {
          if (!gateCheck()) return;
          const [localVerMaybe, remote] = await Promise.all([
            getLocalWrapVersion(),
            fetchRemoteWrapInfo(),
          ]);
          if (!gateCheck()) return;
          const localVer = localVerMaybe ?? 0;
          const remoteVer = remote?.wrapGeneration ?? null;
          if (typeof remoteVer === "number" && Number.isFinite(remoteVer)) {
            if (remoteVer > localVer) {
              if (dek) {
                // We already have DEK; accept remote wrap meta and bump local version
                if (remote.meta) await setLocalWrapMeta(remote.meta);
                if (!gateCheck()) return;
                await setLocalWrapVersion(remoteVer);
                if (!gateCheck()) return;
                // Surface a small toast to inform user about background update
                try {
                  // TODO what is this log?
                  toastBus.show("Security settings updated on another device. Synced.");
                } catch {}
              } else {
                if (!gateCheck()) return;
                navRef.navigate("ConfirmMasterPassword");
                return;
              }
            }
          }
        } catch {}
        // Finally, if no DEK at all, still require MP confirm
        if (!dek) {
          if (!gateCheck()) return;
          navRef.navigate("ConfirmMasterPassword");
          return;
        }
      } catch {}
    }

    // 2) Biometric tri-state flows
    //    Replace old isFirstLogin logic with user-scoped flags.
    //    Android: security.fingerprintStatus; iOS: security.faceidstatus.
    try {
      if (Platform.OS === "android") {
        const raw = await getUserItem("security.fingerprintStatus");
        if (!gateCheck()) return;
        const fpStatus: BiometricStatus =
          raw === "CONFIGURED" || raw === "SKIPPED" || raw === "NONE"
            ? (raw as BiometricStatus)
            : "NONE";
        const pinRaw = await getUserItem("security.pinstatus");
        if (!gateCheck()) return;
        const pinStatus: PinStatus =
          pinRaw === "CONFIRMED" || pinRaw === "SKIPPED" || pinRaw === "NONE"
            ? (pinRaw as PinStatus)
            : "NONE";

        if (fpStatus === "SKIPPED") {
          if (pinStatus === "NONE") {
            if (!gateCheck()) return;
            navRef.navigate("CreateNewPin");
          }
          return;
        }

        if (fpStatus === "NONE") {
          const bio = await isBiometricAvailable();
          if (!gateCheck()) return;
          if (bio.supported && bio.enrolled) {
            if (!gateCheck()) return;
            navRef.navigate("FingerPrint");
          } else {
            if (pinStatus === "NONE") {
              if (!gateCheck()) return;
              navRef.navigate("CreateNewPin");
            }
          }
          return;
        }
      }
      if (Platform.OS === "ios") {
        const raw = await getUserItem("security.faceidstatus");
        if (!gateCheck()) return;
        const faceStatus: BiometricStatus =
          raw === "CONFIGURED" || raw === "SKIPPED" || raw === "NONE"
            ? (raw as BiometricStatus)
            : "NONE";
        const pinRaw = await getUserItem("security.pinstatus");
        if (!gateCheck()) return;
        const pinStatus: PinStatus =
          pinRaw === "CONFIRMED" || pinRaw === "SKIPPED" || pinRaw === "NONE"
            ? (pinRaw as PinStatus)
            : "NONE";
        if (faceStatus === "SKIPPED") {
          if (pinStatus === "NONE") {
            if (!gateCheck()) return;
            navRef.navigate("CreateNewPin");
          }
          return;
        }

        if (faceStatus === "NONE") {
          const bio = await isBiometricAvailable();
          if (!gateCheck()) return;
          if (bio.supported && bio.enrolled) {
            if (!gateCheck()) return;
            navRef.navigate("FaceID");
          } else {
            if (pinStatus === "NONE") {
              if (!gateCheck()) return;
              navRef.navigate("CreateNewPin");
            }
          }
          return;
        }
      }
    } catch {}
  } catch {
    // no-op (optional: log)
  }
}

async function isOffline(): Promise<boolean> {
  try {
    const net = await NetInfo.fetch();
    return net.isConnected === false || net.isInternetReachable === false;
  } catch {
    return false;
  }
}
