import { useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { OtpInput } from "react-native-otp-entry";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import { COLORS } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

type Nav = {
  navigate: (value: string) => void;
};

const OTPVerification = () => {
  const { navigate } = useNavigation<Nav>();
  const [time, setTime] = useState(59);
  const { colors, dark } = useTheme();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Forgot Password" />
        <ScrollView>
          <Text
            style={[
              styles.title,
              {
                color: dark ? COLORS.white : COLORS.black,
              },
            ]}
          >
            Code has been send to +1 111 ******99
          </Text>
          <OtpInput
            numberOfDigits={4}
            onTextChange={(text) => console.log(text)}
            focusColor={COLORS.primary}
            focusStickBlinkingDuration={500}
            onFilled={(text) => console.log(`OTP is ${text}`)}
            theme={{
              pinCodeContainerStyle: {
                backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite,
                borderColor: dark ? COLORS.gray : COLORS.secondaryWhite,
                borderWidth: 0.4,
                borderRadius: 10,
                height: 58,
                width: 58,
              },
              pinCodeTextStyle: {
                color: dark ? COLORS.white : COLORS.black,
              },
            }}
          />
          <View style={styles.codeContainer}>
            <Text
              style={[
                styles.code,
                {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                },
              ]}
            >
              Resend code in
            </Text>
            <Text style={styles.time}>{`  ${time}  `}</Text>
            <Text
              style={[
                styles.code,
                {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                },
              ]}
            >
              s
            </Text>
          </View>
        </ScrollView>
        <ButtonFilled
          title="Verify"
          style={styles.button}
          onPress={() => {
            navigate("CreateNewPassword");
          }}
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
    padding: 16,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginVertical: 54,
  },
  OTPStyle: {
    borderRadius: 8,
    height: 58,
    width: 58,
    backgroundColor: COLORS.secondaryWhite,
    borderBottomColor: "gray",
    borderBottomWidth: 0.4,
    borderWidth: 0.4,
    borderColor: "gray",
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    justifyContent: "center",
  },
  code: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.greyscale900,
    textAlign: "center",
  },
  time: {
    fontFamily: "medium",
    fontSize: 18,
    color: COLORS.primary,
  },
  button: {
    borderRadius: 32,
  },
});

export default OTPVerification;
