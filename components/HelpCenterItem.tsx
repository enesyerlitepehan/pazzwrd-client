import React from "react";
import { Text, StyleSheet, Image, TouchableOpacity } from "react-native";

import { COLORS } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

type HelpCenterItemProps = {
  icon: any; // Replace 'any' with the specific type if you know the icon source type (e.g., ImageSourcePropType)
  title: string;
  onPress: () => void;
};

const HelpCenterItem: React.FC<HelpCenterItemProps> = ({ icon, title, onPress }) => {
  const { dark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}
    >
      <Image
        source={icon}
        resizeMode="contain"
        style={[styles.icon, { tintColor: dark ? COLORS.white : COLORS.primary }]}
      />
      <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.black }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    marginBottom: 12,
    height: 64,
    alignItems: "center",
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 1,
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: COLORS.primary,
    marginRight: 22,
  },
  title: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.black,
  },
});

export default HelpCenterItem;
