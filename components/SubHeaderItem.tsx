import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

interface SubHeaderItemProps {
  title: string;
  onPress: () => void;
  navTitle: string;
}

const SubHeaderItem: React.FC<SubHeaderItemProps> = ({ title, onPress, navTitle }) => {
  const { dark } = useTheme();

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.title,
          {
            color: dark ? COLORS.white : COLORS.greyscale900,
          },
        ]}
      >
        {title}
      </Text>
      <TouchableOpacity onPress={onPress}>
        <Text
          style={[
            styles.navTitle,
            {
              color: dark ? COLORS.white : COLORS.primary,
            },
          ]}
        >
          {navTitle}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZES.width - 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.black,
  },
  navTitle: {
    fontSize: 16,
    fontFamily: "medium",
    color: COLORS.primary,
    marginLeft: 12,
  },
});

export default SubHeaderItem;
