import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TextInputProps,
  TouchableOpacity,
  Animated,
  Platform,
  InputAccessoryView,
  Button,
  Keyboard,
} from "react-native";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

import LoadingModal from "./ui/LoadingModal";

interface InputWithTooltipProps extends TextInputProps {
  id: string;
  icon?: any;
  placeholderTextColor?: string;
  errorText?: string | string[] | boolean;
  onInputChanged: (id: string, text: string) => void;
  tooltipInfo?: string;
  label?: string;
  showPlusIcon?: boolean;
  onPlusPress?: () => void;
  showVisibilityToggle?: boolean;
  onToggleVisibility?: () => void;
  showCopyIcon?: boolean;
  onCopyPress?: () => void;
  showDoneButton?: boolean;
}

const InputWithTooltip: React.FC<InputWithTooltipProps> = (props) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalPasswordVisible, setInternalPasswordVisible] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const { colors } = useTheme();

  const [localValue, setLocalValue] = useState<string>(
    typeof props.defaultValue === "string" ? props.defaultValue : "",
  );
  const currentValue: string = (typeof props.value === "string" ? props.value : localValue) || "";
  const hasText = currentValue.length > 0;

  // Animated value for floating label
  const labelAnim = useRef(new Animated.Value(hasText ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: isFocused || hasText ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isFocused, hasText, labelAnim]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const onChangeText = (text: string) => {
    setLocalValue(text);
    props.onInputChanged(props.id, text);
  };

  const { t } = useTranslation();

  const inputAccessoryViewID = props.id + "_accessory";

  const isSecure = props.onToggleVisibility
    ? props.secureTextEntry
    : props.secureTextEntry && !internalPasswordVisible;

  const toggleVisibility = () => {
    if (props.onToggleVisibility) {
      props.onToggleVisibility();
    } else {
      setInternalPasswordVisible(!internalPasswordVisible);
    }
  };

  const showTooltip = () => {
    if (props.tooltipInfo) {
      setTooltipVisible(true);
    }
  };

  const labelLeft = props.icon ? SIZES.padding + 20 + 10 : SIZES.padding;
  const labelTranslateY = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

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
        {(props.label || props.placeholder) && (
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.floatingLabel,
              {
                left: labelLeft,
                color: isFocused
                  ? colors.iconPrimary
                  : hasText
                    ? colors.iconMuted
                    : props.placeholderTextColor || colors.iconMuted,
                transform: [{ translateY: labelTranslateY }],
                fontSize: isFocused || hasText ? 11 : 14,
              },
            ]}
          >
            {props.label || props.placeholder}
          </Animated.Text>
        )}
        <TextInput
          {...props}
          inputAccessoryViewID={
            Platform.OS === "ios" && props.showDoneButton ? inputAccessoryViewID : undefined
          }
          secureTextEntry={isSecure}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[styles.input, { color: colors.text }]}
          placeholder=""
          placeholderTextColor={props.placeholderTextColor}
          autoCapitalize="none"
        />
        {props.showCopyIcon && (
          <TouchableOpacity
            onPress={props.onCopyPress}
            style={styles.tooltipContainer}
            disabled={!props.onCopyPress}
          >
            <Ionicons
              name="copy-outline"
              size={22}
              color={
                props.onCopyPress
                  ? isFocused
                    ? colors.iconPrimary
                    : colors.iconMuted
                  : colors.inputBorder
              }
            />
          </TouchableOpacity>
        )}
        {props.showVisibilityToggle && (
          <TouchableOpacity onPress={toggleVisibility} style={styles.tooltipContainer}>
            <Ionicons
              name={isSecure ? "eye-off-outline" : "eye-outline"}
              size={24}
              color={isFocused ? colors.iconPrimary : colors.iconMuted}
            />
          </TouchableOpacity>
        )}
        {props.showPlusIcon && (
          <TouchableOpacity onPress={props.onPlusPress} style={styles.tooltipContainer}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={isFocused ? colors.iconPrimary : colors.iconMuted}
            />
          </TouchableOpacity>
        )}
        {props.tooltipInfo && (
          <TouchableOpacity onPress={showTooltip} style={styles.tooltipContainer}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={isFocused ? colors.iconPrimary : colors.iconMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {props.errorText && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{props.errorText}</Text>
        </View>
      )}
      <LoadingModal
        visible={tooltipVisible}
        message={props.tooltipInfo}
        titleKey="common.information"
        resultMode={true}
        showActionButton={true}
        onAction={() => setTooltipVisible(false)}
      />
      {Platform.OS === "ios" && props.showDoneButton && (
        <InputAccessoryView nativeID={inputAccessoryViewID}>
          <View
            style={[
              styles.accessory,
              {
                backgroundColor: colors.buttonSecondaryBackground,
                borderTopColor: colors.divider,
              },
            ]}
          >
            <Button
              title={t("common.done") || "Done"}
              onPress={() => Keyboard.dismiss()}
              color={colors.textPrimary}
            />
          </View>
        </InputAccessoryView>
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
    position: "relative",
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
    lineHeight: 20,
    paddingTop: 2,
    paddingBottom: 0,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  errorContainer: {
    marginVertical: 4,
  },
  errorText: {
    color: "red",
    fontSize: 12,
  },
  tooltipContainer: {
    marginLeft: 10,
  },
  floatingLabel: {
    position: "absolute",
    top: 18,
    zIndex: 1,
    fontFamily: "regular",
  },
  accessory: {
    width: SIZES.width,
    height: 45,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
});

export default InputWithTooltip;
