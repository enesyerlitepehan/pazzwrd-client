import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { COLORS } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

type LanguageItemProps = {
  checked: boolean;
  name: string;
  onPress: () => void;
};

const LanguageItem: React.FC<LanguageItemProps> = ({ checked, name, onPress }) => {
  const { dark } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Text style={[styles.name, { color: dark ? COLORS.white : COLORS.black }]}>{name}</Text>
      <View style={[styles.roundedChecked, { borderColor: dark ? COLORS.white : COLORS.primary }]}>
        {checked && (
          <View
            style={[
              styles.roundedCheckedCheck,
              { backgroundColor: dark ? COLORS.white : COLORS.primary },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  name: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.black,
    marginBottom: 10,
  },
  roundedChecked: {
    width: 20,
    height: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  roundedCheckedCheck: {
    height: 10,
    width: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
});

export default LanguageItem;
