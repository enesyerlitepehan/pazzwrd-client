import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useReducer, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, ScrollView } from "react-native";

import CardDetailForm from "../components/CardDetailForm";
import LoadingModal from "../components/ui/LoadingModal";
import WalletCard from "../components/WalletCard";
import { COLORS } from "../constants";
import { BottomTabNavProp } from "../navigation/types";
import { AuthContext, getDEK as getDEKFromContext } from "../store/auth-context";
import { useEntitlements } from "../store/entitlements-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateInput } from "../utils/actions/formActions";
import {
  detectCardType,
  formatCardNumber as formatCardNumberUtil,
  CardType,
} from "../utils/cardUtils";
import { createId } from "../utils/passwordUtils";
import { reducer } from "../utils/reducers/formReducers";
import { generateIK, encryptItemWithIK, wrapIKWithDEK, toB64Url } from "../utils/util";

const isTestMode = false;

const initialState = {
  inputValues: {
    cardHolderName: isTestMode ? "Andrew Ainsley" : "",
    cardNumber: isTestMode ? "1234 5678 9012 3456" : "",
    expiryDate: isTestMode ? "12/25" : "",
    cvv: isTestMode ? "123" : "",
    bankName: isTestMode ? "" : "",
    cardType: isTestMode ? "VISA" : "",
    cardPassword: "",
  },
  inputValidities: {
    cardHolderName: undefined,
    cardNumber: undefined,
    expiryDate: undefined,
    cvv: undefined,
    bankName: false,
    nickname: undefined,
    cardType: undefined,
    cardPassword: undefined,
  },
  formIsValid: false,
};

interface NewCardTabProps {
  initialSyncType?: "cloud" | "local";
}

const NewCardTab = ({ initialSyncType }: NewCardTabProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavProp<"Cart">>();
  const [formState, dispatchFormState] = useReducer(reducer, initialState);
  const [syncType, setSyncType] = useState<"local" | "cloud">(initialSyncType || "cloud");
  const [isLoading, setIsLoading] = useState(false);
  const authCtx = useContext(AuthContext);
  const { t } = useTranslation("common");
  const { canCreateCardCloudAuto, refreshEntitlements } = useEntitlements();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult, setModalResult] = useState(false);
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
    navigation.navigate("Card", { initialTab: syncType });
  }, [navigation, resetModal, syncType]);

  // Ensure syncType respects gating and initialSyncType on focus/reset
  useFocusEffect(
    useCallback(() => {
      dispatchFormState({ type: "RESET_FORM", initialState });

      const initSync = async () => {
        if (initialSyncType === "local") {
          setSyncType("local");
        } else {
          const gate = await canCreateCardCloudAuto();
          setSyncType(gate.allowed ? "cloud" : "local");
        }
      };

      initSync();
    }, [canCreateCardCloudAuto, initialSyncType]),
  );

  const inputChangedHandler = useCallback(
    (inputId: string, inputValue: string) => {
      // Special handling for card number to format it and detect card type
      if (inputId === "cardNumber") {
        const formattedValue = formatCardNumberUtil(inputValue);
        const result = validateInput(inputId, formattedValue);

        // Detect card type from the card number
        const detectedCardType = detectCardType(formattedValue);

        // Update card number input
        dispatchFormState({
          inputId,
          validationResult: result,
          inputValue: formattedValue,
        });

        // Also update the card type automatically
        if (detectedCardType !== CardType.UNKNOWN) {
          dispatchFormState({
            inputId: "cardType",
            validationResult: undefined, // No validation error
            inputValue: detectedCardType,
          });
        }
      } else {
        const result = validateInput(inputId, inputValue);
        dispatchFormState({
          inputId,
          validationResult: result,
          inputValue,
        });
      }
    },
    [dispatchFormState],
  );

  // Render wallet card using the new component

  // Render card detail form using the new component

  const saveCardHandler = async () => {
    try {
      setIsLoading(true);

      // Trigger validation for all fields to ensure error messages are shown
      Object.keys(formState.inputValues).forEach((key) => {
        inputChangedHandler(key, (formState.inputValues as Record<string, string>)[key]);
      });

      // Validate required fields
      if (!formState.formIsValid) {
        console.log("Form is invalid");
        console.log(formState.inputValues);
        showAlert(t("alerts.validationTitle"), t("alerts.requiredFieldsMissing"));
        setIsLoading(false);
        return;
      }

      // If card type wasn't detected, use UNKNOWN
      const cardType = formState.inputValues.cardType || CardType.UNKNOWN;

      // Remove spaces from card number before sending to API
      const cardNumberWithoutSpaces = (formState.inputValues.cardNumber || "").replace(/\s/g, "");

      console.log("Saving card with type:", cardType);

      // Build encrypted payload similar to addNewPassword (only encrypt privatePayload)
      let payloadOverride: Record<string, unknown> | undefined = undefined;
      try {
        const localDek = await getDEKFromContext();
        if (localDek) {
          const localIk = generateIK();
          const itemId = createId();
          const version = 1;
          const nowISO = new Date().toISOString();

          const metadataPublic = {
            bankName: formState.inputValues.bankName,
            cardType: cardType,
            tags: [],
            createdAt: nowISO,
            updatedAt: nowISO,
            sorting: (formState.inputValues as Record<string, string>).sorting,
            sortingPin: (formState.inputValues as Record<string, string>).sortingPin,
            cardNumberLast4: cardNumberWithoutSpaces.slice(-4),
          };

          const privatePayload = {
            cardNumber: cardNumberWithoutSpaces,
            cardHolderName: formState.inputValues.cardHolderName,
            expiryDate: formState.inputValues.expiryDate,
            cvv: formState.inputValues.cvv,
            cardType: cardType,
            cardPassword: formState.inputValues.cardPassword,
          };

          const enc = await encryptItemWithIK(localIk, privatePayload, {
            itemId,
            version,
          });
          const wrapped = await wrapIKWithDEK(localIk, localDek);

          payloadOverride = {
            ciphertext: { nonce: toB64Url(enc.nonce), ct: toB64Url(enc.ct) },
            version,
            itemId,
            IKWrappedByDEK: {
              nonce: toB64Url(wrapped.nonce),
              ct: toB64Url(wrapped.ct),
            },
            metadataPublic,
          };
        }
      } catch (err) {
        // silent fail
      }

      const gate = await canCreateCardCloudAuto();
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
        setIsLoading(false);
        return;
      }

      setModalMsgKey("common.saving");
      setModalResult(false);
      setModalVisible(true);

      const cardPayload = {
        ...(payloadOverride || {}),
        cardNumber: cardNumberWithoutSpaces,
        cardHolderName: formState.inputValues.cardHolderName,
        expiryDate: formState.inputValues.expiryDate,
        cvv: formState.inputValues.cvv,
        cardType,
        bankName: formState.inputValues.bankName,
        // If no DEK (no payloadOverride), force local storage
        sync: payloadOverride ? syncType === "cloud" && gate.allowed : false,
      };

      const response = await authCtx.createCard(cardPayload);

      if (response.status === 201) {
        setModalMsgKey("alerts.cardSaved");
        setModalResult(true);
        try {
          await refreshEntitlements();
        } catch (err) {
          // silent fail
        }
      } else {
        resetModal();
        showAlert(t("alerts.errorTitle"), response.message || t("alerts.saveFailed"));
      }
    } catch (error) {
      console.error("Error saving card:", error);
      resetModal();
      showAlert(t("alerts.errorTitle"), t("alerts.unexpected"));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle sync type change
  const handleSyncTypeChange = async (id: string, option: string) => {
    const next = option as "local" | "cloud";
    if (next === "cloud") {
      const gate = await canCreateCardCloudAuto();
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
        inputChangedHandler(id, "local");
        return;
      }
    }
    setSyncType(next);
    inputChangedHandler(id, next);
  };

  // Format card number for display
  let displayCardNumber = "";
  if (formState.inputValues.cardNumber) {
    displayCardNumber = formState.inputValues.cardNumber;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <WalletCard
            cardHolderName={formState.inputValues.cardHolderName}
            cardNumber={displayCardNumber}
            cardType={formState.inputValues.cardType}
            expiryDate={formState.inputValues.expiryDate}
            cvv={formState.inputValues.cvv || formState.inputValues.cvv}
          />
          <CardDetailForm
            formState={formState}
            onInputChanged={inputChangedHandler}
            syncType={syncType}
            onSyncTypeChanged={handleSyncTypeChange}
            onSave={saveCardHandler}
            isLoading={isLoading}
            buttonTitle={t("common.save")}
          />
        </ScrollView>
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
        itemType="card"
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
    backgroundColor: COLORS.white,
    padding: 0,
  },
});

export default NewCardTab;
