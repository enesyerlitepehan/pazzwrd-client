import RNAsyncStorage from "@react-native-async-storage/async-storage";
import Checkbox from "expo-checkbox";
import { useNavigation } from "expo-router";
import React, { useCallback, useContext, useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import InputWithTooltip from "../components/InputWithTooltip";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES, icons, API_STATUS } from "../constants";
import { applyPostLogin } from "../service/SignService";
import { AuthContext } from "../store/auth-context";
import { useSecurity } from "../store/security-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateInput } from "../utils/actions/formActions";
import { reducer } from "../utils/reducers/formReducers";
import type { LoginResult } from "../utils/types";

const isTestMode = true;
const AUTH_NOTICE_KEY = "auth.notice";
const AUTH_NOTICE_SESSION_EXPIRED = "SESSION_EXPIRED";

const initialState = {
  inputValues: {
    email: isTestMode ? "" : "",
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

const SignInScreen = () => {
  const { navigate } = useNavigation<Nav>();
  const [formState, dispatchFormState] = useReducer(reducer, initialState);
  const [error, setError] = useState<string | null>(null);
  const [isChecked, setChecked] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);
  const { colors, dark } = useTheme();
  const { t } = useTranslation("common");
  const authCtx = useContext(AuthContext);
  const { mpStatus: localMpStatus, setMpStatus, setAccountAccess, setEmailStatus } = useSecurity();

  // Remember Me storage keys
  const REMEMBER_ME_KEY = "rememberMe";
  const REMEMBER_EMAIL_KEY = "rememberEmail";

  // Loading modal controls
  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult, setModalResult] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalConfirmMode, setModalConfirmMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalActionLabel, setModalActionLabel] = useState<string | undefined>(undefined);
  const [modalCancelLabel, setModalCancelLabel] = useState<string | undefined>(undefined);
  const [modalConfirmLabel, setModalConfirmLabel] = useState<string | undefined>(undefined);
  const [modalOnAction, setModalOnAction] = useState<(() => void) | undefined>(undefined);
  const [modalOnCancel, setModalOnCancel] = useState<(() => void) | undefined>(undefined);
  const [modalShowActionButton, setModalShowActionButton] = useState(false);

  const resetModal = useCallback(() => {
    setModalVisible(false);
    setModalResult(false);
    setModalMsg(undefined);
    setModalTitle(undefined);
    setModalConfirmMode(false);
    setModalActionLabel(undefined);
    setModalCancelLabel(undefined);
    setModalConfirmLabel(undefined);
    setModalOnAction(undefined);
    setModalOnCancel(undefined);
    setModalShowActionButton(false);
  }, []);

  const showAlert = useCallback(
    (title: string, message: string) => {
      setModalTitle(title);
      setModalMsg(message);
      setModalResult(true);
      setModalShowActionButton(true);
      setModalOnAction(() => resetModal);
      setModalVisible(true);
    },
    [resetModal],
  );

  const delay = useCallback((ms: number) => new Promise<void>((res) => setTimeout(res, ms)), []);

  // Programmatically update the email field (runs validation and updates form state)
  const setEmailProgrammatically = useCallback(
    (nextEmail: string) => {
      const result = validateInput("email", nextEmail);
      dispatchFormState({
        inputId: "email",
        validationResult: result,
        inputValue: nextEmail,
      });
    },
    [dispatchFormState],
  );

  // On mount, preload remembered email (if any) and set checkbox
  useEffect(() => {
    (async () => {
      try {
        const remember = await RNAsyncStorage.getItem(REMEMBER_ME_KEY);
        const rememberedEmail = await RNAsyncStorage.getItem(REMEMBER_EMAIL_KEY);
        if (remember === "true" && rememberedEmail) {
          setChecked(true);
          setEmailProgrammatically(rememberedEmail);
        }
      } catch {
        // ignore
      }
    })();
  }, [setEmailProgrammatically]);

  useEffect(() => {
    (async () => {
      try {
        const notice = await RNAsyncStorage.getItem(AUTH_NOTICE_KEY);
        if (notice === AUTH_NOTICE_SESSION_EXPIRED) {
          await RNAsyncStorage.removeItem(AUTH_NOTICE_KEY);
          showAlert(t("alerts.information"), t("alerts.sessionExpired"));
        }
      } catch {}
    })();
  }, [showAlert, t]);

  // When checkbox toggles off, clear stored values and email field
  const onRememberMeChange = useCallback(
    async (checked: boolean) => {
      setChecked(checked);
      if (!checked) {
        try {
          await RNAsyncStorage.removeItem(REMEMBER_ME_KEY);
          await RNAsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
        } catch {}
        setEmailProgrammatically("");
      }
    },
    [setEmailProgrammatically],
  );

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
      showAlert(t("alerts.errorTitle"), error);
    }
  }, [error, t, showAlert]);

  // Handle login with email and password
  const loginHandler = async () => {
    if (!formState.formIsValid) {
      showAlert(t("auth.invalidInputTitle"), t("auth.invalidInputMessage"));
      return;
    }

    setIsLoading(true);
    const startedAt = Date.now();
    try {
      const { email, password } = formState.inputValues;
      const result: LoginResult = await authCtx.login(email, password);

      if ("status" in result && result.status === API_STATUS.OK) {
        // console.log("Login successful:", result);
        const applyResult = await applyPostLogin(result.data, authCtx, {
          localMpStatus,
          setMpStatus,
          setAccountAccess,
          setEmailStatus,
        });
        if (!applyResult.ok) {
          resetModal();
          showAlert(t("alerts.errorTitle"), applyResult.reason || t("auth.loginMissingTokens"));
        } else {
          // Persist or clear Remember Me preference and email
          try {
            if (isChecked) {
              await RNAsyncStorage.setItem(REMEMBER_ME_KEY, "true");
              await RNAsyncStorage.setItem(REMEMBER_EMAIL_KEY, email);
            } else {
              await RNAsyncStorage.removeItem(REMEMBER_ME_KEY);
              await RNAsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
            }
          } catch {}
        }
      } else {
        resetModal();
        showAlert(t("alerts.errorTitle"), t("auth.loginFailed"));
      }
    } catch (err) {
      // console.log("Login error:", err);
      resetModal();
      showAlert(t("alerts.errorTitle"), t("auth.loginError"));
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 3000) {
        await delay(3000 - elapsed); // Keep min visibility for preview
      }
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.area,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <Header />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
              {t("auth.loginTitleLine1")}
            </Text>
            <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
              {t("auth.loginTitleLine2")}
            </Text>
          </View>
          <InputWithTooltip
            id="email"
            value={formState.inputValues.email}
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
          <View style={styles.checkBoxContainer}>
            <Checkbox
              style={styles.checkbox}
              value={isChecked}
              color={isChecked ? COLORS.primary : dark ? COLORS.white : "gray"}
              onValueChange={onRememberMeChange}
            />
            <Text
              style={[
                styles.privacy,
                {
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              {" "}
              {t("auth.rememberMe")}
            </Text>
          </View>
          <ButtonFilled
            title={t("auth.loginButton")}
            onPress={loginHandler}
            style={styles.button}
            isLoading={isLoading}
            disabled={isLoading}
          />
          <TouchableOpacity onPress={() => navigate("ForgotPasswordMethods")}>
            <Text
              style={[
                styles.forgotPasswordBtnText,
                {
                  color: dark ? COLORS.white : COLORS.primary,
                },
              ]}
            >
              {t("auth.forgotPasswordQuestion")}
            </Text>
          </TouchableOpacity>
          {/* 
          <View>
            <OrSeparator text={t("auth.orContinueWith")} />
            <View style={styles.socialBtnContainer}>
              <AppleSignInButton />
              <GoogleSignInButton />
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
            {t("auth.dontHaveAccount")}
          </Text>
          <TouchableOpacity onPress={() => navigate("SignUp")}>
            <Text
              style={[
                styles.bottomRight,
                {
                  color: dark ? COLORS.white : COLORS.primary,
                },
              ]}
            >
              {"  "}
              {t("auth.signUpButton")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Login flow loading overlay with min 3s during sequential requests */}
      <LoadingModal
        visible={isLoading || modalVisible}
        message={isLoading ? undefined : modalMsg}
        messageKey={isLoading ? "loading.default" : undefined}
        titleKey={isLoading ? undefined : modalTitle}
        showSpinner={isLoading || (!modalResult && !modalConfirmMode)}
        resultMode={modalResult}
        confirmMode={modalConfirmMode}
        showActionButton={modalResult || modalConfirmMode || modalShowActionButton}
        onAction={modalOnAction || resetModal}
        onCancel={modalOnCancel || resetModal}
        actionLabel={modalActionLabel}
        cancelLabel={modalCancelLabel}
        confirmLabel={modalConfirmLabel}
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
  checkBoxContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // <--- Add this line
    marginVertical: 18,
    width: "100%",
  },
  checkbox: {
    marginRight: 8,
    height: 16,
    width: 16,
    borderRadius: 4,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  privacy: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.black,
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
  forgotPasswordBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 12,
  },
});

export default SignInScreen;
