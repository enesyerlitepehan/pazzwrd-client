import { useNavigation } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import { COLORS, SIZES, icons, illustrations } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

type Nav = {
  navigate: (value: string) => void;
};

const ForgotPasswordMethods = () => {
  const { t } = useTranslation("common");
  const { navigate } = useNavigation<Nav>();
  const [selectedMethod, setSelectedMethod] = useState("email");
  const { colors, dark } = useTheme();

  const handleMethodPress = (method: any) => {
    setSelectedMethod(method);
  };
  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("forgotPassword.methodsTitle")} />
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <View style={styles.passwordContainer}>
            <Image
              source={dark ? illustrations.passwordDark : illustrations.password}
              resizeMode="contain"
              style={styles.password}
            />
          </View>
          <Text
            style={[
              styles.title,
              {
                color: dark ? COLORS.white : COLORS.greyscale900,
              },
            ]}
          >
            {t("forgotPassword.methodsSubtitle")}
          </Text>
          <TouchableOpacity
            style={[
              styles.methodContainer,
              selectedMethod === "email" && {
                borderColor: dark ? COLORS.white : COLORS.primary,
                borderWidth: 2,
              }, // Customize the border color for Email
            ]}
            onPress={() => handleMethodPress("email")}
          >
            <View style={styles.iconContainer}>
              <Image
                source={icons.email}
                resizeMode="contain"
                style={[
                  styles.icon,
                  selectedMethod === "email" && {
                    tintColor: dark ? COLORS.white : COLORS.primary,
                  },
                ]}
              />
            </View>
            <View>
              <Text style={styles.methodTitle}>{t("forgotPassword.viaEmail")}</Text>
              <Text
                style={[
                  styles.methodSubtitle,
                  {
                    color: dark ? COLORS.white : COLORS.black,
                  },
                ]}
              >
                and***ley@yourdomain.com
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
        <ButtonFilled
          title={t("forgotPassword.continue")}
          style={styles.button}
          onPress={() => navigate("ForgotPasswordEmail")}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
  },
  password: {
    width: 276,
    height: 250,
  },
  passwordContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 32,
  },
  title: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.greyscale900,
  },
  methodContainer: {
    width: SIZES.width - 32,
    height: 112,
    borderRadius: 32,
    borderColor: "gray",
    borderWidth: 0.3,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.tansparentPrimary,
    marginHorizontal: 16,
  },
  icon: {
    width: 32,
    height: 32,
    tintColor: COLORS.primary,
  },
  methodTitle: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.greyscale600,
  },
  methodSubtitle: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.black,
    marginTop: 12,
  },
  button: {
    borderRadius: 32,
    marginVertical: 22,
  },
});

export default ForgotPasswordMethods;
