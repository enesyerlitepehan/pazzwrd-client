import { useNavigation } from "expo-router";
import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Keyboard } from "react-native";
import { OtpInput } from "react-native-otp-entry";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native-virtualized-view";

import Button from "../components/Button";
import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";
import { setItem as setUserItem } from "../utils/userScopedStorage";

type Nav = {
  navigate: (value: string) => void;
};

// Create your unique pin screen
const CreateNewPin = () => {
  const { navigate } = useNavigation<Nav>();
  const { colors, dark } = useTheme();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [otpKey, setOtpKey] = useState(0);
  const [isMatch, setIsMatch] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalOnAction, setModalOnAction] = useState<(() => void) | undefined>(undefined);
  const authCtx = useContext(AuthContext);

  const showAlert = (title: string, message: string, onAction?: () => void) => {
    setModalTitle(title);
    setModalMsg(message);
    setModalOnAction(() => onAction);
    setModalVisible(true);
  };

  const handleOtpFilled = (text: string) => {
    // Freeze if already matched to avoid duplicate confirms after Alert dismiss
    if (isMatch) return;

    if (step === "create") {
      setFirstPin(text);
      setStep("confirm");
      setIsMatch(false);
      setOtpKey((k) => k + 1);
    } else {
      if (firstPin === text) {
        // Set match first so input gets frozen immediately
        setIsMatch(true);
        Keyboard.dismiss();
        showAlert("", "PINs match. You can now continue.", () => handleContinue(text));
      } else {
        showAlert("", "PINs don’t match. Try again.");
        setFirstPin(null);
        setStep("create");
        setIsMatch(false);
        setOtpKey((k) => k + 1);
      }
    }
  };

  const handleContinue = async (pin?: string) => {
    const isExplicitPin = typeof pin === "string";
    const pinToUse = isExplicitPin ? pin : firstPin;
    if (!pinToUse || (!isExplicitPin && !isMatch)) return;
    try {
      // Persist PIN status as confirmed (user-scoped)
      await setUserItem("security.pinstatus", "CONFIRMED");
      // Optionally, persist PIN itself for device unlock in future (kept intact if needed)
      try {
        await authCtx.setDevicePin(pinToUse);
      } catch {}
    } catch {}
    // Navigate to the Tab navigator so the bottom tabs remain visible
    navigate("TabLayout");
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Create New PIN" />
        <ScrollView contentContainerStyle={styles.center}>
          <Text
            style={[
              styles.title,
              {
                color: dark ? COLORS.white : COLORS.greyscale900,
              },
            ]}
          >
            {step === "create"
              ? "Add a PIN number to make your account more secure."
              : isMatch
                ? "Your PIN confirmed, You can now continue."
                : "Confirm your PIN."}
          </Text>
          <View pointerEvents={step === "confirm" && isMatch ? "none" : "auto"}>
            <OtpInput
              key={otpKey}
              numberOfDigits={4}
              focusColor={COLORS.primary}
              focusStickBlinkingDuration={500}
              blurOnFilled={false}
              disabled={step === "confirm" && isMatch}
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
        </ScrollView>
      </View>
      <View style={styles.bottomContainer}>
        <Button
          title="Skip"
          style={{
            width: (SIZES.width - 32) / 2 - 8,
            borderRadius: 32,
            backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
            borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
          }}
          textColor={dark ? COLORS.white : COLORS.black}
          onPress={async () => {
            try {
              await setUserItem("security.pinstatus", "SKIPPED");
            } catch {}
            navigate("TabLayout");
          }}
        />
        <ButtonFilled
          title="Continue"
          style={styles.continueButton}
          disabled={!isMatch}
          onPress={handleContinue}
        />
      </View>
      <LoadingModal
        visible={modalVisible}
        message={modalMsg}
        titleKey={modalTitle}
        resultMode={true}
        showActionButton={true}
        onAction={() => {
          setModalVisible(false);
          if (modalOnAction) modalOnAction();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginVertical: 64,
  },
  OTPStyle: {
    borderRadius: 8,
    height: 58,
    width: 58,
    backgroundColor: COLORS.secondaryWhite,
    borderBottomColor: "gray",
    borderBottomWidth: 0.4,
    borderWidth: 0.4,
    borderColor: "gray",
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    justifyContent: "center",
  },
  code: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.greyscale900,
    textAlign: "center",
  },
  time: {
    fontFamily: "medium",
    fontSize: 18,
    color: COLORS.primary,
  },
  button: {
    borderRadius: 32,
    marginVertical: 72,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    marginBottom: 144,
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 24,
  },
  continueButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
  },
});

export default CreateNewPin;
