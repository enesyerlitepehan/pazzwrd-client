import { CONFIG } from "../utils/config";

// RevenueCat public SDK keys must be supplied via env for open-source/fork-safe builds.
export const RC_IOS_API_KEY = CONFIG.revenueCat.iosApiKey;
export const RC_ANDROID_API_KEY = CONFIG.revenueCat.androidApiKey;

// Default offering identifier used in RevenueCat dashboard
export const RC_DEFAULT_OFFERING_ID = CONFIG.revenueCat.defaultOfferingId;

export const RC_PRODUCT_IDS = {
  PRO_MONTHLY: CONFIG.revenueCat.productIds.proMonthly,
  PRO_YEARLY: CONFIG.revenueCat.productIds.proYearly,
  FAMILY_MONTHLY: CONFIG.revenueCat.productIds.familyMonthly,
  FAMILY_YEARLY: CONFIG.revenueCat.productIds.familyYearly,
} as const;

// Entitlement identifiers as configured in RevenueCat
export const RC_ENTITLEMENT_PRO = "pro";
export const RC_ENTITLEMENT_FAMILY = "family";

// Map RevenueCat entitlement -> server PremiumPlan.code
export const RC_ENTITLEMENT_TO_PLAN: Record<string, string> = {
  [RC_ENTITLEMENT_PRO]: "PAZZPRO",
  [RC_ENTITLEMENT_FAMILY]: "PAZZFAMILY",
};

// Optional: package identifiers you plan to use (if you rely on identifiers instead of packageType)
export const RC_PACKAGE_MONTHLY = "monthly"; // e.g. in RC: monthly
export const RC_PACKAGE_YEARLY = "annual"; // e.g. in RC: annual

export const RC_APP_DIAGNOSTIC_LOGS = CONFIG.revenueCat.appDiagnosticLogs;
export const RC_SDK_DEBUG_LOGS = CONFIG.revenueCat.sdkDebugLogs;
