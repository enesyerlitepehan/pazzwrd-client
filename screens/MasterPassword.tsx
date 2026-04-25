import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, ScrollView, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiUpdateMpStatusSkip } from "../api/api";
import Button from "../components/Button";
import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import InputWithTooltip from "../components/InputWithTooltip";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useSecurity } from "../store/security-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateInput } from "../utils/actions/formActions";
import { reducer } from "../utils/reducers/formReducers";
import { deriveKEK_MP, generateDEK, wrapDEKWithMP } from "../utils/util";

const initialState = {
  inputValues: {
    masterPassword: "",
    confirmMasterPassword: "",
  },
  inputValidities: {
    masterPassword: false,
    confirmMasterPassword: false,
  },
  formIsValid: false,
};

const MasterPassword: React.FC = () => {
  const { t } = useTranslation("common");
  const { colors, dark } = useTheme();
  const { navigate, addListener } = useNavigation<any>();
  const authCtx = useContext(AuthContext);
  const { mpStatus, setMpStatus, setAccountAccess, emailStatus } = useSecurity();

  const allowExitRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Prevent default behavior (going back)
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", onBackPress);

      return () => backHandler.remove();
    }, []),
  );

  useEffect(() => {
    const unsubscribe = addListener("beforeRemove", (e: any) => {
      if (allowExitRef.current) {
        return;
      }
      e.preventDefault();
    });

    return unsubscribe;
  }, [addListener]);

  const [hideMp, setHideMp] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);
  const [mismatchError, setMismatchError] = useState<string | undefined>(undefined);

  // Loading modal visibility for Continue action
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formState, dispatchFormState] = useReducer(reducer, initialState);

  // Disable Continue unless both fields are valid and match
  const continueDisabled = useMemo(() => {
    const mp = formState.inputValues.masterPassword || "";
    const cmp = formState.inputValues.confirmMasterPassword || "";

    const mpErr = validateInput("masterPassword", mp);
    const cmpErr = validateInput("confirmMasterPassword", cmp);

    if (mpErr || cmpErr) return true; // empty or < min length
    return mp !== cmp; // mismatch
  }, [formState.inputValues]);

  const inputChangedHandler = useCallback(
    (inputId: string, inputValue: string) => {
      const result = validateInput(inputId, inputValue);
      dispatchFormState({
        inputId,
        validationResult: result,
        inputValue,
      });

      // Cross-field validation for matching passwords
      const nextValues = {
        ...formState.inputValues,
        [inputId]: inputValue,
      } as typeof formState.inputValues;
      const mp = nextValues.masterPassword || "";
      const cmp = nextValues.confirmMasterPassword || "";

      const mpErr = validateInput("masterPassword", mp);
      const cmpErr = validateInput("confirmMasterPassword", cmp);

      if (!mpErr && !cmpErr && mp.length > 0 && cmp.length > 0) {
        if (mp !== cmp) {
          setMismatchError(t("errors.passwordsDoNotMatch"));
        } else {
          setMismatchError(undefined);
        }
      } else {
        // Do not show mismatch while base validations fail or fields are empty
        setMismatchError(undefined);
      }
    },
    [dispatchFormState, formState.inputValues],
  );

  const handleSkip = async () => {
    try {
      const resp = await apiUpdateMpStatusSkip();
      // If server explicitly rejects (e.g. 409), reconcile local state.
      if (resp?.status === 409) {
        await setMpStatus("CONFIGURED");
        const dek = await authCtx.getDEK();
        allowExitRef.current = true;
        if (dek) {
          navigate("TabLayout");
        } else {
          // If server says configured but we have no DEK, trigger recovery
          navigate("ConfirmMasterPassword");
        }
        return;
      }
      if (resp?.ok) {
        await setMpStatus("SKIPPED");
        await setAccountAccess("LOCAL_ONLY");
        allowExitRef.current = true;
        navigate("TabLayout");
        return;
      }
    } catch (err) {
      // Network error or other; we allow local skip for now as fallback
    }

    try {
      await setMpStatus("SKIPPED");
      await setAccountAccess("LOCAL_ONLY");
    } catch {}
    allowExitRef.current = true;
    navigate("TabLayout");
  };

  const handleContinue = async () => {
    try {
      // Validate inputs
      const mp = formState.inputValues.masterPassword || "";
      const cmp = formState.inputValues.confirmMasterPassword || "";

      const mpErr = validateInput("masterPassword", mp);
      const cmpErr = validateInput("confirmMasterPassword", cmp);

      // Update state to show validation errors if fields untouched
      dispatchFormState({
        inputId: "masterPassword",
        validationResult: mpErr,
        inputValue: mp,
      });
      dispatchFormState({
        inputId: "confirmMasterPassword",
        validationResult: cmpErr,
        inputValue: cmp,
      });

      if (!mpErr && !cmpErr && mp.length > 0 && cmp.length > 0 && mp !== cmp) {
        setMismatchError(t("errors.passwordsDoNotMatch"));
      } else if (mp === cmp) {
        setMismatchError(undefined);
      }

      // Block continue if any error or mismatch
      if (mpErr || cmpErr || mp !== cmp) {
        return;
      }

      // Show loading while performing cryptographic/bootstrap operations
      setLoadingVisible(true);
      const res2 = await authCtx.bootstrapInit();
      if (res2?.status === 409 || res2?.code === "MP_ALREADY_CONFIGURED") {
        await setMpStatus("CONFIGURED");
        await setAccountAccess(emailStatus === "VERIFIED" ? "CLOUD" : "LOCAL_ONLY");
        const existingDek = await authCtx.getDEK();
        allowExitRef.current = true;
        if (existingDek) {
          navigate("TabLayout");
        } else {
          navigate("ConfirmMasterPassword");
        }
        return;
      }
      const saltMP = res2?.data?.saltMP;
      console.log("saltMP", res2);
      const kdfParams = res2?.data?.kdfParams;
      if (res2?.status !== 200 || !saltMP || !kdfParams?.iterations || !kdfParams?.dkLen) {
        setErrorMessage(t("alerts.unexpected") || "An unexpected error occurred");
        setErrorVisible(true);
        return;
      }
      const res3 = await deriveKEK_MP(formState.inputValues.masterPassword, saltMP, {
        iterations: kdfParams.iterations,
        dkLen: kdfParams.dkLen,
      });

      //DEK üret
      const genDEK = await generateDEK();

      // DEK'yi MP'ye wrap et
      const wrapDEK = await wrapDEKWithMP(genDEK, res3);
      const bootstrapResult = await authCtx.setWrapDEK(wrapDEK, genDEK);
      if (bootstrapResult?.status !== 200 && bootstrapResult?.status !== 201) {
        setErrorMessage(
          bootstrapResult?.message || t("alerts.unexpected") || "An unexpected error occurred",
        );
        setErrorVisible(true);
        return;
      }

      // Mark MP as configured; upgrade access to CLOUD only if email is verified
      await setMpStatus("CONFIGURED");
      await setAccountAccess(emailStatus === "VERIFIED" ? "CLOUD" : "LOCAL_ONLY");
      allowExitRef.current = true;
      navigate("TabLayout");
    } catch {
      setErrorMessage(t("alerts.unexpected") || "An unexpected error occurred");
      setErrorVisible(true);
    } finally {
      setLoadingVisible(false);
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("masterPassword.title")} showBack={false} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.center, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {t("masterPassword.description")}
          </Text>
          <InputWithTooltip
            id="masterPassword"
            onInputChanged={inputChangedHandler}
            placeholder={t("masterPassword.passwordPlaceholder")}
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            tooltipInfo={t("masterPassword.password")}
            secureTextEntry={hideMp}
            showVisibilityToggle
            onToggleVisibility={() => setHideMp((prev) => !prev)}
            value={formState.inputValues.masterPassword}
            errorText={formState.inputValidities.masterPassword}
          />

          <InputWithTooltip
            id="confirmMasterPassword"
            onInputChanged={inputChangedHandler}
            placeholder={t("masterPassword.confirmPlaceholder")}
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            tooltipInfo={t("masterPassword.password")}
            secureTextEntry={hideConfirm}
            showVisibilityToggle
            onToggleVisibility={() => setHideConfirm((prev) => !prev)}
            value={formState.inputValues.confirmMasterPassword}
            errorText={mismatchError || formState.inputValidities.confirmMasterPassword}
          />
        </ScrollView>
      </View>

      <View style={styles.bottomContainer}>
        {mpStatus !== "CONFIGURED" && (
          <Button
            title={t("masterPassword.skip")}
            style={{
              width: (SIZES.width - 32) / 2 - 8,
              borderRadius: 32,
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
            }}
            textColor={dark ? COLORS.white : COLORS.black}
            onPress={handleSkip}
          />
        )}
        <ButtonFilled
          title={t("masterPassword.continue")}
          style={
            mpStatus === "CONFIGURED"
              ? { width: SIZES.width - 32, borderRadius: 32 }
              : styles.continueButton
          }
          onPress={handleContinue}
          disabled={continueDisabled}
        />
      </View>
      <LoadingModal
        visible={loadingVisible || errorVisible}
        message={errorVisible ? errorMessage : undefined}
        messageKey={errorVisible ? undefined : "loading.default"}
        titleKey={errorVisible ? "alerts.errorTitle" : undefined}
        resultMode={errorVisible}
        showActionButton={errorVisible}
        onAction={() => setErrorVisible(false)}
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
  center: {
    flex: 1,
    justifyContent: "center",
    marginBottom: 144,
  },
  title: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginVertical: 32,
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
});

export default MasterPassword;
