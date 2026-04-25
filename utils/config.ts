// Central config module for API and sync policies.
// IMPORTANT: Expo only inlines EXPO_PUBLIC_* with direct property access.
// Do not use dynamic `process.env[name]` lookups here.

const requireString = (value: string | undefined, name: string): string => {
  if (value !== undefined && value !== null && value !== "") return String(value);
  throw new Error(
    `Missing required env var: ${name}. Ensure it exists in .env/.env.production for this build.`,
  );
};

const requireNumber = (value: string | undefined, name: string): number => {
  const str = requireString(value, name);
  const parsed = Number(str);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric env var: ${name}`);
  }
  return parsed;
};

const optionalString = (value: string | undefined): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
};

const optionalBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
};

export const CONFIG = {
  apiURL: requireString(process.env.EXPO_PUBLIC_API_URL, "EXPO_PUBLIC_API_URL"),
  sync: {
    batchSize: requireNumber(
      process.env.EXPO_PUBLIC_SYNC_BATCH_SIZE,
      "EXPO_PUBLIC_SYNC_BATCH_SIZE",
    ),
    maxRetries: requireNumber(
      process.env.EXPO_PUBLIC_SYNC_MAX_RETRIES,
      "EXPO_PUBLIC_SYNC_MAX_RETRIES",
    ),
    baseDelayMs: requireNumber(
      process.env.EXPO_PUBLIC_SYNC_BASE_DELAY_MS,
      "EXPO_PUBLIC_SYNC_BASE_DELAY_MS",
    ),
    jitterMs: requireNumber(process.env.EXPO_PUBLIC_SYNC_JITTER_MS, "EXPO_PUBLIC_SYNC_JITTER_MS"),
    circuitWindowMs: requireNumber(
      process.env.EXPO_PUBLIC_SYNC_CIRCUIT_WINDOW_MS,
      "EXPO_PUBLIC_SYNC_CIRCUIT_WINDOW_MS",
    ),
    circuitErrorThreshold: requireNumber(
      process.env.EXPO_PUBLIC_SYNC_CIRCUIT_ERROR_THRESHOLD,
      "EXPO_PUBLIC_SYNC_CIRCUIT_ERROR_THRESHOLD",
    ),
    circuitCooldownMs: requireNumber(
      process.env.EXPO_PUBLIC_SYNC_CIRCUIT_COOLDOWN_MS,
      "EXPO_PUBLIC_SYNC_CIRCUIT_COOLDOWN_MS",
    ),
  },
  loadingTimeout: requireNumber(
    process.env.EXPO_PUBLIC_LOADING_TIMEOUT,
    "EXPO_PUBLIC_LOADING_TIMEOUT",
  ),
  auth: {
    google: {
      iosClientId: optionalString(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
      androidClientId: optionalString(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
      webClientId: optionalString(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
    },
  },
  revenueCat: {
    iosApiKey: optionalString(process.env.EXPO_PUBLIC_RC_IOS_API_KEY),
    androidApiKey: optionalString(process.env.EXPO_PUBLIC_RC_ANDROID_API_KEY),
    defaultOfferingId: optionalString(process.env.EXPO_PUBLIC_RC_DEFAULT_OFFERING_ID) || "default",
    productIds: {
      proMonthly:
        optionalString(process.env.EXPO_PUBLIC_RC_PRODUCT_PRO_MONTHLY) ||
        "com.example.app.pro.monthly",
      proYearly:
        optionalString(process.env.EXPO_PUBLIC_RC_PRODUCT_PRO_YEARLY) ||
        "com.example.app.pro.yearly",
      familyMonthly:
        optionalString(process.env.EXPO_PUBLIC_RC_PRODUCT_FAMILY_MONTHLY) ||
        "com.example.app.family.monthly",
      familyYearly:
        optionalString(process.env.EXPO_PUBLIC_RC_PRODUCT_FAMILY_YEARLY) ||
        "com.example.app.family.yearly",
    },
    appDiagnosticLogs: optionalBoolean(process.env.EXPO_PUBLIC_RC_APP_DIAGNOSTIC_LOGS, false),
    sdkDebugLogs: optionalBoolean(process.env.EXPO_PUBLIC_RC_SDK_DEBUG_LOGS, false),
  },
};
