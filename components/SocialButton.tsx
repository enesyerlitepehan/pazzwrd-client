import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageSourcePropType,
  ViewStyle,
  ImageStyle,
} from "react-native";

import { COLORS } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

interface SocialButtonProps {
  icon: ImageSourcePropType;
  onPress: () => void;
  tintColor?: string;
}

const SocialButton: React.FC<SocialButtonProps> = ({ icon, onPress, tintColor }) => {
  const { dark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          borderColor: dark ? COLORS.dark2 : COLORS.grayscale200,
        },
      ]}
    >
      <Image source={icon} resizeMode="contain" style={[styles.icon, { tintColor }]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 88,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderColor: COLORS.grayscale200,
    borderWidth: 1,
    marginHorizontal: 8,
  } as ViewStyle,
  icon: {
    height: 24,
    width: 24,
  } as ImageStyle,
});

export default SocialButton;
