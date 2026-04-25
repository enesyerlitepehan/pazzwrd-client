import { useNavigation } from "expo-router";
import React, { useCallback, useContext, useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import Input from "../components/Input";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES, icons, images } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateInput } from "../utils/actions/formActions";
import { reducer } from "../utils/reducers/formReducers";

const isTestMode = true;

const initialState = {
  inputValues: {
    email: isTestMode ? "example@gmail.com" : "",
  },
  inputValidities: {
    email: false,
  },
  formIsValid: false,
};

type Nav = {
  navigate: (value: string) => void;
};

const ForgotPasswordEmail = () => {
  const { t } = useTranslation("common");
  const { navigate } = useNavigation<Nav>();
  const [formState, dispatchFormState] = useReducer(reducer, initialState);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalResult, setModalResult] = useState(false);
  const [modalOnAction, setModalOnAction] = useState<(() => void) | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const showAlert = (
    title: string,
    message: string,
    result: boolean = true,
    onAction?: () => void,
  ) => {
    setModalTitle(title);
    setModalMsg(message);
    setModalResult(result);
    setModalOnAction(() => onAction);
    setModalVisible(true);
  };
  const { colors, dark } = useTheme();
  const authCtx = useContext(AuthContext);

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
      showAlert(t("forgotPassword.errorTitle"), error as any, true);
    }
  }, [error, t]);

  const handleForgotPassword = async () => {
    if (!formState.formIsValid) {
      showAlert(t("alerts.validationTitle"), t("forgotPassword.invalidEmailMessage"), true);
      return;
    }
    const { email } = formState.inputValues as any;
    setIsLoading(true);
    setModalResult(false);
    setModalTitle(undefined);
    setModalMsg(undefined);
    setModalOnAction(undefined);
    setModalVisible(true);
    try {
      const res = await authCtx.forgotPassword(email);
      if (res?.ok) {
        showAlert(
          t("forgotPassword.requestSuccessTitle"),
          t("forgotPassword.requestSuccessMessage"),
          true,
          () => navigate("Login"),
        );
      } else {
        showAlert(
          t("forgotPassword.requestFailedTitle"),
          res?.message || t("forgotPassword.unexpectedErrorMessage"),
          true,
        );
      }
    } catch {
      showAlert(t("forgotPassword.errorTitle"), t("forgotPassword.unexpectedErrorMessage"), true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("forgotPassword.methodsTitle")} />
        <ScrollView style={{ marginVertical: 54 }} showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
            <Image
              source={dark ? images.lightLogo : images.darkLogo}
              resizeMode="contain"
              style={styles.logo}
            />
          </View>
          <Text
            style={[
              styles.title,
              {
                color: dark ? COLORS.white : COLORS.black,
              },
            ]}
          >
            {t("forgotPassword.emailTitle")}
          </Text>
          <Input
            id="email"
            onInputChanged={inputChangedHandler}
            errorText={formState.inputValidities["email"]}
            placeholder={t("common.email")}
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            icon={icons.email}
            keyboardType="email-address"
          />
          <ButtonFilled
            title={t("forgotPassword.resetPassword")}
            onPress={handleForgotPassword}
            style={styles.button}
          />
          <TouchableOpacity onPress={() => navigate("Login")}>
            <Text
              style={[
                styles.forgotPasswordBtnText,
                {
                  color: dark ? COLORS.white : COLORS.primary,
                },
              ]}
            >
              {t("forgotPassword.rememberPasswordQuestion")}
            </Text>
          </TouchableOpacity>
          <View></View>
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
      <LoadingModal
        visible={isLoading || modalVisible}
        message={isLoading ? undefined : modalMsg}
        messageKey={isLoading ? "loading.default" : undefined}
        titleKey={isLoading ? undefined : modalTitle}
        resultMode={!isLoading && modalResult}
        showActionButton={!isLoading && modalResult}
        onAction={() => {
          setModalVisible(false);
          if (modalOnAction) modalOnAction();
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
  title: {
    fontSize: 26,
    fontFamily: "semiBold",
    color: COLORS.black,
    textAlign: "center",
    marginBottom: 22,
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

export default ForgotPasswordEmail;
