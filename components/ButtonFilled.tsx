import React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

interface ButtonFilledProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  isLoading?: boolean;
  disabled?: boolean;
}

const ButtonFilled: React.FC<ButtonFilledProps> = ({
  onPress,
  title,
  style,
  isLoading = false,
  disabled = false,
}) => {
  const { dark } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.filledButton,
        style,
        { backgroundColor: dark ? COLORS.white : COLORS.primary },
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={COLORS.white} />
      ) : (
        <Text style={[styles.buttonText, { color: dark ? COLORS.black : COLORS.white }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  filledButton: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    backgroundColor: COLORS.primary,
  } as ViewStyle,
  disabledButton: {
    opacity: 0.5,
  } as ViewStyle,
  buttonText: {
    fontSize: 18,
    fontFamily: "semiBold",
  } as TextStyle,
});

export default ButtonFilled;
