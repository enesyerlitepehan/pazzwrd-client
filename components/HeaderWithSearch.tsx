import { useNavigation } from "expo-router";
import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";

import { COLORS, SIZES, icons } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

type HeaderWithSearchProps = {
  title: string; // Title to display in the header
  icon: any; // Icon to display on the right side (could be a number or an image source)
  onPress: () => void; // Function to call when the right icon is pressed
};

const HeaderWithSearch: React.FC<HeaderWithSearchProps> = ({ title, icon, onPress }) => {
  const navigation = useNavigation();
  const { dark } = useTheme();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={icons.back}
            resizeMode="contain"
            style={[
              styles.backIcon,
              {
                tintColor: dark ? COLORS.white : COLORS.greyscale900,
              },
            ]}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            {
              color: dark ? COLORS.white : COLORS.greyscale900,
            },
          ]}
        >
          {title}
        </Text>
      </View>
      <TouchableOpacity onPress={onPress}>
        <Image
          source={icon}
          resizeMode="contain"
          style={[
            styles.moreIcon,
            {
              tintColor: dark ? COLORS.white : COLORS.greyscale900,
            },
          ]}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    width: SIZES.width - 32,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: {
    height: 24,
    width: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "bold",
    color: COLORS.black,
    marginLeft: 16,
  },
  moreIcon: {
    width: 24,
    height: 24,
  },
});

export default HeaderWithSearch;
