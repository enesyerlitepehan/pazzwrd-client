import * as SecureStore from "expo-secure-store";
import { hashPin, verifyPinWithMaterial, type PinMaterial } from "./pinCrypto";
import { AsyncStorage, getUserPrefix } from "./userScopedStorage";

const SECURE_ANDROID_PIN = "SecureAndroidPin";
const SECURE_DEVICE_PIN = "SecureDevicePin";

export async function getAndroidBiometricPrompt(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem("AndroidBiometricPrompt");
    if (v === null || v === undefined) return false;
    return v === "true";
  } catch {
    return false;
  }
}
export async function setAndroidBiometricPrompt(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem("AndroidBiometricPrompt", enabled ? "true" : "false");
  } catch {}
}
export async function clearAndroidBiometricPrompt(): Promise<void> {
  try {
    await AsyncStorage.removeItem("AndroidBiometricPrompt");
  } catch {}
}

export async function getIOSBiometricPrompt(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem("IOSBiometricPrompt");
    if (v === null || v === undefined) return false;
    return v === "true";
  } catch {
    return false;
  }
}
export async function setIOSBiometricPrompt(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem("IOSBiometricPrompt", enabled ? "true" : "false");
  } catch {}
}
export async function clearIOSBiometricPrompt(): Promise<void> {
  try {
    await AsyncStorage.removeItem("IOSBiometricPrompt");
  } catch {}
}

export async function getAndroidPin(): Promise<string | null> {
  // Check for secure hashed PIN first
  try {
    const prefix = await getUserPrefix();
    if (prefix) {
      const securePinStr = await SecureStore.getItemAsync(prefix + SECURE_ANDROID_PIN);
      if (securePinStr) {
        return "SET_SECURE";
      }
    }
  } catch {}

  // Fallback to legacy plaintext PIN for migration
  try {
    const pin = await AsyncStorage.getItem("AndroidPin");
    return pin ?? null;
  } catch {
    return null;
  }
}
export async function setAndroidPin(pin: string): Promise<void> {
  try {
    const prefix = await getUserPrefix();
    if (!prefix) return;

    const material = await hashPin(pin);
    await SecureStore.setItemAsync(prefix + SECURE_ANDROID_PIN, JSON.stringify(material));

    // Clear legacy plaintext if it exists
    await AsyncStorage.removeItem("AndroidPin");
  } catch {}
}
export async function verifyAndroidPin(pin: string): Promise<boolean> {
  try {
    const prefix = await getUserPrefix();
    if (!prefix) return false;

    // Try secure storage first
    const securePinStr = await SecureStore.getItemAsync(prefix + SECURE_ANDROID_PIN);
    if (securePinStr) {
      const material: PinMaterial = JSON.parse(securePinStr);
      return await verifyPinWithMaterial(pin, material);
    }

    // Fallback to legacy migration
    const legacyPin = await AsyncStorage.getItem("AndroidPin");
    if (legacyPin && legacyPin === pin) {
      // Migrate on successful verification
      await setAndroidPin(pin);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
export async function clearAndroidPin(): Promise<void> {
  try {
    const prefix = await getUserPrefix();
    if (prefix) {
      await SecureStore.deleteItemAsync(prefix + SECURE_ANDROID_PIN);
    }
    await AsyncStorage.removeItem("AndroidPin");
  } catch {}
}

export async function getDevicePin(): Promise<string | null> {
  // Check for secure hashed PIN first
  try {
    const prefix = await getUserPrefix();
    if (prefix) {
      const securePinStr = await SecureStore.getItemAsync(prefix + SECURE_DEVICE_PIN);
      if (securePinStr) {
        return "SET_SECURE";
      }
    }
  } catch {}

  // Fallback to legacy plaintext PIN for migration
  try {
    const pin = await AsyncStorage.getItem("DevicePin");
    return pin ?? null;
  } catch {
    return null;
  }
}
export async function setDevicePin(pin: string): Promise<void> {
  try {
    const prefix = await getUserPrefix();
    if (!prefix) return;

    const material = await hashPin(pin);
    await SecureStore.setItemAsync(prefix + SECURE_DEVICE_PIN, JSON.stringify(material));

    // Clear legacy plaintext if it exists
    await AsyncStorage.removeItem("DevicePin");
  } catch {}
}
export async function verifyDevicePin(pin: string): Promise<boolean> {
  try {
    const prefix = await getUserPrefix();
    if (!prefix) return false;

    // Try secure storage first
    const securePinStr = await SecureStore.getItemAsync(prefix + SECURE_DEVICE_PIN);
    if (securePinStr) {
      const material: PinMaterial = JSON.parse(securePinStr);
      return await verifyPinWithMaterial(pin, material);
    }

    // Fallback to legacy migration
    const legacyPin = await AsyncStorage.getItem("DevicePin");
    if (legacyPin && legacyPin === pin) {
      // Migrate on successful verification
      await setDevicePin(pin);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
export async function clearDevicePin(): Promise<void> {
  try {
    const prefix = await getUserPrefix();
    if (prefix) {
      await SecureStore.deleteItemAsync(prefix + SECURE_DEVICE_PIN);
    }
    await AsyncStorage.removeItem("DevicePin");
  } catch {}
}
