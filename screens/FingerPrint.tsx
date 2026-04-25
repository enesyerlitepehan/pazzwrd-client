import * as LocalAuthentication from "expo-local-authentication";
import { useNavigation } from "expo-router";
import React, { useEffect, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/Button";
import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import { useToast } from "../components/ToastProvider";
import { COLORS, SIZES, illustrations } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";
import { setItem as setUserItem } from "../utils/userScopedStorage";

type Nav = {
  navigate: (value: string) => void;
};

const Fingerprint = () => {
  const { navigate } = useNavigation<Nav>();
  const [isSupported, setIsSupported] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const { colors, dark } = useTheme();
  const toast = useToast();
  const { t } = useTranslation("common");
  const authCtx = useContext(AuthContext);

  useEffect(() => {
    checkDeviceForFingerprint();
  }, []);

  // When modalVisible flips to true, wait 1s then navigate
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (modalVisible) {
      timer = setTimeout(() => {
        setModalVisible(false);
        navigate("Login");
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [modalVisible]);

  const checkDeviceForFingerprint = async () => {
    const isCompatible = await LocalAuthentication.hasHardwareAsync();
    setIsSupported(isCompatible);

    if (isCompatible) {
      authenticateUser();
    }
  };

  const authenticateUser = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate with your fingerprint",
    });
    if (result.success) {
      setIsAuthenticated(true);
      // Mark fingerprint as configured for this user and enable biometric prompt
      try {
        await setUserItem("security.fingerprintStatus", "CONFIGURED");
        await authCtx.setAndroidBiometricPrompt(true);
      } catch {}
      // Navigate to main app
      navigate("TabLayout");
    } else {
      // Handle authentication failure
      toast.show(t("alerts.fingerprintNotRecognized"));
      setIsAuthenticated(false);
    }
  };

  // Render modal
  const renderModal = () => {
    return (
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalSubContainer,
                {
                  backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite,
                },
              ]}
            >
              <Image
                source={dark ? illustrations.userSuccessDark : illustrations.userSuccess}
                resizeMode="contain"
                style={styles.modalIllustration}
              />
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  },
                ]}
              >
                Congratulations!
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  {
                    color: dark ? COLORS.grayTie : COLORS.greyscale900,
                  },
                ]}
              >
                Your account is ready to use. You will be redirected to the Home page in a few
                seconds..
              </Text>
              <View style={{ marginTop: 16 }}>
                <ActivityIndicator size="large" color={dark ? COLORS.white : COLORS.primary} />
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Set Your Fingerprint" />
        <ScrollView
          contentContainerStyle={{ alignItems: "center" }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={[
              styles.title,
              {
                color: dark ? COLORS.white : COLORS.greyscale900,
              },
            ]}
          >
            Add a fingerprint to make your account more secure.{" "}
          </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={authenticateUser}>
            <Image
              source={dark ? illustrations.fingerprintDark : illustrations.fingerprint}
              resizeMode="contain"
              style={styles.fingerprint}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.title,
              {
                color: dark ? COLORS.white : COLORS.greyscale900,
              },
            ]}
          >
            Please put your finger on the fingerprint scanner to get started.
          </Text>
        </ScrollView>
      </View>
      <View style={styles.bottomContainer}>
        <Button
          title="Skip"
          style={{
            width: (SIZES.width - 32) / 2 - 8,
            borderRadius: 32,
            backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
            borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
          }}
          textColor={dark ? COLORS.white : COLORS.black}
          onPress={async () => {
            try {
              await setUserItem("security.fingerprintStatus", "SKIPPED");
            } catch {}
            navigate("CreateNewPin");
          }}
        />
        {
          // TODO Continue button
          // TODO Update onPress button add new function to navigate and this function should be
          // TODO set firstLogin to false and then navigate to HomeScreen
          // TODO Also show Alert and give information that FingerPrint login is added successfully and
          // TODO customer can update that in settings
        }
        <ButtonFilled
          title="Continue"
          style={styles.continueButton}
          onPress={authenticateUser}
          disabled={false}
        />
      </View>
      {renderModal()}
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
  title: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginVertical: 54,
  },
  fingerprint: {
    width: 300,
    height: 300,
    marginVertical: 24,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 32,
    right: 16,
    left: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    width: SIZES.width - 32,
    alignItems: "center",
  },
  skipButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
    backgroundColor: "#F5E7FF",
    borderColor: "#F5E7FF",
  },
  continueButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "bold",
    color: COLORS.black,
    textAlign: "center",
    marginVertical: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: "regular",
    color: COLORS.black2,
    textAlign: "center",
    marginVertical: 12,
  },
  modalContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalSubContainer: {
    height: 494,
    width: SIZES.width * 0.9,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalIllustration: {
    height: 180,
    width: 180,
    marginVertical: 22,
  },
});

export default Fingerprint;
