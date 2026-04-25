import { useNavigation } from "expo-router";
import React, { useCallback, useContext, useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import InputWithTooltip from "../components/InputWithTooltip";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES, icons } from "../constants";
import { applyPostLogin } from "../service/SignService";
import { AuthContext } from "../store/auth-context";
import { useSecurity } from "../store/security-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateInput } from "../utils/actions/formActions";
import { reducer } from "../utils/reducers/formReducers";

const isTestMode = true;

const initialState = {
  inputValues: {
    email: isTestMode ? "example@gmail.com" : "",
    password: isTestMode ? "**********" : "",
  },
  inputValidities: {
    email: false,
    password: false,
  },
  formIsValid: false,
};

type Nav = {
  navigate: (value: string) => void;
};

const SignupScreen = () => {
  const { navigate } = useNavigation<Nav>();
  const [formState, dispatchFormState] = useReducer(reducer, initialState);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalResult, setModalResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const showAlert = useCallback((title: string, message: string) => {
    setModalTitle(title);
    setModalMsg(message);
    setModalResult(true);
    setModalVisible(true);
  }, []);

  const delay = useCallback((ms: number) => new Promise<void>((res) => setTimeout(res, ms)), []);

  const [hidePassword, setHidePassword] = useState(true);
  const { colors, dark } = useTheme();
  const { t } = useTranslation("common");
  const authCtx = useContext(AuthContext);
  const { mpStatus: localMpStatus, setMpStatus, setAccountAccess, setEmailStatus } = useSecurity();

  const inputChangedHandler = useCallback(
    (inputId: string, inputValue: string) => {
      const result = validateInput(inputId, inputValue);
      dispatchFormState({
        inputId,
        validationResult: result,
        inputValue,
      });
    },
    [dispatchFormState],
  );

  useEffect(() => {
    if (error) {
      showAlert(t("alerts.errorTitle"), error as any);
    }
  }, [error, t, showAlert]);

  // Handle signup process
  const handleSignup = async () => {
    try {
      if (!formState.formIsValid) {
        showAlert(t("auth.invalidInputTitle"), t("auth.invalidInputMessage"));
        return;
      }

      setError(null);
      setIsLoading(true);

      const email = formState.inputValues.email;
      const password = formState.inputValues.password;

      const result = await authCtx.createUser(email, password);
      // console.log("signup result");

      if (result && result.ok) {
        try {
          const resultData = result.data;
          if (resultData) {
            const applyResult = await applyPostLogin(resultData, authCtx, {
              localMpStatus,
              setMpStatus,
              setAccountAccess,
              setEmailStatus,
            });
            if (!applyResult.ok) {
              showAlert(
                t("auth.signupTitle"),
                applyResult.reason || t("auth.responseMissingTokens"),
              );
            }
          }
        } catch (e) {
          // applyPostLogin failed
        }
      } else {
        if (result.isNetworkError) {
          showAlert(t("alerts.errorTitle"), t("alerts.networkError"));
        } else if (result.status === 409 || result.code === "USER_EXISTS") {
          showAlert(t("auth.emailExistsTitle"), t("auth.emailExistsMessage"));
        } else if (result.status === 504 || result.code === "GATEWAY_TIMEOUT") {
          showAlert(t("alerts.errorTitle"), t("alerts.timeoutError"));
        } else if (result.status === 503 || result.code === "SERVICE_UNAVAILABLE") {
          showAlert(t("alerts.errorTitle"), t("alerts.serverError"));
        } else {
          showAlert(t("alerts.errorTitle"), result.message || t("alerts.unexpected"));
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || t("alerts.unexpected");
      showAlert(t("alerts.errorTitle"), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // implementing apple authentication
  const appleAuthHandler = () => {
    console.log("Apple Authentication");
  };

  // Implementing google authentication
  const googleAuthHandler = () => {
    console.log("Google Authentication");
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
              {t("auth.createTitleLine1")}
            </Text>
            <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
              {t("auth.createTitleLine2")}
            </Text>
          </View>
          <InputWithTooltip
            id="email"
            onInputChanged={inputChangedHandler}
            errorText={formState.inputValidities["email"]}
            placeholder={t("common.email")}
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            icon={icons.email}
            keyboardType="email-address"
          />
          <InputWithTooltip
            onInputChanged={inputChangedHandler}
            errorText={formState.inputValidities["password"]}
            autoCapitalize="none"
            id="password"
            placeholder={t("auth.passwordPlaceholder")}
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            icon={icons.padlock}
            secureTextEntry={hidePassword}
            showVisibilityToggle
            onToggleVisibility={() => setHidePassword((prev) => !prev)}
          />
          <ButtonFilled
            title={t("auth.signUpButton")}
            onPress={handleSignup}
            style={styles.button}
            isLoading={isLoading}
            disabled={isLoading}
          />
          {/* 
          <View>
            <OrSeparator text={t("auth.orContinueWith")} />
            <View style={styles.socialBtnContainer}>
              <SocialButton
                icon={icons.appleLogo}
                onPress={appleAuthHandler}
                tintColor={dark ? COLORS.white : COLORS.black}
              />
              <SocialButton icon={icons.google} onPress={googleAuthHandler} />
            </View>
          </View>
          */}
        </ScrollView>
        <View style={styles.bottomContainer}>
          <Text
            style={[
              styles.bottomLeft,
              {
                color: dark ? COLORS.white : COLORS.black,
              },
            ]}
          >
            {t("auth.alreadyHaveAccount")}
          </Text>
          <TouchableOpacity onPress={() => navigate("Login")}>
            <Text
              style={[
                styles.bottomRight,
                {
                  color: dark ? COLORS.white : COLORS.primary,
                },
              ]}
            >
              {" "}
              {t("auth.signInButton")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <LoadingModal
        visible={isLoading || modalVisible}
        message={isLoading ? undefined : modalMsg}
        messageKey={isLoading ? "loading.default" : undefined}
        titleKey={isLoading ? undefined : modalTitle}
        showSpinner={isLoading}
        resultMode={modalResult}
        showActionButton={modalResult}
        onAction={() => {
          setModalVisible(false);
          setModalResult(false);
        }}
      />
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
  logo: {
    width: 100,
    height: 100,
    tintColor: COLORS.primary,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 32,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    marginVertical: 32,
  },
  title: {
    fontSize: 48,
    fontFamily: "bold",
    color: "#212121",
  },
  socialTitle: {
    fontSize: 19.25,
    fontFamily: "medium",
    color: COLORS.black,
    textAlign: "center",
    marginVertical: 26,
  },
  socialBtnContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 18,
    position: "absolute",
    bottom: 12,
    right: 0,
    left: 0,
  },
  bottomLeft: {
    fontSize: 14,
    fontFamily: "regular",
    color: "black",
  },
  bottomRight: {
    fontSize: 16,
    fontFamily: "medium",
    color: COLORS.primary,
  },
  button: {
    marginVertical: 6,
    width: SIZES.width - 32,
    borderRadius: 30,
  },
});

export default SignupScreen;
