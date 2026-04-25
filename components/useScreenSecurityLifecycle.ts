import * as ScreenCapture from "expo-screen-capture";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

const BLUR_DURATION_MS = 1500;
const SCREEN_SECURITY_KEY = "pazzwrd-screen-security";

export function useScreenSecurityLifecycle(
  isAuthenticated: boolean,
  setLocked: (locked: boolean) => void,
) {
  const [showBlur, setShowBlur] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Screen Capture Prevention (Android & iOS)
  useEffect(() => {
    // Cross-platform prevention
    ScreenCapture.preventScreenCaptureAsync(SCREEN_SECURITY_KEY).catch(() => {});

    // iOS-specific App Switcher protection
    if (
      Platform.OS === "ios" &&
      typeof ScreenCapture.enableAppSwitcherProtectionAsync === "function"
    ) {
      ScreenCapture.enableAppSwitcherProtectionAsync().catch(() => {});
    }

    return () => {
      ScreenCapture.allowScreenCaptureAsync(SCREEN_SECURITY_KEY).catch(() => {});

      if (
        Platform.OS === "ios" &&
        typeof ScreenCapture.disableAppSwitcherProtectionAsync === "function"
      ) {
        ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      }

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  // On iOS, listen for screenshot events and show a temporary blur overlay
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const sub = ScreenCapture.addScreenshotListener(() => {
      try {
        // Show overlay immediately when screenshot is detected
        setShowBlur(true);
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = setTimeout(() => {
          setShowBlur(false);
          hideTimerRef.current = null;
        }, BLUR_DURATION_MS);
      } catch {
        // Ignored
      }
    });

    return () => {
      try {
        sub.remove();
      } catch {
        // Ignored
      }
    };
  }, []);

  // Handle app lock on background/foreground transitions
  useEffect(() => {
    const handleChange = (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        if (isAuthenticated) {
          setLocked(true);
        }
      }
    };

    const sub = AppState.addEventListener("change", handleChange);
    return () => {
      try {
        sub.remove();
      } catch {
        // Ignored
      }
    };
  }, [isAuthenticated, setLocked]);

  // On iOS, blur when app goes to background/inactive (e.g., app switcher)
  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const handleChange = (state: AppStateStatus) => {
      if (state !== "active") {
        setShowBlur(true);
      } else {
        // Only hide if there isn't an active screenshot blur timer
        if (!hideTimerRef.current) {
          setShowBlur(false);
        }
      }
    };

    // Initial check at mount
    try {
      const current = AppState.currentState;
      if (current && current !== "active") {
        setShowBlur(true);
      }
    } catch {
      // Ignored
    }

    const sub = AppState.addEventListener("change", handleChange);
    return () => {
      try {
        sub.remove();
      } catch {
        // Ignored
      }
    };
  }, []);

  return { showBlur };
}
