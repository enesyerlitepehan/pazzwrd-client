import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import React, { useCallback, useContext, useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGetMpStatus, apiGetWrappedDEK, apiBootstrap, apiUpdateWrappedDEK } from "../api/api";
import Button from "../components/Button";
import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import InputWithTooltip from "../components/InputWithTooltip";
import { useToast } from "../components/ToastProvider";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES } from "../constants";
import { setPrivateKey, setPublicKey } from "../service/key-management-service";
import { AuthContext } from "../store/auth-context";
import { useSecurity } from "../store/security-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateInput } from "../utils/actions/formActions";
import { getLocalWrapVersion, updateLocalWrapInfoFromServer } from "../utils/dekWrapVersion";
import { reducer } from "../utils/reducers/formReducers";
import { deriveKEK_MP, generateDEK, wrapDEKWithMP, aeadOpen } from "../utils/util";

// Settings screen for creating or changing Master Password based on mpStatus
const SettingsMasterPassword: React.FC = () => {
  const { t } = useTranslation("common");
  const { colors, dark } = useTheme();
  const { navigate } = useNavigation<{ navigate: (route: string) => void }>();
  const authCtx = useContext(AuthContext);
  const { setMpStatus, setAccountAccess, emailStatus } = useSecurity();
  const toast = useToast();

  const [mpStatus, setMpStatusLocal] = useState<
    null | "NONE" | "SKIPPED" | "CONFIGURED" | "PENDING" | "SET"
  >(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [modalOpKind, setModalOpKind] = useState<"create" | "update">("create");

  const initialState = {
    inputValues: {
      currentMasterPassword: "",
      masterPassword: "",
      confirmMasterPassword: "",
    },
    inputValidities: {
      currentMasterPassword: undefined as string | undefined,
      masterPassword: false as unknown as string | undefined,
      confirmMasterPassword: false as unknown as string | undefined,
    },
    formIsValid: false,
  };
  const [formState, dispatchFormState] = useReducer(reducer, initialState);
  const [hideCurrent, setHideCurrent] = useState(true);
  const [hideMp, setHideMp] = useState(true);
  const [hideConfirm, setHideConfirm] = useState(true);

  const inputChangedHandler = useCallback((inputId: string, inputValue: string) => {
    let validationResult: string | undefined;
    if (inputId === "currentMasterPassword") {
      validationResult = inputValue ? undefined : "Required";
    } else {
      validationResult = validateInput(inputId, inputValue);
    }
    dispatchFormState({ inputId, validationResult, inputValue });
  }, []);

  // Fetch mpStatus when screen focuses
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      (async () => {
        try {
          const resp = await apiGetMpStatus();
          if (cancelled) return;
          const status = resp?.data?.mpStatus || "NONE";
          setMpStatusLocal(status);
        } catch (e) {
          if (!cancelled) setMpStatusLocal("NONE");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // Create MP flow for NONE/SKIPPED
  const handleCreate = useCallback(async () => {
    setError(null);

    const mp = formState.inputValues.masterPassword;
    const mp2 = formState.inputValues.confirmMasterPassword;
    if (!mp || !mp2) {
      setError(t("alerts.validationRequiredFields") || "Please fill in all required fields");
      return;
    }
    if (
      formState.inputValidities.masterPassword ||
      formState.inputValidities.confirmMasterPassword
    ) {
      setError(t("alerts.validationTitle") || "Validation error");
      return;
    }

    setSubmitting(true);
    setModalOpKind("create");
    setShowModal(true);
    setIsSuccess(false);
    try {
      // Bootstrap init to get salt/kdf
      const res2 = await authCtx.bootstrapInit();
      const saltMP = res2?.data?.saltMP;
      const kdfParams = res2?.data?.kdfParams;
      if (!saltMP || !kdfParams) {
        console.error("handleCreate: bootstrapInit failed", res2);
        setError(t("alerts.unexpected") || "Unexpected error during bootstrap init");
        setShowModal(false);
        return;
      }
      const kek = await deriveKEK_MP(mp, saltMP, {
        iterations: kdfParams.iterations,
        dkLen: kdfParams.dkLen,
      });
      const DEK = await generateDEK();
      const wrapped = await wrapDEKWithMP(DEK, kek);
      try {
        const bootstrapRes = await authCtx.setWrapDEK(wrapped, DEK);
        console.log("handleCreate: setWrapDEK result:", bootstrapRes);
      } catch (bsErr) {
        console.error("handleCreate: setWrapDEK threw error:", bsErr);
      }

      await setMpStatus("CONFIGURED");
      await setAccountAccess(emailStatus === "VERIFIED" ? "CLOUD" : "LOCAL_ONLY");
      setIsSuccess(true);
    } catch (e) {
      setError(t("alerts.unexpected") || "An unexpected error occurred");
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  }, [authCtx, emailStatus, formState, navigate, setAccountAccess, setMpStatus, t]);

  // Change MP flow for CONFIGURED
  const handleChange = useCallback(async () => {
    setError(null);

    const cur = formState.inputValues.currentMasterPassword;
    const mp = formState.inputValues.masterPassword;
    const mp2 = formState.inputValues.confirmMasterPassword;
    if (!cur || !mp || !mp2) {
      setError(t("alerts.validationRequiredFields") || "Please fill in all required fields");
      return;
    }
    if (
      formState.inputValidities.masterPassword ||
      formState.inputValidities.confirmMasterPassword ||
      formState.inputValidities.currentMasterPassword
    ) {
      setError(t("alerts.validationTitle") || "Validation error");
      return;
    }

    setSubmitting(true);
    setModalOpKind("update");
    setShowModal(true);
    setIsSuccess(false);
    try {
      const resp = await apiGetWrappedDEK();
      const saltMP = resp?.data?.saltMP;
      const kdfParams = resp?.data?.kdfParams;
      const wrappedServer = resp?.data?.dekWrappedByMP;
      const kdfVersion = kdfParams?.kdfVersion ?? 1;
      if (!saltMP || !kdfParams || !wrappedServer?.nonce || !wrappedServer?.ct) {
        setError(t("alerts.unexpected") || "Unexpected error");
        setShowModal(false);
        return;
      }
      // Derive KEK from current MP and unwrap DEK
      const kekCurrent = await deriveKEK_MP(cur, saltMP, {
        iterations: kdfParams.iterations,
        dkLen: kdfParams.dkLen,
      });
      let DEK: Uint8Array;
      try {
        DEK = aeadOpen(kekCurrent, wrappedServer.nonce, wrappedServer.ct);
      } catch (e) {
        setError(t("errors.invalidMasterPassword"));
        setShowModal(false);
        return;
      }
      // Derive KEK for new MP and wrap DEK
      const kekNew = await deriveKEK_MP(mp, saltMP, {
        iterations: kdfParams.iterations,
        dkLen: kdfParams.dkLen,
      });
      const wrappedNew = await wrapDEKWithMP(DEK, kekNew);
      // Persist locally (store DEK) and update server explicitly with known kdfVersion
      try {
        await authCtx.setWrapDEK(null, DEK);
      } catch {}
      // Prefer versioned update (PUT /keys/wrapped-dek) with prevGeneration; fallback to bootstrap
      try {
        const prevGeneration = (await getLocalWrapVersion()) ?? undefined;
        await apiUpdateWrappedDEK({
          prevGeneration,
          DEK_wrapped_by_MP: wrappedNew,
          kdfVersion,
        });
      } catch (e) {
        // Fallback: existing bootstrap endpoint
        try {
          await apiBootstrap({ DEK_wrapped_by_MP: wrappedNew, kdfVersion });
        } catch {}
      }
      // Refresh local wrap info (version + meta) from server
      try {
        await updateLocalWrapInfoFromServer();
      } catch {}
      try {
        toast.show(t("alerts.updatedSuccessfully") || "Master Password updated.");
      } catch {}
      await setMpStatus("CONFIGURED");
      await setAccountAccess(emailStatus === "VERIFIED" ? "CLOUD" : "LOCAL_ONLY");
      setIsSuccess(true);
    } catch (e) {
      setError(t("alerts.unexpected") || "An unexpected error occurred");
      setShowModal(false);
    } finally {
      setSubmitting(false);
    }
  }, [authCtx, emailStatus, formState, navigate, setAccountAccess, setMpStatus, t]);

  const isCreate = mpStatus === "NONE" || mpStatus === "SKIPPED";

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Master Password" />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.center, { paddingBottom: 24 }]}
        >
          {loading ? null : isCreate ? (
            <>
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
                onToggleVisibility={() => setHideMp((p) => !p)}
                value={formState.inputValues.masterPassword}
              />
              <InputWithTooltip
                id="confirmMasterPassword"
                onInputChanged={inputChangedHandler}
                placeholder={t("masterPassword.confirmPlaceholder")}
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                tooltipInfo={t("masterPassword.password")}
                secureTextEntry={hideConfirm}
                showVisibilityToggle
                onToggleVisibility={() => setHideConfirm((p) => !p)}
                value={formState.inputValues.confirmMasterPassword}
              />
              {error ? <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text> : null}
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                {t("confirmMasterPassword.description") ||
                  "To change your Master Password, confirm your current one, then enter the new password."}
              </Text>
              <InputWithTooltip
                id="currentMasterPassword"
                onInputChanged={inputChangedHandler}
                placeholder={"Current master password"}
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                tooltipInfo={t("masterPassword.password")}
                secureTextEntry={hideCurrent}
                showVisibilityToggle
                onToggleVisibility={() => setHideCurrent((p) => !p)}
                value={formState.inputValues.currentMasterPassword}
              />
              <InputWithTooltip
                id="masterPassword"
                onInputChanged={inputChangedHandler}
                placeholder={t("masterPassword.passwordPlaceholder")}
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                tooltipInfo={t("masterPassword.password")}
                secureTextEntry={hideMp}
                showVisibilityToggle
                onToggleVisibility={() => setHideMp((p) => !p)}
                value={formState.inputValues.masterPassword}
              />
              <InputWithTooltip
                id="confirmMasterPassword"
                onInputChanged={inputChangedHandler}
                placeholder={t("masterPassword.confirmPlaceholder")}
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                tooltipInfo={t("masterPassword.password")}
                secureTextEntry={hideConfirm}
                showVisibilityToggle
                onToggleVisibility={() => setHideConfirm((p) => !p)}
                value={formState.inputValues.confirmMasterPassword}
              />
              {error ? <Text style={{ color: COLORS.error, marginTop: 8 }}>{error}</Text> : null}
            </>
          )}
        </ScrollView>
      </View>
      <View style={styles.bottomContainer}>
        <Button
          title={t("common.cancel") || "Cancel"}
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
          title={
            isCreate ? t("masterPassword.continue") || "Continue" : t("common.update") || "Update"
          }
          style={styles.submitButton}
          onPress={isCreate ? handleCreate : handleChange}
        />
      </View>
      <LoadingModal
        visible={loading || showModal}
        resultMode={loading ? false : isSuccess}
        opKind={modalOpKind}
        titleKey={loading ? undefined : "alerts.successTitle"}
        messageKey={
          loading
            ? "loading.default"
            : modalOpKind === "create"
              ? "password.passwordSaved"
              : "common.update"
        }
        showActionButton={loading ? false : isSuccess}
        onAction={() => {
          setShowModal(false);
          navigate("TabLayout");
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, backgroundColor: COLORS.white, padding: 16 },
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
  submitButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
  },
});

export default SettingsMasterPassword;
