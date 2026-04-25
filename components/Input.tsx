import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Image, TextInputProps } from "react-native";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

interface InputProps extends TextInputProps {
  id: string;
  icon?: any;
  placeholderTextColor?: string;
  errorText?: string | string[] | boolean;
  onInputChanged: (id: string, text: string) => void;
}

const Input: React.FC<InputProps> = (props) => {
  const [isFocused, setIsFocused] = useState(false);
  const { colors } = useTheme();

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const onChangeText = (text: string) => {
    props.onInputChanged(props.id, text);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: isFocused ? colors.inputFocusedBorder : colors.inputBorder,
            backgroundColor: isFocused ? colors.inputFocusedBackground : colors.inputBackground,
          },
        ]}
      >
        {props.icon && (
          <Image
            source={props.icon}
            style={[
              styles.icon,
              {
                tintColor: isFocused ? colors.iconPrimary : colors.iconMuted,
              },
            ]}
          />
        )}
        <TextInput
          {...props}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[styles.input, { color: colors.text }]}
          placeholder={props.placeholder}
          placeholderTextColor={props.placeholderTextColor}
          autoCapitalize="none"
        />
      </View>
      {props.errorText && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{props.errorText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  inputContainer: {
    width: "100%",
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding2,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 5,
    flexDirection: "row",
    height: 52,
    alignItems: "center",
  },
  icon: {
    marginRight: 10,
    height: 20,
    width: 20,
    tintColor: "#BCBCBC",
  },
  input: {
    color: COLORS.black,
    flex: 1,
    fontFamily: "regular",
    fontSize: 14,
    paddingTop: 0,
  },
  errorContainer: {
    marginVertical: 4,
  },
  errorText: {
    color: "red",
    fontSize: 12,
  },
});

export default Input;
