import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Keyboard,
  Platform,
  SafeAreaView,
  AppState,
  AppStateStatus,
} from "react-native";
import { OtpInput } from "react-native-otp-entry";

import Button from "../components/Button";
import { COLORS, SIZES } from "../constants";
import { useSecurity } from "../store/security-context";
import { useTheme } from "../theme/ThemeProvider";
import { ensureBiometricAuth } from "../utils/biometricLogin";

import LoadingModal from "./ui/LoadingModal";

export const AppLock: React.FC = () => {
  const { colors, dark } = useTheme();
  const {
    isLocked,
    setLocked,
    getIOSBiometricPrompt,
    getAndroidBiometricPrompt,
    getDevicePin,
    getAndroidPin,
    verifyAndroidPin,
    verifyDevicePin,
  } = useSecurity();

  const [showPinInput, setShowPinInput] = useState(false);
  const [otpKey, setOtpKey] = useState(0);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const isAuthenticatingRef = useRef(false);

  const checkAndRunBiometrics = useCallback(async () => {
    if (isAuthenticatingRef.current) return;
    isAuthenticatingRef.current = true;

    // Reset fallback state before starting fresh biometric attempt
    setShowPinInput(false);
    setErrorVisible(false);

    try {
      const isIOS = Platform.OS === "ios";
      const isAndroid = Platform.OS === "android";

      let bioEnabled = false;
      if (isIOS) {
        bioEnabled = await getIOSBiometricPrompt();
      } else if (isAndroid) {
        bioEnabled = await getAndroidBiometricPrompt();
      }

      if (bioEnabled) {
        const result = await ensureBiometricAuth({
          promptMessage: isIOS ? "Authenticate with Face ID" : "Authenticate with Biometrics",
        });
        if (result.success) {
          setLocked(false);
          return;
        }
      }

      // If bio fails or not enabled, check for PIN
      const pin = isAndroid ? await getAndroidPin() : await getDevicePin();
      if (pin) {
        setShowPinInput(true);
      } else {
        // No PIN configured. If bio also failed or not available, unlock to avoid lockout
        setLocked(false);
      }
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, [getIOSBiometricPrompt, getAndroidBiometricPrompt, getAndroidPin, getDevicePin, setLocked]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (isLocked && appState === "active") {
      checkAndRunBiometrics();
    }
  }, [isLocked, appState, checkAndRunBiometrics]);

  // Reset stale PIN fallback state when a lock cycle completes successfully (isLocked becomes false)
  useEffect(() => {
    if (!isLocked) {
      setShowPinInput(false);
      setErrorVisible(false);
      setErrorMessage("");
      setOtpKey(0);
    }
  }, [isLocked]);

  const handleOtpFilled = async (text: string) => {
    const isAndroid = Platform.OS === "android";
    const success = isAndroid ? await verifyAndroidPin(text) : await verifyDevicePin(text);
    if (success) {
      setLocked(false);
    } else {
      setErrorMessage("Incorrect PIN. Please try again.");
      setErrorVisible(true);
      setOtpKey((k) => k + 1);
    }
  };

  if (!isLocked) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 9999 }]}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            App Locked
          </Text>
          <Text
            style={[styles.subtitle, { color: dark ? COLORS.greyscale300 : COLORS.greyscale600 }]}
          >
            {showPinInput ? "Enter your PIN to continue" : "Authenticating..."}
          </Text>

          {showPinInput && (
            <View style={styles.otpContainer}>
              <OtpInput
                key={otpKey}
                numberOfDigits={4}
                focusColor={COLORS.primary}
                focusStickBlinkingDuration={500}
                onFilled={handleOtpFilled}
                theme={{
                  pinCodeContainerStyle: {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite,
                    borderColor: dark ? COLORS.gray : COLORS.secondaryWhite,
                    borderWidth: 0.4,
                    borderRadius: 10,
                    height: 58,
                    width: 58,
                  },
                  pinCodeTextStyle: {
                    color: dark ? COLORS.white : COLORS.black,
                  },
                }}
              />
            </View>
          )}

          {!showPinInput && (
            <Button
              title="Retry Biometrics"
              onPress={checkAndRunBiometrics}
              style={styles.retryButton}
            />
          )}

          {showPinInput && (
            <Button
              title="Use Biometrics"
              onPress={checkAndRunBiometrics}
              style={styles.retryButton}
            />
          )}
        </View>
      </SafeAreaView>
      <LoadingModal
        visible={errorVisible}
        message={errorMessage}
        titleKey="Error"
        resultMode={true}
        showActionButton={true}
        onAction={() => setErrorVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "regular",
    marginBottom: 32,
    textAlign: "center",
  },
  otpContainer: {
    marginVertical: 24,
  },
  retryButton: {
    marginTop: 24,
    width: "100%",
    borderRadius: 32,
  },
});

export default AppLock;
