// types/security.ts
// Access layer: cloud vs local-only
export type AccountAccess = "CLOUD" | "LOCAL_ONLY";

// Master Password lifecycle
export type MpStatus = "NONE" | "PENDING" | "CONFIGURED" | "SKIPPED";

// Optional email verification status (hook for future use)
export type EmailStatus = "VERIFIED" | "UNVERIFIED";

// Biometric/Fingerprint setup status (Android currently)
export type BiometricStatus = "NONE" | "CONFIGURED" | "SKIPPED";

// PIN setup status
export type PinStatus = "NONE" | "CONFIRMED" | "SKIPPED";

export type Connectivity = "ONLINE" | "OFFLINE";

export type Capabilities = {
  cloudSync: boolean;
  sharing: boolean;
  recovery: boolean;
  newDeviceUnlock: boolean;
};

export function deriveCapabilities(access: AccountAccess, mp: MpStatus): Capabilities {
  // Cloud özellikleri için hem erişim CLOUD olmalı hem de MP hazır olmalı.
  const cloudReady = access === "CLOUD";
  const mpReady = mp === "CONFIGURED";
  return {
    cloudSync: cloudReady && mpReady,
    sharing: cloudReady && mpReady,
    recovery: mpReady,
    newDeviceUnlock: mpReady,
  };
}
