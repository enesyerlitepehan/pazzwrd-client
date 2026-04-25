import { Platform, Linking } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

import {
  RC_ANDROID_API_KEY,
  RC_IOS_API_KEY,
  RC_APP_DIAGNOSTIC_LOGS,
  RC_SDK_DEBUG_LOGS,
} from "../constants/revenuecat";

let configured = false;

export type RevenueCatErrorSummary = {
  code?: string;
  readableErrorCode?: string;
  message?: string;
  underlyingErrorMessage?: string;
  userCancelled?: boolean;
};

export type RevenueCatDiagnostics = {
  isConfigured: boolean;
  canMakePayments: boolean | null;
  packageIdentifier?: string | null;
  productIdentifier?: string | null;
  offeringIdentifier?: string | null;
};

function summarizeRevenueCatError(error: any): RevenueCatErrorSummary {
  return {
    code: error?.code ? String(error.code) : undefined,
    readableErrorCode: error?.readableErrorCode ? String(error.readableErrorCode) : undefined,
    message: error?.message ? String(error.message) : undefined,
    underlyingErrorMessage:
      error?.underlyingErrorMessage || error?.userInfo?.NSLocalizedDescription
        ? String(error?.underlyingErrorMessage || error?.userInfo?.NSLocalizedDescription)
        : undefined,
    userCancelled: error?.userCancelled === true,
  };
}

function logRevenueCat(label: string, payload?: unknown) {
  if (!RC_APP_DIAGNOSTIC_LOGS) return;
  if (payload === undefined) {
    console.log(`[RevenueCat] ${label}`);
    return;
  }
  console.log(`[RevenueCat] ${label}`, payload);
}

async function getRuntimeDiagnostics(pkg?: any): Promise<RevenueCatDiagnostics> {
  let isConfigured = configured;
  let canMakePayments: boolean | null = null;
  try {
    if (typeof (Purchases as any)?.isConfigured === "function") {
      isConfigured = !!(await (Purchases as any).isConfigured());
    }
  } catch {}
  try {
    if (typeof (Purchases as any)?.canMakePayments === "function") {
      canMakePayments = !!(await (Purchases as any).canMakePayments());
    }
  } catch {}
  return {
    isConfigured,
    canMakePayments,
    packageIdentifier: pkg?.identifier ? String(pkg.identifier) : null,
    productIdentifier:
      pkg?.product?.productIdentifier ||
      pkg?.product?.identifier ||
      pkg?.storeProduct?.productIdentifier ||
      pkg?.storeProduct?.identifier ||
      null,
    offeringIdentifier:
      pkg?.presentedOfferingContext?.offeringIdentifier ||
      pkg?.offeringIdentifier ||
      pkg?.packageOfferingIdentifier ||
      null,
  };
}

export async function configurePurchases(): Promise<{
  success: boolean;
  error?: RevenueCatErrorSummary;
}> {
  if (configured) return { success: true };
  try {
    if (RC_SDK_DEBUG_LOGS) {
      try {
        if (typeof Purchases.setLogLevel === "function") {
          // Prefer explicit log level API
          Purchases.setLogLevel(LOG_LEVEL?.DEBUG ?? (3 as any));
        } else if (typeof (Purchases as any).setDebugLogsEnabled === "function") {
          (Purchases as any).setDebugLogsEnabled(true);
        }
      } catch {}
    }
    const apiKey = Platform.OS === "ios" ? RC_IOS_API_KEY : RC_ANDROID_API_KEY;
    if (!apiKey) {
      const platformName = Platform.OS === "ios" ? "iOS" : "Android";
      const missingVar =
        Platform.OS === "ios" ? "EXPO_PUBLIC_RC_IOS_API_KEY" : "EXPO_PUBLIC_RC_ANDROID_API_KEY";
      const error = {
        code: "missing_revenuecat_public_key",
        message: `${platformName} RevenueCat SDK key is missing. Set ${missingVar} in your env.`,
      };
      logRevenueCat("configure skipped because public SDK key is missing", {
        platform: Platform.OS,
      });
      return { success: false, error };
    }
    if ((Purchases as any)?.configure) {
      await (Purchases as any).configure({ apiKey });
    } else if ((Purchases as any)?.setup) {
      // older API fallback
      await (Purchases as any).setup(apiKey);
    }
    configured = true;
    logRevenueCat("configured", { platform: Platform.OS });
    return { success: true };
  } catch (e) {
    const error = summarizeRevenueCatError(e);
    logRevenueCat("configure failed", error);
    return { success: false, error };
  }
}

export async function logIn(appUserId: string) {
  try {
    const result = await configurePurchases();
    if (!result.success) {
      logRevenueCat("login skipped because configure failed", result.error);
      return;
    }
    if (appUserId && Purchases?.logIn) {
      await Purchases.logIn(appUserId);
      logRevenueCat("logged in", { appUserId });
    }
  } catch (e) {
    logRevenueCat("login failed", summarizeRevenueCatError(e));
  }
}

export async function logOut() {
  try {
    const result = await configurePurchases();
    if (!result.success) return;
    if (Purchases?.logOut) await Purchases.logOut();
  } catch (e) {
    logRevenueCat("logout failed", summarizeRevenueCatError(e));
  }
}

export async function getOfferings(): Promise<any | null> {
  try {
    const result = await configurePurchases();
    if (!result.success) {
      logRevenueCat("getOfferings skipped because configure failed", result.error);
      return null;
    }
    const offerings = await Purchases.getOfferings();
    logRevenueCat("offerings loaded", {
      current: offerings?.current?.identifier || null,
      all: Array.isArray(offerings?.all)
        ? offerings.all.map((off: any) => off?.identifier)
        : offerings?.all
          ? Object.keys(offerings.all)
          : [],
      currentProducts:
        offerings?.current?.availablePackages?.map?.(
          (pkg: any) =>
            pkg?.product?.productIdentifier ||
            pkg?.product?.identifier ||
            pkg?.storeProduct?.productIdentifier ||
            pkg?.storeProduct?.identifier,
        ) || [],
    });
    return offerings ?? null;
  } catch (e) {
    logRevenueCat("getOfferings failed", summarizeRevenueCatError(e));
    return null;
  }
}

export async function purchasePackage(pkg: any): Promise<{
  success: boolean;
  customerInfo?: any;
  error?: RevenueCatErrorSummary;
  diagnostics?: RevenueCatDiagnostics;
}> {
  const diagnostics = await getRuntimeDiagnostics(pkg);
  try {
    const result = await configurePurchases();
    if (!result.success) {
      return {
        success: false,
        error: {
          ...result.error,
          message: result.error?.message || "RevenueCat configuration failed.",
        },
        diagnostics,
      };
    }
    if (diagnostics.canMakePayments === false) {
      return {
        success: false,
        error: {
          code: "payments_not_allowed",
          message: "This Apple account is not currently allowed to make purchases on this device.",
        },
        diagnostics,
      };
    }
    logRevenueCat("purchase started", diagnostics);
    const res = await Purchases.purchasePackage(pkg);
    logRevenueCat("purchase succeeded", diagnostics);
    return { success: true, customerInfo: res?.customerInfo ?? res, diagnostics };
  } catch (e: any) {
    const error = summarizeRevenueCatError(e);
    logRevenueCat("purchase failed", { error, diagnostics });
    return { success: false, error, diagnostics };
  }
}

export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: any;
  error?: any;
}> {
  try {
    const result = await configurePurchases();
    if (!result.success) {
      return { success: false, error: result.error };
    }
    const info = await Purchases.restorePurchases();
    return { success: true, customerInfo: info };
  } catch (e: any) {
    return { success: false, error: summarizeRevenueCatError(e) };
  }
}

export async function openManageSubscriptions(): Promise<void> {
  try {
    const result = await configurePurchases();
    if (!result.success) return;
    const info = await Purchases.getCustomerInfo();
    const url = info?.managementURL || (info as any)?.managementUrl; // API varies across versions
    if (url) await Linking.openURL(url);
  } catch {}
}

export async function getCustomerInfo(): Promise<any | null> {
  try {
    const result = await configurePurchases();
    if (!result.success) return null;
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}
