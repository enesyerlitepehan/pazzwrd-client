import { ViewStyle, TextStyle, StyleSheet } from "react-native";
import { lightColors } from "./colors";

export type ThemeColors = typeof lightColors;

export const createSharedStyles = (colors: ThemeColors) => ({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  } as ViewStyle,
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  } as ViewStyle,
  textPrimary: {
    color: colors.text,
  } as TextStyle,
  textSecondary: {
    color: colors.textSecondary,
  } as TextStyle,
  textMuted: {
    color: colors.textMuted,
  } as TextStyle,
});
