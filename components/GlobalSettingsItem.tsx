import React from "react";
import { View, Text, StyleSheet, Switch } from "react-native";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

type GlobalSettingsItemProps = {
  title: string;
  isNotificationEnabled: boolean;
  toggleNotificationEnabled: () => void;
  showSwitch?: boolean;
  disabled?: boolean;
};

const GlobalSettingsItem: React.FC<GlobalSettingsItemProps> = ({
  title,
  isNotificationEnabled,
  toggleNotificationEnabled,
  showSwitch = true,
  disabled = false,
}) => {
  const { dark } = useTheme();

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <Text style={[styles.title, { color: dark ? COLORS.tertiaryWhite : COLORS.greyscale900 }]}>
        {title}
      </Text>
      {showSwitch && (
        <Switch
          value={isNotificationEnabled}
          onValueChange={toggleNotificationEnabled}
          disabled={disabled}
          thumbColor={isNotificationEnabled ? "#fff" : COLORS.white}
          trackColor={{
            false: "#EEEEEE",
            true: dark ? COLORS.dark3 : COLORS.primary,
          }}
          ios_backgroundColor={COLORS.white}
          style={styles.switch}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZES.width - 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.blackTie,
  },
  switch: {
    marginLeft: 8,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
});

export default GlobalSettingsItem;
