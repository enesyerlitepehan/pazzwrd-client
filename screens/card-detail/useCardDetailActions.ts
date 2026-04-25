import { useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useEntitlements } from "../../store/entitlements-context";
import { RootStackNavigationProp } from "../../navigation/types";
import { Card } from "../../utils/types/cardTypes";
import { CardFormState } from "./formState";
import {
  buildCardCreatePayload,
  buildCardUpdatePayload,
  buildCardRestorePayload,
} from "./updatePayload";
import { createId } from "../../utils/passwordUtils";

interface UseCardDetailActionsProps {
  cardData?: Card;
  cardId?: string | number | null;
  formState: CardFormState;
  syncType: "local" | "cloud";
  setSyncType: (type: "local" | "cloud") => void;
  readOnly: boolean;
  getDEK: () => Promise<Uint8Array | null>;
  createCard: (payload: any) => Promise<any>;
  updateCard: (id: string | number, payload: any) => Promise<any>;
  removeCard: (
    id: string | number,
    local: boolean,
    trash?: boolean,
    permanent?: boolean,
  ) => Promise<any>;
  setIsLoading: (loading: boolean) => void;
  setModalVisible: (visible: boolean) => void;
  setModalResult: (result: boolean) => void;
  setModalMsg: (msg: string | undefined) => void;
  setModalTitle: (title: string | undefined) => void;
  setModalConfirmMode: (mode: boolean) => void;
  setModalCancelLabel: (label: string | undefined) => void;
  setModalConfirmLabel: (label: string | undefined) => void;
  setModalOnAction: (action: (() => void) | undefined) => void;
  setModalOnCancel: (action: (() => void) | undefined) => void;
  resetModal: () => void;
  showAlert: (title: string, message: string) => void;
  showUpgradeConfirm: (reason?: string) => void;
  inputChangedHandler: (inputId: string, inputValue: string) => void;
}

export const useCardDetailActions = ({
  cardData,
  cardId,
  formState,
  syncType,
  setSyncType,
  readOnly,
  getDEK,
  createCard,
  updateCard,
  removeCard,
  setIsLoading,
  setModalVisible,
  setModalResult,
  setModalMsg,
  setModalTitle,
  setModalConfirmMode,
  setModalCancelLabel,
  setModalConfirmLabel,
  setModalOnAction,
  setModalOnCancel,
  resetModal,
  showAlert,
  showUpgradeConfirm,
  inputChangedHandler,
}: UseCardDetailActionsProps) => {
  const { t } = useTranslation("common");
  const { canCreateCardCloudAuto } = useEntitlements();

  const handleUpdateCard = useCallback(async () => {
    // Trigger validation for all fields to ensure error messages are shown
    Object.keys(formState.inputValues).forEach((key) => {
      inputChangedHandler(key, (formState.inputValues as any)[key]);
    });

    if (!formState.formIsValid) {
      showAlert(t("alerts.validationTitle"), t("alerts.requiredFieldsMissing"));
      return;
    }

    setIsLoading(true);
    setModalMsg(t("common.saving"));
    setModalResult(false);
    setModalVisible(true);

    try {
      const currentIsCloud = !!cardData?.sync;
      let targetIsCloud = syncType === "cloud";

      // Entitlement gate for local -> cloud moves
      if (!currentIsCloud && targetIsCloud) {
        const gate = await canCreateCardCloudAuto();
        if (!gate.allowed) {
          showUpgradeConfirm(gate.reason);
          targetIsCloud = false;
          setSyncType("local");
          setIsLoading(false);
          return;
        }
      }

      if (readOnly) {
        // Restore from trash
        const hasEnc =
          cardData &&
          cardData.ciphertext &&
          cardData.itemId &&
          cardData.version &&
          cardData.IKWrappedByDEK;

        let payload: any;
        if (hasEnc) {
          payload = buildCardRestorePayload(cardData);
        } else {
          const localDEK = await getDEK();
          if (!localDEK) {
            resetModal();
            showAlert("Error", "Missing encryption key");
            return;
          }
          payload = await buildCardCreatePayload(
            formState.inputValues,
            cardData || {},
            targetIsCloud,
            localDEK,
            createId(),
          );
        }

        const resp = await createCard(payload);
        if (resp && resp.ok) {
          if (cardData?.id !== undefined) {
            await removeCard(cardData.id, false, true);
          }
          setModalMsg(t("alerts.cardSaved"));
          setModalResult(true);
        } else {
          console.error("Failed to restore/save card:", resp);
          resetModal();
        }
        return;
      }

      // Update existing card
      if (!cardId) {
        console.error("Card ID is missing");
        setIsLoading(false);
        setModalVisible(false);
        return;
      }

      if (currentIsCloud !== targetIsCloud) {
        // Move between storages: remove from current and add to target
        const sourceId =
          currentIsCloud && typeof cardId === "string" && Number.isFinite(Number(cardId))
            ? Number(cardId)
            : cardId;

        const removeResp = await removeCard(sourceId as number, !currentIsCloud, false, true);
        if (!removeResp || ![200, 201, 204].includes(removeResp.status || 0)) {
          console.error("Failed to remove source card during move:", removeResp);
          resetModal();
          showAlert(t("alerts.errorTitle"), t("alerts.cardSaveFailed"));
          return;
        }

        const localDEK = await getDEK();
        if (!localDEK) {
          resetModal();
          showAlert("Error", "Missing encryption key");
          return;
        }
        const payload = await buildCardCreatePayload(
          formState.inputValues,
          cardData || {},
          targetIsCloud,
          localDEK,
          createId(),
        );
        const addResp = await createCard(payload);
        if (!addResp || (addResp.status !== 200 && addResp.status !== 201)) {
          console.error("Failed to re-add card during move:", addResp);
          resetModal();
          showAlert(t("alerts.errorTitle"), t("alerts.cardSaveFailed"));
        } else {
          setModalMsg(t("alerts.cardSaved"));
          setModalResult(true);
        }
      } else {
        // Update in place with encryption
        const localDEK = await getDEK();
        if (!localDEK) {
          resetModal();
          showAlert("Error", "Missing encryption key");
          return;
        }

        const existingItemId = cardData?.itemId || String(cardData?.id);
        const currentVersion = Number(cardData?.version) || 1;
        const nextVersion = currentVersion + 1;

        const payload = await buildCardUpdatePayload(
          formState.inputValues,
          cardData || {},
          targetIsCloud,
          localDEK,
          existingItemId,
          nextVersion,
        );

        const resp = await updateCard(cardId, payload);
        if (resp && resp.ok) {
          setModalMsg(t("alerts.cardSaved"));
          setModalResult(true);
        } else {
          console.error("Failed to update card:", resp);
          resetModal();
        }
      }
    } catch (error) {
      console.error("handleUpdateCard error:", error);
      resetModal();
    } finally {
      setIsLoading(false);
    }
  }, [
    formState,
    inputChangedHandler,
    t,
    showAlert,
    setIsLoading,
    setModalMsg,
    setModalResult,
    setModalVisible,
    cardData,
    syncType,
    canCreateCardCloudAuto,
    showUpgradeConfirm,
    setSyncType,
    readOnly,
    getDEK,
    resetModal,
    createCard,
    removeCard,
    cardId,
    updateCard,
  ]);

  return {
    handleUpdateCard,
  };
};
