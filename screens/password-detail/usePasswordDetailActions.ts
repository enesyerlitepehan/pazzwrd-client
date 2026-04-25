import { useNavigation } from "@react-navigation/native";
import { useCallback } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { apiGetSharesByItem, apiPostShareRewrap } from "../../api/api";
import { produceWrappedIKForShare } from "../../service/key-management-service";
import { useEntitlements } from "../../store/entitlements-context";
import { validateInput } from "../../utils/actions/formActions";
import { computePasswordStrength } from "../../utils/passwordStrength";
import { EncryptedPasswordPayload, Password } from "../../utils/types/passwordTypes";
import { encryptItemWithIK, generateIK, toB64Url, wrapIKWithDEK } from "../../utils/util";
import { RootStackNavigationProp } from "../../navigation/types";
import { PasswordFormValues } from "./formState";
import { buildMetadataPublic, buildPlainDetails, buildPrivatePayload } from "./updatePayload";

interface UsePasswordDetailActionsProps {
  passwordData?: Password;
  updatedValues: PasswordFormValues;
  syncType: "local" | "cloud";
  setSyncType: (type: "local" | "cloud") => void;
  readOnly: boolean;
  getDEK: () => Promise<Uint8Array | null>;
  addNewPassword: (details: any, toCloud: boolean) => Promise<any>;
  updatePassword: (id: string | number, payload: EncryptedPasswordPayload) => Promise<any>;
  removePassword: (
    id: string | number,
    local: boolean,
    trash?: boolean,
    permanent?: boolean,
  ) => Promise<any>;
  setIsLoading: (loading: boolean) => void;
  setModalVisible: (visible: boolean) => void;
  setModalResult: (result: boolean) => void;
  setModalScore: (score: number | null) => void;
  setModalMsg: (msg: string | undefined) => void;
  setModalTitle: (title: string | undefined) => void;
  setModalConfirmMode: (mode: boolean) => void;
  setModalCancelLabel: (label: string | undefined) => void;
  setModalConfirmLabel: (label: string | undefined) => void;
  setModalOnAction: (action: (() => void) | undefined) => void;
  setModalOnCancel: (action: (() => void) | undefined) => void;
  resetModal: () => void;
  showAlert: (title: string, message: string) => void;
  dispatchFormState: (action: any) => void;
  ignoreNextRef: React.MutableRefObject<boolean>;
}

export const usePasswordDetailActions = ({
  passwordData,
  updatedValues,
  syncType,
  setSyncType,
  readOnly,
  getDEK,
  addNewPassword,
  updatePassword,
  removePassword,
  setIsLoading,
  setModalVisible,
  setModalResult,
  setModalScore,
  setModalMsg,
  setModalTitle,
  setModalConfirmMode,
  setModalCancelLabel,
  setModalConfirmLabel,
  setModalOnAction,
  setModalOnCancel,
  resetModal,
  showAlert,
  dispatchFormState,
  ignoreNextRef,
}: UsePasswordDetailActionsProps) => {
  const { t } = useTranslation("common");
  const navigation = useNavigation<RootStackNavigationProp<"PasswordDetail">>();
  const { canCreatePasswordCloudAuto } = useEntitlements();

  const handleUpdatePassword = useCallback(async () => {
    const rawName = updatedValues.name ?? "";
    const normalizedName = rawName.trim();
    const nameValidation = validateInput("name", normalizedName);

    dispatchFormState({
      inputId: "name",
      inputValue: rawName,
      validationResult: nameValidation,
    });

    if (nameValidation) {
      showAlert(t("alerts.validationTitle"), t("alerts.requiredFieldsMissing"));
      return;
    }

    setIsLoading(true);
    setModalResult(false);
    setModalScore(null);
    setModalMsg(undefined);

    if (!passwordData || !passwordData.id) {
      console.error("Password ID is missing");
      setIsLoading(false);
      return;
    }

    try {
      const currentIsCloud = !!passwordData?.sync;
      let targetIsCloud = syncType === "cloud";

      // Only gate if migrating local -> cloud
      if (!currentIsCloud && targetIsCloud) {
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
          targetIsCloud = false;
          setSyncType("local");
          setIsLoading(false);
          return;
        }
      }

      const plainDetails = buildPlainDetails(updatedValues, passwordData, targetIsCloud);

      setModalMsg(t("common.saving"));
      setModalVisible(true);

      const showSuccessModal = () => {
        const pwd = updatedValues.password || "";
        const strength = computePasswordStrength(pwd, { t });
        setModalScore(strength.score);
        setModalMsg(t("alerts.passwordSaved"));
        setModalResult(true);
      };

      if (readOnly) {
        const toCloud = !!passwordData?.sync;
        await addNewPassword(plainDetails, toCloud);
        await removePassword(passwordData.id, false, true);
        showSuccessModal();
        return;
      }

      if (currentIsCloud !== targetIsCloud) {
        const sourceId =
          currentIsCloud &&
          typeof passwordData.id === "string" &&
          Number.isFinite(Number(passwordData.id))
            ? Number(passwordData.id)
            : passwordData.id;

        const removeResp = await removePassword(sourceId, !currentIsCloud, false, true);
        if (!removeResp || ![200, 201, 204].includes(removeResp.status || 0)) {
          // console.error("Failed to remove source password during move");
          resetModal();
          showAlert(t("alerts.errorTitle"), t("alerts.passwordSaveFailed"));
          return;
        }

        const addResp = await addNewPassword(plainDetails, targetIsCloud);
        if (!addResp || (addResp.status !== 200 && addResp.status !== 201)) {
          // console.error("Failed to re-add password during move");
          resetModal();
          showAlert(t("alerts.errorTitle"), t("alerts.passwordSaveFailed"));
          return;
        }
        showSuccessModal();
        return;
      }

      const localDEK = await getDEK();
      if (!localDEK) {
        resetModal();
        showAlert("Error", "Missing encryption key");
        return;
      }

      const existingItemId =
        typeof passwordData.itemId === "string" && passwordData.itemId
          ? passwordData.itemId
          : String(passwordData.id);
      const currentVersion = Number(passwordData.version) || 1;
      const nextVersion = currentVersion + 1;

      const strengthScore = computePasswordStrength(updatedValues.password || "", { t }).score;
      const metadataPublic = buildMetadataPublic(updatedValues, passwordData, strengthScore);
      const privatePayload = buildPrivatePayload(updatedValues, passwordData);

      const itemKey = generateIK();
      try {
        const enc = await encryptItemWithIK(itemKey, privatePayload, {
          itemId: existingItemId,
          version: nextVersion,
        });
        const wrapped = await wrapIKWithDEK(itemKey, localDEK);

        const encryptedPayload: EncryptedPasswordPayload = {
          id: passwordData.id,
          itemId: existingItemId,
          version: nextVersion,
          ciphertext: {
            nonce: toB64Url(enc.nonce),
            ct: toB64Url(enc.ct),
          },
          IKWrappedByDEK: {
            nonce: toB64Url(wrapped.nonce),
            ct: toB64Url(wrapped.ct),
          },
          metadataPublic,
          sync: targetIsCloud,
        };

        const response = await updatePassword(passwordData.id, encryptedPayload);
        if (response && response.ok) {
          // After successful update, if this item is shared, rewrap IK for each recipient
          try {
            const sharesResp = await apiGetSharesByItem(existingItemId);
            if (
              sharesResp.ok &&
              sharesResp.code === "SHARES_BY_ITEM" &&
              Array.isArray(sharesResp.data?.shares) &&
              sharesResp.data.shares.length > 0
            ) {
              const sharesArr = sharesResp.data.shares as any[];

              for (const s of sharesArr) {
                const shareId = (s as any)?.shareId;
                const recs = Array.isArray((s as any)?.recipients) ? (s as any).recipients : [];

                const toUpdate: Array<{
                  recipientId: number;
                  wrappedIK: {
                    nonce: string;
                    ct: string;
                    sender_ephemeral_pub: string;
                  };
                }> = [];
                for (const r of recs) {
                  const rid = Number((r as any)?.recipientId);
                  const pub = String((r as any)?.publicKey || "");
                  if (!rid || !pub) continue;

                  const { wrappedIK } = await produceWrappedIKForShare({
                    IK: itemKey,
                    recipientPublicKey_b64url: pub,
                    itemId: existingItemId,
                  });
                  toUpdate.push({ recipientId: rid, wrappedIK });
                }

                if (toUpdate.length > 0) {
                  try {
                    await apiPostShareRewrap(shareId, {
                      itemId: existingItemId,
                      version: nextVersion,
                      recipients: toUpdate,
                    });
                  } catch (e) {
                    console.log(
                      `apiPostShareRewrap failed for shareId=${shareId} (updatedRecipients=${toUpdate.length})`,
                    );
                  }
                }
              }
            }
          } catch (e) {
            console.log("Rewrap step skipped or failed (no secrets logged)");
          }

          showSuccessModal();
        } else {
          // console.error("Failed to update password");
          resetModal();
          showAlert(t("alerts.errorTitle"), t("alerts.passwordSaveFailed"));
        }
      } finally {
        try {
          itemKey.fill(0);
        } catch {}
      }
    } catch (error) {
      // console.error(readOnly ? "Error restoring password" : "Error updating password");
      resetModal();
      showAlert(t("alerts.errorTitle"), t("alerts.unexpected"));
    } finally {
      setIsLoading(false);
    }
  }, [
    updatedValues,
    dispatchFormState,
    showAlert,
    t,
    setIsLoading,
    setModalResult,
    setModalScore,
    setModalMsg,
    passwordData,
    syncType,
    canCreatePasswordCloudAuto,
    setModalTitle,
    setModalConfirmMode,
    setModalCancelLabel,
    setModalConfirmLabel,
    setModalOnAction,
    resetModal,
    navigation,
    setModalOnCancel,
    setModalVisible,
    setSyncType,
    readOnly,
    addNewPassword,
    removePassword,
    getDEK,
    updatePassword,
  ]);

  const handleSyncTypeChange = useCallback(
    async (next: "local" | "cloud", inputChangedHandler: (id: string, value: string) => void) => {
      // Gate only when migrating local->cloud
      const currentIsCloud = !!passwordData?.sync;
      if (!currentIsCloud && next === "cloud") {
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
          inputChangedHandler("syncType", "local");
          return;
        }
      }
      setSyncType(next);
      inputChangedHandler("syncType", next);
    },
    [
      passwordData,
      canCreatePasswordCloudAuto,
      t,
      setModalTitle,
      setModalMsg,
      setModalConfirmMode,
      setModalCancelLabel,
      setModalConfirmLabel,
      setModalOnAction,
      resetModal,
      navigation,
      setModalOnCancel,
      setModalVisible,
      setSyncType,
    ],
  );

  return { handleUpdatePassword, handleSyncTypeChange };
};
