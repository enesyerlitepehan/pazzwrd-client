import RNAsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "expo-router";
import React, { useState, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native-virtualized-view";

import Button from "../components/Button";
import GlobalSettingsItem from "../components/GlobalSettingsItem";
import Header from "../components/Header";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useSecurity } from "../store/security-context";
import { useTheme } from "../theme/ThemeProvider";

type Nav = {
  navigate: (value: string) => void;
};

// Settings for security purposes
const SettingsSecurity = () => {
  const { t } = useTranslation();
  const { navigate } = useNavigation<Nav>();
  const [isRememberMeEnabled, setIsRememberMeEnabled] = useState(true);
  const [isFaceIDEnabled, setIsFaceIDEnabled] = useState(false);
  const [isBiometricIDEnabled, setIsBiometricIDEnabled] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult, setModalResult] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMsg(message);
    setModalResult(true);
    setModalVisible(true);
  };
  const { colors, dark } = useTheme();
  const authCtx = useContext(AuthContext);
  const {
    emailStatus,
    getIOSBiometricPrompt,
    setIOSBiometricPrompt,
    getAndroidBiometricPrompt,
    setAndroidBiometricPrompt,
  } = useSecurity();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const remember = await RNAsyncStorage.getItem("rememberMe");
        setIsRememberMeEnabled(remember === "true");

        const faceId = await getIOSBiometricPrompt();
        setIsFaceIDEnabled(faceId);

        const bioId = await getAndroidBiometricPrompt();
        setIsBiometricIDEnabled(bioId);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, [getIOSBiometricPrompt, getAndroidBiometricPrompt]);

  const handleResendActivationEmail = async () => {
    setIsLoading(true);
    try {
      const response = await authCtx.resendActivationEmail();
      // console.log("Resend activation email response");
      if (response.status === 200) {
        showAlert("alerts.successTitle", t("security.resendEmailSuccess"));
      } else {
        showAlert("alerts.errorTitle", response.message || t("security.resendEmailError"));
      }
    } catch (error) {
      showAlert("alerts.errorTitle", t("alerts.unexpected"));
      // Resend activation email failed
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRememberMe = async () => {
    setIsLoading(true);
    try {
      const nextValue = !isRememberMeEnabled;
      await RNAsyncStorage.setItem("rememberMe", String(nextValue));
      setIsRememberMeEnabled(nextValue);
    } catch (error) {
      // Toggle remember me failed
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFaceID = async () => {
    setIsLoading(true);
    try {
      const nextValue = !isFaceIDEnabled;
      await setIOSBiometricPrompt(nextValue);
      setIsFaceIDEnabled(nextValue);
    } catch (error) {
      // Toggle FaceID failed
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBiometricID = async () => {
    setIsLoading(true);
    try {
      const nextValue = !isBiometricIDEnabled;
      await setAndroidBiometricPrompt(nextValue);
      setIsBiometricIDEnabled(nextValue);
    } catch (error) {
      // Toggle biometric failed
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("security.title")} />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <GlobalSettingsItem
            title={t("security.rememberMe")}
            isNotificationEnabled={isRememberMeEnabled}
            toggleNotificationEnabled={toggleRememberMe}
            disabled={true} // temporary disabled
          />
          <GlobalSettingsItem
            title={t("security.faceId")}
            isNotificationEnabled={isFaceIDEnabled}
            toggleNotificationEnabled={toggleFaceID}
            disabled={true} // temporary disabled
          />
          <GlobalSettingsItem
            title={t("security.biometricId")}
            isNotificationEnabled={isBiometricIDEnabled}
            toggleNotificationEnabled={toggleBiometricID}
            disabled={true} // temporary disabled
          />
          <Button
            title={t("security.changePin")}
            disabled={true} // temporary disabled
            style={{
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderRadius: 32,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              marginTop: 22,
            }}
            textColor={dark ? COLORS.white : COLORS.black}
            onPress={async () => {
              setIsLoading(true);
              // Small delay to show the modal as requested for "waiting response"
              await new Promise((resolve) => setTimeout(resolve, 600));
              setIsLoading(false);
              navigate("changepin");
            }}
          />
          <Button
            title={t("security.resendEmail")}
            disabled={emailStatus !== "UNVERIFIED"}
            style={{
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderRadius: 32,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              marginTop: 22,
            }}
            textColor={dark ? COLORS.white : COLORS.black}
            onPress={handleResendActivationEmail}
          />
          <Button
            title={t("settings.deleteAccount.menu")}
            style={{
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderRadius: 32,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              marginTop: 22,
            }}
            textColor={"#C62828"}
            onPress={() => navigate("SettingsDeleteAccount")}
          />
        </ScrollView>
      </View>
      <LoadingModal
        visible={isLoading || modalVisible}
        message={isLoading ? undefined : modalMsg}
        messageKey={isLoading ? "loading.default" : undefined}
        titleKey={isLoading ? undefined : modalTitle}
        resultMode={modalResult}
        showActionButton={modalResult}
        onAction={() => {
          setModalVisible(false);
          setModalResult(false);
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
    backgroundColor: COLORS.white,
    padding: 16,
  },
  scrollView: {
    marginVertical: 22,
  },
  arrowRight: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900,
  },
  view: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  viewLeft: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginRight: 8,
  },
  button: {
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 32,
    borderColor: COLORS.tansparentPrimary,
    marginTop: 22,
  },
});

export default SettingsSecurity;
