import * as LocalAuthentication from "expo-local-authentication";
import { useNavigation } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/Button";
import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import { COLORS, SIZES, illustrations } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";
import { setItem as setUserItem } from "../utils/userScopedStorage";

// Face ID setup screen for iOS users (based on FingerPrint.tsx)

type Nav = {
  navigate: (value: string) => void;
};

const FaceID = () => {
  const { navigate } = useNavigation<Nav>();
  const [isSupported, setIsSupported] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const { colors, dark } = useTheme();
  const authCtx = useContext(AuthContext);

  useEffect(() => {
    checkDeviceForBiometrics();
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

  const checkDeviceForBiometrics = async () => {
    const isCompatible = await LocalAuthentication.hasHardwareAsync();
    setIsSupported(isCompatible);

    if (isCompatible) {
      authenticateUser();
    }
  };

  const authenticateUser = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate with Face ID",
    });
    if (result.success) {
      setIsAuthenticated(true);
      try {
        await setUserItem("security.faceidstatus", "CONFIGURED");
        await authCtx.setIOSBiometricPrompt(true);
      } catch {}
      // Navigate to main app
      navigate("TabLayout");
    } else {
      // Handle authentication failure
      console.log("Authentication failed");
    }
  };

  const handleContinue = async () => {
    await authenticateUser();
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
        <Header title="Set Up Face ID" />
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
            Enable Face ID to make your account more secure.
          </Text>
          <Image
            source={dark ? illustrations.welcomeDark : illustrations.welcome}
            resizeMode="contain"
            style={styles.illustration}
          />
          <Text
            style={[
              styles.title,
              {
                color: dark ? COLORS.white : COLORS.greyscale900,
              },
            ]}
          >
            Please look at the camera to authenticate with Face ID.
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
              await setUserItem("security.faceidstatus", "SKIPPED");
            } catch {}
            navigate("CreateNewPin");
          }}
        />
        {
          // TODO Continue button
          // TODO Update onPress button add new function to navigate and this function should be
          // TODO set firstLogin to false and then navigate to TabLayout
          // TODO Also show Alert and give information that Face ID login is added successfully and
          // TODO customer can update that in settings
          //  Also save faceID login to auth-context
        }
        <ButtonFilled title="Continue" style={styles.continueButton} onPress={handleContinue} />
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
  illustration: {
    width: 300,
    height: 300,
    marginVertical: 24,
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 24,
  },
  continueButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalSubContainer: {
    height: 370,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalIllustration: {
    width: 120,
    height: 120,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    marginTop: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginTop: 16,
  },
});

export default FaceID;
