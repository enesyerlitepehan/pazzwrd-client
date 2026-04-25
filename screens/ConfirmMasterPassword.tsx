import { useNavigation } from "expo-router";
import React, { useContext, useEffect, useMemo, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGetWrappedDEK } from "../api/api";
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
import { updateLocalWrapInfoFromServer } from "../utils/dekWrapVersion";
import { reducer } from "../utils/reducers/formReducers";
import { deriveKEK_MP, aeadOpen } from "../utils/util";

interface Nav {
  navigate: (route: string) => void;
}

const initialState = {
  inputValues: {
    masterPassword: "",
  },
  inputValidities: {
    masterPassword: false,
  },
  formIsValid: false,
};

const ConfirmMasterPassword: React.FC = () => {
  const { t } = useTranslation("common");
  const { colors, dark } = useTheme();
  const { navigate } = useNavigation<Nav>();
  const authCtx = useContext(AuthContext);
  const { setMpStatus, setAccountAccess, emailStatus } = useSecurity();

  const [formState, dispatchFormState] = useReducer(reducer, initialState);
  const [submitting, setSubmitting] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [kdfParams, setKdfParams] = useState<{
    iterations: number;
    dkLen: number;
  } | null>(null);
  const [saltMP, setSaltMP] = useState<string | null>(null);
  const [wrapped, setWrapped] = useState<{ nonce: string; ct: string } | null>(null);

  // Disable Confirm unless the MP passes validation (>= 6 chars, not empty)
  const confirmDisabled = useMemo(() => {
    const mp = formState.inputValues.masterPassword || "";
    const mpErr = validateInput("masterPassword", mp);
    return submitting || !!mpErr;
  }, [formState.inputValues.masterPassword, submitting]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Get server wrapped DEK
        const resp = await apiGetWrappedDEK();
        const serverWrapped = resp?.data?.dekWrappedByMP;
        const saltMP = resp?.data?.saltMP || null;
        setSaltMP(saltMP);
        const kdfParams = resp?.data?.kdfParams;
        if (kdfParams) {
          setKdfParams({
            iterations: kdfParams.iterations,
            dkLen: kdfParams.dkLen,
          });
        }
        if (
          (resp.status === 200 || resp.status === 201) &&
          serverWrapped &&
          typeof serverWrapped.nonce === "string" &&
          typeof serverWrapped.ct === "string"
        ) {
          if (mounted) setWrapped(serverWrapped);
        } else {
          if (mounted) {
            setErrorMessage(t("errors.generic"));
            setErrorVisible(true);
          }
        }
      } catch (e) {
        if (mounted) {
          setErrorMessage(t("errors.generic"));
          setErrorVisible(true);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const inputChangedHandler = (inputId: string, inputValue: string) => {
    const result = validateInput(inputId, inputValue);
    dispatchFormState({ inputId, validationResult: result, inputValue });
  };

  const handleConfirm = async () => {
    if (!saltMP || !kdfParams || !wrapped) {
      setErrorMessage(t("errors.generic"));
      setErrorVisible(true);
      return;
    }

    setSubmitting(true);
    // Yield a tick so LoadingModal can render before CPU-heavy crypto runs on JS thread
    // On Android, 0ms is often not enough to ensure the Modal is mounted and shown
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      const mp = formState.inputValues.masterPassword;
      // Derive KEK_MP
      const kek = await deriveKEK_MP(mp, saltMP, kdfParams);
      // Try open wrapped DEK — if it fails, aeadOpen throws
      try {
        const DEK = aeadOpen(kek, wrapped.nonce, wrapped.ct);
        if (!DEK || DEK.length !== 32) {
          setErrorMessage(t("errors.generic"));
          setErrorVisible(true);
          return;
        }
        const storeResult = await authCtx.setWrapDEK(null, DEK);
        if (storeResult?.success === false) {
          setErrorMessage(t("errors.generic"));
          setErrorVisible(true);
          return;
        }
        navigate("TabLayout");
        // Best-effort: sync wrapGeneration/meta locally from server without blocking vault access
        void updateLocalWrapInfoFromServer().catch(() => {});
      } catch (e) {
        setErrorMessage(t("errors.invalidMasterPassword"));
        setErrorVisible(true);
        return;
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("confirmMasterPassword.title")} onBackPress={() => authCtx.logout()} />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.center, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {t("confirmMasterPassword.description")}
          </Text>
          <InputWithTooltip
            id="masterPassword"
            onInputChanged={inputChangedHandler}
            placeholder={t("confirmMasterPassword.passwordPlaceholder")}
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            tooltipInfo={t("masterPassword.password")}
            secureTextEntry
            showVisibilityToggle
            value={formState.inputValues.masterPassword}
            errorText={formState.inputValidities.masterPassword}
          />
        </ScrollView>
      </View>
      <View style={styles.bottomContainer}>
        <Button
          title={t("common.cancel")}
          style={{
            width: (SIZES.width - 32) / 2 - 8,
            borderRadius: 32,
            backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
            borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
          }}
          textColor={dark ? COLORS.white : COLORS.black}
          onPress={() => navigate("TabLayout")}
        />
        <ButtonFilled
          title={t("confirmMasterPassword.confirm")}
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={confirmDisabled}
        />
      </View>
      <LoadingModal
        visible={submitting || errorVisible}
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
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, padding: 16, backgroundColor: COLORS.white },
  center: { flex: 1, justifyContent: "center", marginBottom: 144 },
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
  confirmButton: { width: (SIZES.width - 32) / 2 - 8, borderRadius: 32 },
});

export default ConfirmMasterPassword;
