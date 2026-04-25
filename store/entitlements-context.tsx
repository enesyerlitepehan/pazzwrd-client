import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEntitlementsQuery } from "../hooks/useEntitlementsQuery";
import { isOffline } from "../utils/network";
import { AsyncStorage } from "../utils/userScopedStorage";

import { AuthContext } from "./auth-context";
import { useSecurity } from "./security-context";

export type QuotaInfo = { used: number; max: number | null };
export type EntitlementsData = {
  emailVerified: boolean;
  mpConfigured: boolean;
  isPremium: boolean;
  subscriptionExpiresAt: string | null;
  subscriptionPlanCode: string | null;
  quotas: {
    password: QuotaInfo;
    card: QuotaInfo;
    share: QuotaInfo;
  };
} | null;

type AllowedResult = { allowed: boolean; reason?: string };

export type EntitlementsContextValue = {
  entitlements: EntitlementsData;
  refreshEntitlements: () => Promise<void>;
  canCreatePasswordCloud: () => AllowedResult;
  canCreateCardCloud: () => AllowedResult;
  canSharePassword: () => AllowedResult;
  // Auto-gating with on-demand server refresh and offline awareness
  canCreatePasswordCloudAuto: () => Promise<AllowedResult>;
  canCreateCardCloudAuto: () => Promise<AllowedResult>;
  canSharePasswordAuto: () => Promise<AllowedResult>;
};

const STORAGE_KEY = "entitlements";

const EntitlementsContext = createContext<EntitlementsContextValue | undefined>(undefined);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const authCtx = useContext(AuthContext);
  const { capabilities, emailStatus, mpStatus, setEmailStatus, setMpStatus } = useSecurity();
  const { t } = useTranslation("common");

  const { data: rawEntitlements, refetch: refetchEntitlements } = useEntitlementsQuery(
    authCtx.isAuthenticated,
  );

  const entitlements = useMemo<EntitlementsData>(() => rawEntitlements ?? null, [rawEntitlements]);

  const refreshEntitlementsData = useCallback(async (): Promise<EntitlementsData> => {
    const result = await refetchEntitlements();
    return result.data ?? null;
  }, [refetchEntitlements]);

  const refreshEntitlements = useCallback(async (): Promise<void> => {
    await refreshEntitlementsData();
  }, [refreshEntitlementsData]);

  // Sync security context with server flags when they differ
  useEffect(() => {
    if (entitlements) {
      (async () => {
        try {
          const desiredEmail = entitlements.emailVerified ? "VERIFIED" : "UNVERIFIED";
          if (desiredEmail !== emailStatus) {
            await setEmailStatus(desiredEmail);
          }
          const serverMpConfigured = entitlements.mpConfigured;
          if (serverMpConfigured && mpStatus !== "CONFIGURED") {
            await setMpStatus("CONFIGURED");
          } else if (!serverMpConfigured && mpStatus === "CONFIGURED") {
            await setMpStatus("NONE");
          }
        } catch (err) {
          // silent fail
        }
      })();
    }
  }, [entitlements, emailStatus, mpStatus, setEmailStatus, setMpStatus]);

  // Clear entitlements on logout
  useEffect(() => {
    if (!authCtx.isAuthenticated) {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, [authCtx.isAuthenticated]);

  const evaluatePasswordCloud = useCallback(
    (data: EntitlementsData): AllowedResult => {
      const isCloudReady = data ? data.emailVerified && data.mpConfigured : false;
      if (!isCloudReady || !data) {
        return {
          allowed: false,
          reason: t("alerts.cloudNotAllowed"),
        };
      }
      const q = data.quotas?.password;
      if (q && q.max != null && q.used >= q.max) {
        return {
          allowed: false,
          reason: t("alerts.passwordLimitReached"),
        };
      }
      return { allowed: true };
    },
    [t],
  );

  const evaluateCardCloud = useCallback(
    (data: EntitlementsData): AllowedResult => {
      const isCloudReady = data ? data.emailVerified && data.mpConfigured : false;
      if (!isCloudReady || !data) {
        return {
          allowed: false,
          reason: t("alerts.cloudNotAllowed"),
        };
      }
      const q = data.quotas?.card;
      if (q && q.max != null && q.used >= q.max) {
        return {
          allowed: false,
          reason: t("alerts.cardLimitReached"),
        };
      }
      return { allowed: true };
    },
    [t],
  );

  const evaluateSharePassword = useCallback(
    (data: EntitlementsData): AllowedResult => {
      const isSharingReady = data ? data.emailVerified && data.mpConfigured : false;
      if (!isSharingReady || !data) {
        return {
          allowed: false,
          reason: t("alerts.shareNotAllowed"),
        };
      }
      const q = data.quotas?.share;
      if (q && q.max != null && q.used >= q.max) {
        return {
          allowed: false,
          reason: t("alerts.shareLimitReached"),
        };
      }
      return { allowed: true };
    },
    [t],
  );

  const canCreatePasswordCloud = useCallback<() => AllowedResult>(
    () => evaluatePasswordCloud(entitlements),
    [evaluatePasswordCloud, entitlements],
  );

  const canCreateCardCloud = useCallback<() => AllowedResult>(
    () => evaluateCardCloud(entitlements),
    [evaluateCardCloud, entitlements],
  );

  const canSharePassword = useCallback<() => AllowedResult>(
    () => evaluateSharePassword(entitlements),
    [evaluateSharePassword, entitlements],
  );

  // Offline-aware, on-demand refresh wrappers
  const OFFLINE_REASON = t("alerts.offline");

  const canCreatePasswordCloudAuto = useCallback(async (): Promise<AllowedResult> => {
    const gate = canCreatePasswordCloud();
    if (gate.allowed && entitlements !== null) return gate;
    try {
      if (await isOffline()) return { allowed: false, reason: OFFLINE_REASON };
    } catch (err) {
      // silent fail
    }
    let freshData: EntitlementsData = null;
    try {
      freshData = await refreshEntitlementsData();
    } catch (err) {
      // silent fail
    }
    return evaluatePasswordCloud(freshData);
  }, [canCreatePasswordCloud, entitlements, refreshEntitlementsData, evaluatePasswordCloud]);

  const canCreateCardCloudAuto = useCallback(async (): Promise<AllowedResult> => {
    const gate = canCreateCardCloud();
    if (gate.allowed && entitlements !== null) return gate;
    try {
      if (await isOffline()) return { allowed: false, reason: OFFLINE_REASON };
    } catch (err) {
      // silent fail
    }
    let freshData: EntitlementsData = null;
    try {
      freshData = await refreshEntitlementsData();
    } catch (err) {
      // silent fail
    }
    return evaluateCardCloud(freshData);
  }, [canCreateCardCloud, entitlements, refreshEntitlementsData, evaluateCardCloud]);

  const canSharePasswordAuto = useCallback(async (): Promise<AllowedResult> => {
    const gate = canSharePassword();
    if (gate.allowed && entitlements !== null) return gate;
    try {
      if (await isOffline()) return { allowed: false, reason: OFFLINE_REASON };
    } catch (err) {
      // silent fail
    }
    let freshData: EntitlementsData = null;
    try {
      freshData = await refreshEntitlementsData();
    } catch (err) {
      // silent fail
    }
    return evaluateSharePassword(freshData);
  }, [canSharePassword, entitlements, refreshEntitlementsData, evaluateSharePassword]);

  const value = useMemo(
    () => ({
      entitlements,
      refreshEntitlements,
      canCreatePasswordCloud,
      canCreateCardCloud,
      canSharePassword,
      canCreatePasswordCloudAuto,
      canCreateCardCloudAuto,
      canSharePasswordAuto,
    }),
    [
      entitlements,
      refreshEntitlements,
      canCreatePasswordCloud,
      canCreateCardCloud,
      canSharePassword,
      canCreatePasswordCloudAuto,
      canCreateCardCloudAuto,
      canSharePasswordAuto,
    ],
  );

  return <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>;
}

export function useEntitlements(): EntitlementsContextValue {
  const ctx = useContext(EntitlementsContext);
  if (!ctx) throw new Error("useEntitlements must be used within an EntitlementsProvider");
  return ctx;
}
