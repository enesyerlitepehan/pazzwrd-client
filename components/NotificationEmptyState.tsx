import React from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, Image } from "react-native";

import { COLORS, icons } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

const NotificationEmptyState = () => {
  const { dark } = useTheme();
  const { t } = useTranslation("common");

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: dark ? COLORS.dark2 : COLORS.silver,
          },
        ]}
      >
        <Image
          source={icons.notificationBell2}
          style={[
            styles.icon,
            {
              tintColor: dark ? COLORS.white : COLORS.primary,
            },
          ]}
          resizeMode="contain"
        />
      </View>
      <Text
        style={[
          styles.title,
          {
            color: dark ? COLORS.white : COLORS.greyscale900,
          },
        ]}
      >
        {t("notifications.empty")}
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
          },
        ]}
      >
        {t("notifications.emptyDesc")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 64, // Offset for header to make it look truly centered
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  icon: {
    width: 64,
    height: 64,
  },
  title: {
    fontSize: 22,
    fontFamily: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: "regular",
    textAlign: "center",
    lineHeight: 24,
  },
});

export default NotificationEmptyState;
