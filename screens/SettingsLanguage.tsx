import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native-virtualized-view";

import Header from "../components/Header";
import LanguageItem from "../components/LanguageItem";
import { COLORS } from "../constants";
import { getAppLanguage, setAppLanguage, AppLanguage } from "../i18n";
import { useTheme } from "../theme/ThemeProvider";

// Select your preferred language
const languages: { code: AppLanguage; name: string }[] = [
  { code: "en", name: "English (US)" },
  { code: "tr", name: "Türkçe" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "de", name: "Deutsch" },
  { code: "ar", name: "العربية" },
  { code: "it", name: "Italiano" },
  { code: "hi", name: "हिन्दी" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "nl", name: "Nederlands" },
];

const SettingsLanguage = () => {
  const [selectedCode, setSelectedCode] = useState<AppLanguage>("en");
  const { colors, dark } = useTheme();
  const { t } = useTranslation("common");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const current = await getAppLanguage();
      if (mounted) setSelectedCode(current);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onSelect = async (code: AppLanguage) => {
    setSelectedCode(code);
    await setAppLanguage(code);
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("settings.languageRegion")} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.black }]}>
            Suggested
          </Text>
          <View style={{ marginTop: 12 }}>
            {languages.map((lng) => (
              <LanguageItem
                key={lng.code}
                checked={selectedCode === lng.code}
                name={lng.name}
                onPress={() => onSelect(lng.code)}
              />
            ))}
          </View>
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
  title: {
    fontSize: 20,
    fontFamily: "bold",
    color: COLORS.black,
    marginVertical: 16,
  },
});

export default SettingsLanguage;
