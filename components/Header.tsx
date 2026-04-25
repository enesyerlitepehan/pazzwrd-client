import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StyleProp,
  ViewStyle,
  TextStyle,
  ImageSourcePropType,
} from "react-native";

import { SIZES, COLORS, icons, images } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

interface HeaderProps {
  title?: string;
  onBackPress?: () => void;
  showBack?: boolean;
  showLogo?: boolean;
  logoSource?: ImageSourcePropType;
  onLogoPress?: () => void;
  rightIcon?: ImageSourcePropType;
  onRightPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onBackPress,
  showBack = true,
  showLogo = false,
  logoSource,
  onLogoPress,
  rightIcon,
  onRightPress,
  containerStyle,
  titleStyle,
  leftComponent,
  rightComponent,
}) => {
  const navigation = useNavigation();
  const { colors, dark } = useTheme();

  const canGoBack = navigation.canGoBack();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: dark ? COLORS.dark1 : COLORS.white },
        containerStyle,
      ]}
    >
      <View style={styles.leftContainer}>
        {leftComponent ? (
          leftComponent
        ) : (
          <>
            {showBack && canGoBack && (
              <TouchableOpacity onPress={() => (onBackPress ? onBackPress() : navigation.goBack())}>
                <Image
                  source={icons.back}
                  resizeMode="contain"
                  style={[
                    styles.backIcon,
                    { tintColor: dark ? COLORS.white : COLORS.greyscale900 },
                  ]}
                />
              </TouchableOpacity>
            )}
            {showLogo && (
              <TouchableOpacity onPress={onLogoPress} disabled={!onLogoPress}>
                <Image
                  source={logoSource || images.passwordIcon}
                  resizeMode="contain"
                  style={styles.logoIcon}
                />
              </TouchableOpacity>
            )}
            {title && (
              <Text
                style={[
                  styles.title,
                  { color: dark ? COLORS.white : COLORS.greyscale900 },
                  titleStyle,
                ]}
              >
                {title}
              </Text>
            )}
          </>
        )}
      </View>
      {rightComponent
        ? rightComponent
        : rightIcon && (
            <TouchableOpacity onPress={onRightPress}>
              <Image
                source={rightIcon}
                resizeMode="contain"
                style={[
                  styles.rightIcon,
                  {
                    tintColor: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
                  },
                ]}
              />
            </TouchableOpacity>
          )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZES.width - 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56, // Standard header height
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
  },
  logoIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  rightIcon: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 22,
    fontFamily: "bold",
  },
});

export default Header;
