import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useContext, useReducer, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet } from "react-native";

import PasswordDetailForm from "../components/PasswordDetailForm";
import PasswordGeneratorSheet, {
  PasswordGeneratorSheetRef,
} from "../components/PasswordGeneratorSheet";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS } from "../constants";
import { BottomTabNavProp } from "../navigation/types";
import { AuthContext } from "../store/auth-context";
import { useEntitlements } from "../store/entitlements-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateInput } from "../utils/actions/formActions";
import { computePasswordStrength } from "../utils/passwordStrength";
import { reducer } from "../utils/reducers/formReducers";

const initialState = {
  inputValues: {
    name: "",
    userName: "",
    password: "",
    url: "",
    notes: "",
    tags: "",
    lastUpdated: "",
  },
  inputValidities: {
    name: false,
    userName: undefined,
    password: undefined,
    url: undefined,
    notes: undefined,
    tags: undefined,
  },
  formIsValid: false,
};

interface NewPasswordTabProps {
  initialSyncType?: "cloud" | "local";
}

const NewPasswordTab = ({ initialSyncType }: NewPasswordTabProps) => {
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [syncType, setSyncType] = useState<"local" | "cloud">(initialSyncType || "cloud");
  const [isLoading, setIsLoading] = useState(false);
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavProp<"Cart">>();
  const [formState, dispatchFormState] = useReducer(reducer, initialState);
  const authCtx = useContext(AuthContext);
  const { t } = useTranslation("common");
  const genRef = useRef<PasswordGeneratorSheetRef>(null);
  const { canCreatePasswordCloudAuto, refreshEntitlements } = useEntitlements();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult, setModalResult] = useState(false);
  const [modalScore, setModalScore] = useState<number | null>(null);
  const [modalMsgKey, setModalMsgKey] = useState<string | undefined>(undefined);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalConfirmMode, setModalConfirmMode] = useState(false);
  const [modalActionLabel, setModalActionLabel] = useState<string | undefined>(undefined);
  const [modalCancelLabel, setModalCancelLabel] = useState<string | undefined>(undefined);
  const [modalConfirmLabel, setModalConfirmLabel] = useState<string | undefined>(undefined);
  const [modalOnAction, setModalOnAction] = useState<(() => void) | undefined>(undefined);
  const [modalOnCancel, setModalOnCancel] = useState<(() => void) | undefined>(undefined);
  const [modalShowActionButton, setModalShowActionButton] = useState(false);

  const resetModal = useCallback(() => {
    setModalVisible(false);
    setModalResult(false);
    setModalScore(null);
    setModalMsgKey(undefined);
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

  const handleModalAction = useCallback(() => {
    resetModal();
    dispatchFormState({ type: "RESET_FORM", initialState });
    navigation.navigate("Password", { initialTab: syncType });
  }, [navigation, resetModal, syncType]);

  // Ensure syncType respects gating and initialSyncType on focus/reset
  useFocusEffect(
    useCallback(() => {
      dispatchFormState({ type: "RESET_FORM", initialState });

      const initSync = async () => {
        if (initialSyncType === "local") {
          setSyncType("local");
        } else {
          const gate = await canCreatePasswordCloudAuto();
          setSyncType(gate.allowed ? "cloud" : "local");
        }
      };

      initSync();
    }, [canCreatePasswordCloudAuto, initialSyncType]),
  );
  const openGenerator = () => {
    genRef.current?.open();
  };

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

  // Function to handle saving the password
  const handleSavePassword = async () => {
    // Trigger validation for all fields to ensure error messages are shown
    Object.keys(formState.inputValues).forEach((key) => {
      inputChangedHandler(key, (formState.inputValues as Record<string, string>)[key]);
    });

    if (!formState.formIsValid) {
      showAlert(t("alerts.validationTitle"), t("alerts.requiredFieldsMissing"));
      return;
    }

    const gate = await canCreatePasswordCloudAuto();
    const saveToCloud = syncType === "cloud" && gate.allowed;
    if (syncType === "cloud" && !gate.allowed) {
      setModalTitle(t("alerts.information"));
      setModalMsg(gate.reason || t("alerts.cloudNotAllowed"));
      setModalConfirmMode(true);
      setModalCancelLabel(t("common.cancel"));
      setModalConfirmLabel(t("upgrade.upgrade"));
      setModalOnAction(() => () => {
        resetModal();
        navigation.navigate("SettingsUpgrade");
      });
      setModalOnCancel(() => resetModal);
      setModalVisible(true);
      return;
    }
    try {
      setIsLoading(true);
      // Show loading modal while saving
      setModalMsgKey("common.saving");
      setModalResult(false);
      setModalVisible(true);
      const response = await authCtx.addNewPassword(
        formState.inputValues as Record<string, string>,
        saveToCloud,
      );
      if (response && response.status === 201) {
        // Compute score and switch modal to result mode
        const pwd = (formState.inputValues as Record<string, string>)?.password || "";
        const strength = computePasswordStrength(pwd, { t });
        setModalScore(strength.score);
        setModalMsgKey("alerts.passwordSaved");
        setModalResult(true);
        try {
          await refreshEntitlements();
        } catch (err) {
          // silent fail
        }
        // After user taps OK in modal, close and go back
      } else {
        resetModal();
        showAlert(t("alerts.errorTitle"), response?.message || t("alerts.passwordSaveFailed"));
      }
    } catch (error) {
      console.error("Error saving password:", error);
      resetModal();
      showAlert(t("alerts.errorTitle"), t("alerts.unexpected"));
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasswordDetail = () => {
    return (
      <PasswordDetailForm
        inputValues={formState.inputValues}
        inputValidities={formState.inputValidities}
        inputChangedHandler={inputChangedHandler}
        syncType={syncType}
        setSyncType={async (next) => {
          if (next === "cloud") {
            const gate = await canCreatePasswordCloudAuto();
            if (!gate.allowed) {
              setModalTitle(t("alerts.information"));
              setModalMsg(gate.reason || t("alerts.cloudNotAllowed"));
              setModalConfirmMode(true);
              setModalCancelLabel(t("common.cancel"));
              setModalConfirmLabel(t("upgrade.upgrade"));
              setModalOnAction(() => () => {
                resetModal();
                navigation.navigate("SettingsUpgrade");
              });
              setModalOnCancel(() => resetModal);
              setModalVisible(true);
              setSyncType("local");
              return;
            }
          }
          setSyncType(next);
        }}
        isPasswordHidden={isPasswordHidden}
        scrollable={true}
        showLastUpdated={false}
        showPasswordPlusIcon={true}
        onPasswordPlusPress={openGenerator}
        showPasswordVisibilityIcon={true}
        onTogglePasswordVisibility={() => setIsPasswordHidden((prev) => !prev)}
        onSave={handleSavePassword}
        isLoading={isLoading}
        buttonTitle={t("common.save")}
      />
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderPasswordDetail()}
        <PasswordGeneratorSheet
          ref={genRef}
          onConfirm={(pwd) => inputChangedHandler("password", pwd)}
        />
      </View>
      <LoadingModal
        visible={modalVisible}
        message={modalMsg}
        messageKey={modalMsgKey}
        titleKey={modalTitle}
        showSpinner={isLoading && !modalResult && !modalConfirmMode}
        resultMode={modalResult}
        confirmMode={modalConfirmMode}
        opKind="create"
        score={modalScore ?? undefined}
        showActionButton={modalResult || modalConfirmMode || modalShowActionButton}
        onAction={modalOnAction || handleModalAction}
        onCancel={modalOnCancel || (() => setModalVisible(false))}
        actionLabel={modalActionLabel}
        cancelLabel={modalCancelLabel}
        confirmLabel={modalConfirmLabel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.tertiaryWhite,
  },
});

export default NewPasswordTab;
