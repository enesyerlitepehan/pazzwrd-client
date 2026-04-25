import React from "react";
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";

import { COLORS, SIZES } from "../constants";

interface ButtonProps {
  title: string;
  onPress: () => void;
  filled?: boolean;
  color?: string;
  textColor?: string;
  isLoading?: boolean;
  style?: object;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = (props) => {
  const filledBgColor = props.color || COLORS.primary;
  const outlinedBgColor = COLORS.white;
  const bgColor = props.filled ? filledBgColor : outlinedBgColor;
  const textColor = props.filled
    ? COLORS.white || props.textColor
    : props.textColor || COLORS.primary;
  const isLoading = props.isLoading || false;
  const disabled = props.disabled || false;

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bgColor }, props.style, disabled && styles.disabled]}
      onPress={disabled ? undefined : props.onPress}
      disabled={disabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={COLORS.white} />
      ) : (
        <Text
          style={[
            { fontSize: 18, fontFamily: "semiBold", color: textColor },
            disabled && styles.disabledText,
          ]}
        >
          {props.title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding,
    borderColor: COLORS.primary,
    borderWidth: 1,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    height: 52,
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.8,
  },
});

export default Button;
