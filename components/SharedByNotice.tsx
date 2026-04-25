import React from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";

import { COLORS } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

type Props = {
  email: string;
};

const SharedByNotice: React.FC<Props> = ({ email }) => {
  const { dark } = useTheme();
  const { t } = useTranslation("common");

  if (!email) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: dark ? COLORS.dark2 : COLORS.secondary + "22",
          borderColor: dark ? COLORS.dark3 : COLORS.secondary,
        },
      ]}
    >
      <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900 }}>
        {t("password.sharedBy", { who: email })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
});

export default SharedByNotice;
