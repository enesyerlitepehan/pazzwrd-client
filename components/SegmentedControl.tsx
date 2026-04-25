import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

interface SegmentedControlProps<T extends string> {
  id: string;
  options: T[];
  selectedOption: T;
  onSelectionChanged: (id: string, option: T) => void;
  tooltipInfo?: string;
  errorText?: string | string[] | boolean;
  labelMap?: Record<string, string>; // optional mapping from option to display label
  disabled?: boolean;
}

function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const { dark } = useTheme();
  const { id, options, selectedOption, onSelectionChanged, errorText, labelMap, disabled } = props;
  const handleOptionPress = (option: T) => {
    if (disabled) return;
    onSelectionChanged(id, option);
  };

  return (
    <View style={styles.container}>
      <View style={styles.segmentedControlContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={option}
            onPress={() => handleOptionPress(option)}
            disabled={disabled}
            style={[
              styles.optionContainer,
              {
                marginRight: index < options.length - 1 ? 8 : 0,
                backgroundColor:
                  selectedOption === option ? "#5e69ee" : dark ? COLORS.dark2 : "#eee",
                borderColor: selectedOption === option ? "#5e69ee" : dark ? COLORS.dark2 : "#eee",
                opacity: disabled ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color: selectedOption === option ? COLORS.white : dark ? COLORS.white : "#333",
                },
              ]}
            >
              {labelMap && labelMap[String(option)]
                ? labelMap[String(option)]
                : option.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errorText && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  segmentedControlContainer: {
    width: "100%",
    flexDirection: "row",
    marginVertical: 5,
  },
  optionContainer: {
    flex: 1,
    padding: SIZES.padding,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderWidth: 1,
  },
  optionText: {
    fontWeight: "500",
    fontFamily: "regular",
    fontSize: 14,
  },
  errorContainer: {
    marginVertical: 4,
  },
  errorText: {
    color: "red",
    fontSize: 12,
  },
});

export default SegmentedControl;
