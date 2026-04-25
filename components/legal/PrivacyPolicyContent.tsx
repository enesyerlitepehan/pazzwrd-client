import React from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";

import { COLORS } from "../../constants";
import { useTheme } from "../../theme/ThemeProvider";

const PrivacyPolicyContent: React.FC = () => {
  const { t } = useTranslation("common");
  const { dark } = useTheme();

  const titleColor = dark ? COLORS.white : COLORS.black;
  const bodyColor = dark ? COLORS.secondaryWhite : COLORS.greyscale900;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.body, { color: bodyColor }]}>{t("settings.privacy.intro")}</Text>

      <Text style={[styles.sectionTitle, { color: titleColor }]}>
        {t("settings.privacy.masterPasswordTitle")}
      </Text>
      <Text style={[styles.body, { color: bodyColor }]}>
        {t("settings.privacy.masterPasswordDesc")}
      </Text>
      <Text style={[styles.body, { color: bodyColor, marginTop: 12 }]}>
        {t("settings.privacy.encryptionDetail")}
      </Text>

      <Text style={[styles.sectionTitle, { color: titleColor }]}>
        {t("settings.privacy.storageTitle")}
      </Text>
      <Text style={[styles.body, { color: bodyColor }]}>
        {t("settings.privacy.storageDesc")}
      </Text>
      <Text style={[styles.body, { color: bodyColor, marginTop: 12 }]}>
        • {t("settings.privacy.localStorage")}
      </Text>
      <Text style={[styles.body, { color: bodyColor, marginTop: 8 }]}>
        • {t("settings.privacy.cloudStorage")}
      </Text>

      <Text style={[styles.sectionTitle, { color: titleColor }]}>
        {t("settings.privacy.publicDataTitle")}
      </Text>
      <Text style={[styles.body, { color: bodyColor }]}>
        {t("settings.privacy.publicDataDesc")}
      </Text>
      <Text style={[styles.body, { color: bodyColor, marginTop: 12 }]}>
        {t("settings.privacy.privateData")}
      </Text>
      <Text style={[styles.body, { color: bodyColor, marginTop: 8 }]}>
        {t("settings.privacy.publicData")}
      </Text>

      <Text style={[styles.sectionTitle, { color: titleColor }]}>
        {t("settings.privacy.zeroKnowledgeTitle")}
      </Text>
      <Text style={[styles.body, { color: bodyColor }]}>
        {t("settings.privacy.zeroKnowledgeDesc")}
      </Text>

      <Text style={[styles.sectionTitle, { color: titleColor }]}>
        {t("settings.privacy.warningTitle")}
      </Text>
      <Text style={[styles.body, { color: bodyColor, fontFamily: "bold" }]}>
        {t("settings.privacy.warningDesc")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "bold",
    color: COLORS.black,
    marginVertical: 26,
  },
  body: {
    fontSize: 14,
    fontFamily: "regular",
    color: COLORS.black,
    marginTop: 4,
    lineHeight: 22,
  },
});

export default PrivacyPolicyContent;
