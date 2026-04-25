import { NavigationProp, useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, TouchableOpacity, Image, Switch, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Header from "../components/Header";
import { COLORS, icons } from "../constants";
import { useTheme } from "../theme/ThemeProvider";
import { AsyncStorage } from "../utils/userScopedStorage";

const KEY = "logoutOption";
const KEY_MP = "removeMPOption";

const SettingsLogoutPreferences = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const { t } = useTranslation("common");

  const [removeLocal, setRemoveLocal] = useState(false);
  const [removeMP, setRemoveMP] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [val, valMP] = await Promise.all([
          AsyncStorage.getItem(KEY),
          AsyncStorage.getItem(KEY_MP),
        ]);
        if (mounted) {
          if (val !== null) setRemoveLocal(val === "true");
          if (valMP !== null) setRemoveMP(valMP === "true");
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setInitialLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onToggle = async (newValue: boolean) => {
    setRemoveLocal(newValue);
    try {
      const value = newValue ? "true" : "false";
      await AsyncStorage.setItem(KEY, value);
    } catch {
      // ignore
    }
  };

  const onToggleMP = async (newValue: boolean) => {
    setRemoveMP(newValue);
    try {
      const value = newValue ? "true" : "false";
      await AsyncStorage.setItem(KEY_MP, value);
    } catch {
      // ignore
    }
  };

  const renderHeader = () => <Header title={t("settings.logoutPreferences")} />;

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <ScrollView style={styles.settingsContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            <View style={styles.leftContainer}>
              <Image
                source={icons.settings}
                resizeMode="contain"
                style={[
                  styles.settingsIcon,
                  { tintColor: dark ? COLORS.white : COLORS.greyscale900 },
                ]}
              />
              <Text
                style={[styles.settingsName, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
              >
                {t("settings.removeLocalData")}
              </Text>
            </View>
            <View style={styles.rightContainer}>
              <Switch
                value={removeLocal}
                onValueChange={onToggle}
                disabled={initialLoading}
                thumbColor={removeLocal ? "#fff" : COLORS.white}
                trackColor={{ false: "#EEEEEE", true: COLORS.primary }}
                ios_backgroundColor={COLORS.white}
                style={styles.switch}
              />
            </View>
          </View>

          <Text
            style={[styles.infoText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}
          >
            {t("settings.removeLocalDataDescription")}
          </Text>

          <View style={[styles.row, { marginTop: 24 }]}>
            <View style={styles.leftContainer}>
              <Image
                source={icons.masterPassword}
                resizeMode="contain"
                style={[
                  styles.settingsIcon,
                  { tintColor: dark ? COLORS.white : COLORS.greyscale900 },
                ]}
              />
              <Text
                style={[styles.settingsName, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
              >
                {t("settings.removeMPConfig")}
              </Text>
            </View>
            <View style={styles.rightContainer}>
              <Switch
                value={removeMP}
                onValueChange={onToggleMP}
                disabled={initialLoading}
                thumbColor={removeMP ? "#fff" : COLORS.white}
                trackColor={{ false: "#EEEEEE", true: COLORS.primary }}
                ios_backgroundColor={COLORS.white}
                style={styles.switch}
              />
            </View>
          </View>

          <Text
            style={[styles.infoText, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}
          >
            {t("settings.removeMPConfigDescription")}
          </Text>
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
    tintColor: COLORS.greyscale900,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "bold",
    color: COLORS.greyscale900,
  },
  settingsContainer: {
    marginVertical: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  settingsName: {
    fontSize: 16,
    fontFamily: "semiBold",
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  infoText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default SettingsLogoutPreferences;
