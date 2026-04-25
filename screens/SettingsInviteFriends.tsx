import { Ionicons } from "@expo/vector-icons";
import { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import React, { useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiInviteFriends } from "../api/api";
import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import InputWithTooltip from "../components/InputWithTooltip";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES, icons } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateEmail } from "../utils/ValidationConstraints";

// Invite Friends
const SettingsInviteFriends = () => {
  type InviteResultItem = {
    email: string;
    code: "INVITE_SENT" | "INVITE_EXISTS" | "INVITE_FAILED" | string;
  };

  const navigation = useNavigation<NavigationProp<any>>();
  const { colors, dark } = useTheme();
  const { t } = useTranslation("common");
  const authCtx = useContext(AuthContext);

  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  // Loading Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [resultMode, setResultMode] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail === "") return;

    const error = validateEmail("email", trimmedEmail);
    if (!error) {
      if (!emails.includes(trimmedEmail)) {
        setEmails((prev) => [...prev, trimmedEmail]);
      }
      setEmailInput("");
      setEmailError(undefined);
    } else {
      setEmailError(error);
    }
  };

  const handleInputChange = (_: string, text: string) => {
    if (emailError) setEmailError(undefined);

    if (text.includes(",")) {
      const parts = text.split(",");
      // Process all but the last part
      const toAdd = parts.slice(0, -1);
      const remaining = parts[parts.length - 1];

      const newEmails = [...emails];
      toAdd.forEach((item) => {
        const trimmed = item.trim();
        if (trimmed && !validateEmail("email", trimmed)) {
          if (!newEmails.includes(trimmed)) {
            newEmails.push(trimmed);
          }
        }
      });

      setEmails(newEmails);
      setEmailInput(remaining);
    } else {
      setEmailInput(text);
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleSendInvitations = async () => {
    const finalEmails = [...emails];
    // If there's something in the input, try to validate and add it first
    if (emailInput.trim()) {
      const trimmedEmail = emailInput.trim();
      const error = validateEmail("email", trimmedEmail);
      if (!error) {
        if (!finalEmails.includes(trimmedEmail)) {
          finalEmails.push(trimmedEmail);
        }
        setEmailInput("");
        setEmailError(undefined);
      } else {
        setEmailError(error);
        return; // Don't proceed if input is invalid
      }
    }

    if (finalEmails.length === 0) return;

    setModalTitle(t("settings.sendInvitations"));
    setModalMessage(t("loading.default"));
    setResultMode(false);
    setModalVisible(true);

    try {
      const result = await apiInviteFriends(finalEmails);
      console.log("handleSendInvitations result:", result);
      if (result && result.ok) {
        const rawResults: InviteResultItem[] = Array.isArray(result.data)
          ? result.data.map((item: any) => ({
              email: String(item?.email || ""),
              code: String(item?.code || ""),
            }))
          : [];

        if (rawResults.length > 0) {
          const hasFailed = rawResults.some(
            (item: InviteResultItem) => item.code === "INVITE_FAILED",
          );
          const hasExists = rawResults.some(
            (item: InviteResultItem) => item.code === "INVITE_EXISTS",
          );
          const hasSent = rawResults.some((item: InviteResultItem) => item.code === "INVITE_SENT");

          if (hasFailed && !hasSent && !hasExists) {
            setModalTitle(t("alerts.errorTitle"));
          } else if (hasSent && !hasFailed && !hasExists) {
            setModalTitle(t("alerts.successTitle"));
          } else {
            setModalTitle(t("alerts.information"));
          }

          const lines = rawResults.map((item: InviteResultItem) => {
            const statusText =
              item.code === "INVITE_EXISTS"
                ? t("settings.inviteStatusExists")
                : item.code === "INVITE_FAILED"
                  ? t("settings.inviteStatusFailed")
                  : t("settings.inviteStatusSent");
            return item.email ? `• ${item.email}: ${statusText}` : `• ${statusText}`;
          });

          setModalMessage(lines.join("\n"));
          setResultMode(true);
          setEmails([]);
          return;
        }

        setModalTitle(t("alerts.successTitle"));
        setModalMessage(result.message || t("alerts.invitationsSent"));
        setResultMode(true);
        setEmails([]);
      } else {
        setModalTitle(t("alerts.errorTitle"));
        setModalMessage(result.message || t("errors.generic"));
        setResultMode(true);
      }
    } catch (error) {
      console.error("handleSendInvitations error:", error);
      setModalTitle(t("alerts.errorTitle"));
      setModalMessage(t("errors.generic"));
      setResultMode(true);
    }
  };

  /**
   * Render header
   */
  const renderHeader = () => {
    return <Header title={t("settings.inviteFriends")} />;
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <Text
            style={[
              styles.description,
              { color: dark ? COLORS.grayscale400 : COLORS.greyscale600 },
            ]}
          >
            {t("settings.inviteFriendsDescription")}
          </Text>

          <View style={styles.tagContainer}>
            {emails.map((email) => (
              <View
                key={email}
                style={[
                  styles.tag,
                  {
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
                    borderColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                  },
                ]}
              >
                <Text
                  style={[styles.tagText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
                >
                  {email}
                </Text>
                <TouchableOpacity onPress={() => removeEmail(email)}>
                  <Ionicons name="close-circle" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <InputWithTooltip
            id="emailInput"
            onInputChanged={handleInputChange}
            placeholder={t("settings.inviteFriendsPlaceholder")}
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            value={emailInput}
            keyboardType="email-address"
            autoCapitalize="none"
            label={t("settings.inviteFriendsLabel")}
            showPlusIcon={true}
            onPlusPress={() => addEmail(emailInput)}
            errorText={emailError ? [emailError] : undefined}
          />

          <ButtonFilled
            title={t("settings.sendInvitations")}
            style={styles.button}
            onPress={handleSendInvitations}
            disabled={emails.length === 0 && !emailInput.trim()}
          />
        </ScrollView>
      </View>
      <LoadingModal
        visible={modalVisible}
        message={modalMessage}
        titleKey={modalTitle}
        resultMode={resultMode}
        showActionButton={resultMode}
        onAction={() => setModalVisible(false)}
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "bold",
    color: COLORS.black,
  },
  moreIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 16,
    paddingBottom: 32,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
    justifyContent: "center",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    marginRight: 6,
  },
  button: {
    marginTop: 24,
    width: SIZES.width - 32,
    borderRadius: 32,
  },
});

export default SettingsInviteFriends;
