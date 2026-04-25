import React from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native-virtualized-view";

import PrivacyPolicyContent from "../components/legal/PrivacyPolicyContent";
import Header from "../components/Header";
import { COLORS } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

const SettingsPrivacyPolicy = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("settings.privacy.title")} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <PrivacyPolicyContent />
        </ScrollView>
      </View>
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
});

export default SettingsPrivacyPolicy;
