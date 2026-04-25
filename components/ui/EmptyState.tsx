import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";

import { COLORS, icons } from "../../constants";
import { useTheme } from "../../theme/ThemeProvider";

export type EmptyStateProps = {
  message: string;
  ctaLabel?: string;
  onPress?: () => void;
};

const EmptyState: React.FC<EmptyStateProps> = ({ message, ctaLabel, onPress }) => {
  const { dark } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.tertiaryWhite }]}
    >
      <Text style={[styles.message, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
        {message}
      </Text>

      {ctaLabel && onPress ? (
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={[
            styles.cta,
            {
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
            },
          ]}
        >
          <Image
            source={icons.plus}
            resizeMode="contain"
            style={{
              width: 18,
              height: 18,
              tintColor: dark ? COLORS.white : COLORS.primary,
              marginRight: 8,
            }}
          />
          <Text style={[styles.ctaText, { color: dark ? COLORS.white : COLORS.primary }]}>
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    marginVertical: 22,
  },
  message: {
    fontSize: 16,
    fontFamily: "regular",
    marginBottom: 16,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "semiBold",
  },
});

export default EmptyState;
