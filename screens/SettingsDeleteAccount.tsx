import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useContext, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiResult } from "../api/api";
import Button from "../components/Button";
import Header from "../components/Header";
import InputWithTooltip from "../components/InputWithTooltip";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";

const SettingsDeleteAccount = () => {
  const { t } = useTranslation("common");
  const { dark, colors } = useTheme();
  const navigation = useNavigation();
  const authCtx = useContext(AuthContext);

  const [currentPassword, setCurrentPassword] = useState("");
  const [hidePassword, setHidePassword] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfirmMode, setModalConfirmMode] = useState(false);
  const [modalResultMode, setModalResultMode] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  const resolveDeleteAccountErrorMessage = useCallback(
    (response: ApiResult<any> | undefined) => {
      const code = response?.code;
      if (code === "INVALID_CREDENTIALS") {
        return t("settings.deleteAccount.invalidCredentials");
      }
      if (code === "PASSWORD_CONFIRMATION_UNAVAILABLE") {
        return t("settings.deleteAccount.passwordConfirmationUnavailable");
      }
      if (code === "USER_NOT_FOUND") {
        return t("settings.deleteAccount.userNotFound");
      }
      if (code === "UNAUTHORIZED") {
        return t("settings.deleteAccount.unauthorized");
      }
      return response?.message || t("settings.deleteAccount.error");
    },
    [t],
  );

  const canSubmit = useMemo(() => {
    return !isDeleting && currentPassword.trim().length > 0;
  }, [isDeleting, currentPassword]);

  const onInputChanged = useCallback((id: string, text: string) => {
    if (id === "currentPassword") setCurrentPassword(text);
  }, []);

  const closeModal = useCallback(() => {
    if (isDeleting) return;
    setModalVisible(false);
    setModalConfirmMode(false);
    setModalResultMode(false);
  }, [isDeleting]);

  const startDeleteFlow = useCallback(() => {
    if (!currentPassword.trim()) {
      setModalTitle("alerts.validationTitle");
      setModalMessage(t("settings.deleteAccount.passwordRequired"));
      setModalVisible(true);
      setModalConfirmMode(false);
      setModalResultMode(true);
      return;
    }

    setModalTitle("settings.deleteAccount.confirmTitle");
    setModalMessage(t("settings.deleteAccount.confirmMessage"));
    setModalVisible(true);
    setModalConfirmMode(true);
    setModalResultMode(false);
  }, [currentPassword, t]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      setIsDeleting(true);
      setModalConfirmMode(false);
      setModalResultMode(false);
      setModalTitle(undefined);
      setModalMessage(t("loading.default"));
      setModalVisible(true);

      const response = await authCtx.deleteAccount(currentPassword.trim());
      if (response?.status === 200) {
        setModalVisible(false);
        setCurrentPassword("");
        return;
      }

      setModalTitle("alerts.errorTitle");
      setModalMessage(resolveDeleteAccountErrorMessage(response));
      setModalConfirmMode(false);
      setModalResultMode(true);
      setModalVisible(true);
    } catch {
      setModalTitle("alerts.errorTitle");
      setModalMessage(t("settings.deleteAccount.error"));
      setModalConfirmMode(false);
      setModalResultMode(true);
      setModalVisible(true);
    } finally {
      setIsDeleting(false);
    }
  }, [authCtx, currentPassword, resolveDeleteAccountErrorMessage, t]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("settings.deleteAccount.title")} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <Text style={[styles.warningTitle, { color: dark ? COLORS.white : COLORS.black }]}>
            {t("settings.deleteAccount.warningTitle")}
          </Text>
          <Text
            style={[
              styles.warningText,
              { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 },
            ]}
          >
            {t("settings.deleteAccount.warningBody")}
          </Text>
          <Text
            style={[
              styles.subscriptionText,
              { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 },
            ]}
          >
            {t("settings.deleteAccount.subscriptionNote")}
          </Text>

          <InputWithTooltip
            id="currentPassword"
            onInputChanged={onInputChanged}
            placeholder={t("settings.deleteAccount.passwordLabel")}
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            secureTextEntry={hidePassword}
            showVisibilityToggle
            onToggleVisibility={() => setHidePassword((prev) => !prev)}
            value={currentPassword}
          />
        </ScrollView>
      </View>

      <View style={styles.bottomContainer}>
        <Button
          title={t("common.cancel")}
          onPress={() => navigation.goBack()}
          style={[
            styles.secondaryButton,
            {
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
            },
          ]}
          textColor={dark ? COLORS.white : COLORS.black}
          disabled={isDeleting}
        />
        <Button
          title={t("settings.deleteAccount.action")}
          onPress={startDeleteFlow}
          filled
          color="#C62828"
          isLoading={isDeleting}
          disabled={!canSubmit}
          style={styles.deleteButton}
        />
      </View>

      <LoadingModal
        visible={modalVisible}
        message={modalMessage}
        titleKey={modalTitle}
        confirmMode={modalConfirmMode}
        resultMode={modalResultMode}
        showActionButton={modalResultMode}
        confirmLabel={t("settings.deleteAccount.confirmButton")}
        cancelLabel={t("common.cancel")}
        onCancel={closeModal}
        onAction={modalConfirmMode ? () => void handleDeleteAccount() : closeModal}
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
  scrollContent: {
    paddingBottom: 160,
  },
  warningTitle: {
    fontSize: 20,
    fontFamily: "bold",
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "regular",
    marginTop: 12,
    marginBottom: 8,
  },
  subscriptionText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "regular",
    marginBottom: 20,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 32,
    right: 16,
    left: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    width: SIZES.width - 32,
    alignItems: "center",
  },
  secondaryButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
  },
  deleteButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
    borderColor: "#C62828",
  },
});

export default SettingsDeleteAccount;
