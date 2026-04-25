import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Image, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, FONTS, icons, SIZES } from "../../constants";
import HomeScreen from "../../screens/HomeScreen";
import { useTheme } from "../../theme/ThemeProvider";

import Card from "./cards";
import Cart from "./new";
import Passwords from "./passwords";
import Profile from "./profile";

const Tab = createBottomTabNavigator();

const TabLayout = () => {
  const { dark } = useTheme();
  const insets = useSafeAreaInsets();
  const baseHeight = Platform.OS === "ios" ? 80 : 60;
  const extraBottom = Platform.OS === "android" ? insets.bottom : 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS !== "ios",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          right: 0,
          left: 0,
          elevation: 0,
          height: baseHeight + extraBottom,
          paddingBottom: extraBottom,
          backgroundColor: dark ? COLORS.dark1 : COLORS.white,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "",
          tabBarIcon: ({ focused }) => {
            return (
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 16,
                  width: SIZES.width / 5,
                }}
              >
                <Image
                  source={focused ? icons.home : icons.home2Outline}
                  resizeMode="contain"
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                />
                <Text
                  style={{
                    ...FONTS.body4,
                    color: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                >
                  Home
                </Text>
              </View>
            );
          },
        }}
      />
      <Tab.Screen
        name="Cart"
        component={Cart}
        options={{
          title: "",
          tabBarIcon: ({ focused }) => {
            return (
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 16,
                  width: SIZES.width / 5,
                }}
              >
                <Image
                  source={focused ? icons.new1Focus : icons.new1}
                  resizeMode="contain"
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                />
                <Text
                  style={{
                    ...FONTS.body4,
                    color: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                >
                  New
                </Text>
              </View>
            );
          },
        }}
      />
      <Tab.Screen
        name="Password"
        component={Passwords}
        options={{
          title: "",
          tabBarIcon: ({ focused }) => {
            return (
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 16,
                  width: SIZES.width / 5,
                }}
              >
                <Image
                  source={focused ? icons.padlockFocus : icons.padlock}
                  resizeMode="contain"
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                />
                <Text
                  style={{
                    ...FONTS.body4,
                    color: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                >
                  Password
                </Text>
              </View>
            );
          },
        }}
      />
      <Tab.Screen
        name="Card"
        component={Card}
        options={{
          title: "",
          tabBarIcon: ({ focused }) => {
            return (
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 16,
                  width: SIZES.width / 5,
                }}
              >
                <Image
                  source={focused ? icons.wallet2 : icons.wallet2Outline}
                  resizeMode="contain"
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                />
                <Text
                  style={{
                    ...FONTS.body4,
                    color: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                >
                  Cards
                </Text>
              </View>
            );
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          title: "",
          tabBarIcon: ({ focused }) => {
            return (
              <View
                style={{
                  alignItems: "center",
                  paddingTop: 16,
                  width: SIZES.width / 5,
                }}
              >
                <Image
                  source={focused ? icons.user : icons.userOutline}
                  resizeMode="contain"
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                />
                <Text
                  style={{
                    ...FONTS.body4,
                    color: focused
                      ? dark
                        ? COLORS.white
                        : COLORS.primary
                      : dark
                        ? COLORS.gray3
                        : COLORS.gray3,
                  }}
                >
                  Profile
                </Text>
              </View>
            );
          },
        }}
      />
    </Tab.Navigator>
  );
};

export default TabLayout;
