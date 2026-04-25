import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export type BiometricPlatform = "android" | "ios" | "unknown";

export type BiometricCheck = {
  supported: boolean;
  enrolled: boolean;
  canAuthenticate: boolean;
  platform: BiometricPlatform;
  error?: string;
  types?: LocalAuthentication.AuthenticationType[];
};

export type BiometricAuthResult = {
  success: boolean;
  platform: BiometricPlatform;
  warning?: string;
  error?: string;
  /** raw result from expo-local-authentication for debugging or extended handling */
  raw?: LocalAuthentication.LocalAuthenticationResult;
};

/**
 * Determine the current platform in a stable union type
 */
function getPlatform(): BiometricPlatform {
  if (Platform.OS === "android") return "android";
  if (Platform.OS === "ios") return "ios";
  return "unknown";
}

/**
 * Checks if biometric authentication is available and enrolled on this device.
 * On both Android and iOS we use expo-local-authentication for capability check.
 */
export async function isBiometricAvailable(): Promise<BiometricCheck> {
  const platform = getPlatform();
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    return {
      supported: hasHardware,
      enrolled: isEnrolled,
      canAuthenticate: hasHardware && isEnrolled,
      platform,
      types,
    };
  } catch (e: any) {
    return {
      supported: false,
      enrolled: false,
      canAuthenticate: false,
      platform,
      error: e?.message || "biometric check failed",
    };
  }
}

/**
 * Performs biometric authentication with platform-specific defaults.
 * You can override prompt messages via options if needed.
 */
export async function authenticateBiometric(options?: {
  promptMessage?: string;
  cancelLabel?: string; // Android/iOS may ignore depending on OS version
  fallbackLabel?: string; // iOS specific legacy label
  disableDeviceFallback?: boolean; // iOS specific
}): Promise<BiometricAuthResult> {
  const platform = getPlatform();

  try {
    const availability = await isBiometricAvailable();
    if (!availability.canAuthenticate) {
      return {
        success: false,
        platform,
        warning: !availability.supported
          ? "Biometric hardware not available on this device"
          : "No biometric enrolled on this device",
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:
        options?.promptMessage ||
        (platform === "android"
          ? "Authenticate to continue"
          : "Authenticate with Face ID / Touch ID"),
      cancelLabel: options?.cancelLabel,
      fallbackLabel: options?.fallbackLabel,
      disableDeviceFallback: options?.disableDeviceFallback,
    });

    if (result.success) {
      return { success: true, platform, raw: result };
    }

    return {
      success: false,
      platform,
      error: result.error || "Authentication failed",
      raw: result,
    };
  } catch (e: any) {
    return {
      success: false,
      platform,
      error: e?.message || "Authentication error",
    };
  }
}

/**
 * End-to-end helper: first checks platform and availability, then tries to authenticate.
 * This is the single entry point you can call from screens.
 */
export async function ensureBiometricAuth(options?: {
  promptMessage?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}): Promise<BiometricAuthResult> {
  // In the future, if Android diverges to a native BiometricPrompt path or iOS to different flow,
  // keep the branching here to route accordingly.
  const platform = getPlatform();

  // Platform-aware pre-checks or routing could go here
  // For now, both routes use expo-local-authentication with different default prompts
  return authenticateBiometric(options);
}
