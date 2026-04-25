import { useCallback, useEffect, useState } from "react";
import {
  apiGetPublicKeyByEmail,
  apiPostShare,
  apiGetShareStatusByItemId,
  apiGetSharesByItem,
  apiRemoveShareRecipients,
} from "../../api/api";
import { RBSheetShareRef } from "../../components/RBSheetShare";
import {
  RBSheetUnshareRef,
  ShareWithRecipients,
  RemoveSelection,
} from "../../components/RBSheetUnshare";
import { API_STATUS } from "../../constants";
import { produceWrappedIKForShare } from "../../service/key-management-service";
import { API_GET_PUBLIC_KEY_BY_EMAIL_CODE } from "../../type/apiCode";
import { toastBus } from "../../utils/toastBus";
import { openIKWithDEK } from "../../utils/util";
import { Password } from "../../utils/types/passwordTypes";
import { isValidEmail } from "./shareHelpers";

interface UsePasswordDetailSharingProps {
  passwordData: Password | undefined;
  canShareCurrentPassword: boolean;
  isSharedView: boolean;
  getDEK: () => Promise<Uint8Array | null>;
  canSharePasswordAuto: () => Promise<{ allowed: boolean; reason?: string }>;
  refreshEntitlements: () => Promise<void>;
  t: (key: string, options?: any) => string;
  showAlert: (title: string, message: string) => void;
  shareSheetRef: React.RefObject<RBSheetShareRef | null>;
  unshareSheetRef: React.RefObject<RBSheetUnshareRef | null>;
  setIsLoading?: (loading: boolean) => void;
  setModalVisible?: (visible: boolean) => void;
  setModalMsg?: (msg: string | undefined) => void;
  resetModal?: () => void;
}

export const usePasswordDetailSharing = ({
  passwordData,
  canShareCurrentPassword,
  isSharedView,
  getDEK,
  canSharePasswordAuto,
  refreshEntitlements,
  t,
  showAlert,
  shareSheetRef,
  unshareSheetRef,
  setIsLoading,
  setModalVisible,
  setModalMsg,
  resetModal,
}: UsePasswordDetailSharingProps) => {
  const [shareStatuses, setShareStatuses] = useState<{ recipient: string; status: string }[]>([]);
  const [shareStatusLoading, setShareStatusLoading] = useState(false);

  // Fetch share recipient statuses when opening this screen for owned passwords
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!passwordData || !canShareCurrentPassword) {
          setShareStatuses([]);
          setShareStatusLoading(false);
          return;
        }
        const itemId = String((passwordData as any)?.itemId || "");
        if (!itemId) {
          setShareStatuses([]);
          setShareStatusLoading(false);
          return;
        }
        setShareStatusLoading(true);
        const resp = await apiGetShareStatusByItemId(itemId);
        if (cancelled) return;

        if (resp.ok && resp.code === "SHARE_STATUS") {
          const recipients = Array.isArray(resp.data?.recipients)
            ? (resp.data.recipients as any[])
            : [];
          setShareStatuses(
            (recipients as any[]).map((r) => ({
              recipient: String(r?.recipient ?? ""),
              status: String(r?.status ?? ""),
            })),
          );
        } else {
          setShareStatuses([]);
        }
      } catch (e) {
        setShareStatuses([]);
      } finally {
        if (!cancelled) setShareStatusLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [passwordData, canShareCurrentPassword]);

  const handleShareWithEmail = async (email: string) => {
    const gate = await canSharePasswordAuto();
    if (!gate.allowed) {
      shareSheetRef.current?.close();
      setTimeout(() => {
        showAlert(t("password.shareTitle"), gate.reason || t("alerts.shareNotAllowed"));
      }, 500);
      return;
    }

    if (!isValidEmail(email)) {
      shareSheetRef.current?.close();
      setTimeout(() => {
        showAlert(t("password.shareTitle"), t("validation.invalidEmail"));
      }, 500);
      return;
    }

    try {
      const res = await apiGetPublicKeyByEmail(email);
      const { status, data, ok: success, code, message } = res;
      const responseKeys = Array.isArray(data?.keys) ? data.keys : [];

      if (
        status === API_STATUS.UNAUTHORIZED ||
        code === API_GET_PUBLIC_KEY_BY_EMAIL_CODE.UNAUTHORIZED
      ) {
        return;
      }

      if (!success && code === API_GET_PUBLIC_KEY_BY_EMAIL_CODE.INVALID_EMAIL) {
        shareSheetRef.current?.close();
        setTimeout(() => {
          showAlert(t("password.shareTitle"), t("validation.invalidEmail") || message);
        }, 500);
        return;
      }

      if (!success && code === API_GET_PUBLIC_KEY_BY_EMAIL_CODE.INVALID_EMAIL_OWNER) {
        shareSheetRef.current?.close();
        setTimeout(() => {
          showAlert(t("password.shareTitle"), t("password.cannotShareWithYourself") || message);
        }, 500);
        return;
      }

      if (!success && code === API_GET_PUBLIC_KEY_BY_EMAIL_CODE.PUBLIC_KEYS_NOT_FOUND) {
        shareSheetRef.current?.close();
        setTimeout(() => {
          showAlert(t("password.shareTitle"), t("password.recipientHasNoKeys"));
        }, 500);
        return;
      }

      if (
        status === API_STATUS.OK &&
        success &&
        code === API_GET_PUBLIC_KEY_BY_EMAIL_CODE.USER_NOT_FOUND
      ) {
        shareSheetRef.current?.close();
        setTimeout(() => {
          showAlert(t("password.shareTitle"), t("password.inviteMailSends") || message);
        }, 500);
        return;
      }

      if (
        status === API_STATUS.OK &&
        success &&
        code === API_GET_PUBLIC_KEY_BY_EMAIL_CODE.PUBLIC_KEYS_FOUND
      ) {
        const keys = responseKeys;
        const recipientKey =
          keys.find((k: any) => k?.keyType === "x25519" && k?.isActive) || keys[0];

        if (!recipientKey) {
          shareSheetRef.current?.close();
          setTimeout(() => {
            showAlert(t("password.shareTitle"), t("password.someThingWentWrong") || message);
          }, 500);
          return;
        }

        const localDEK = await getDEK();
        if (!localDEK) {
          shareSheetRef.current?.close();
          setTimeout(() => {
            showAlert(t("password.shareTitle"), t("password.someThingWentWrong"));
          }, 500);
          return;
        }

        const wrappedIK1 = passwordData?.IKWrappedByDEK;
        if (!wrappedIK1) {
          shareSheetRef.current?.close();
          setTimeout(() => {
            showAlert(t("password.shareTitle"), t("password.someThingWentWrong"));
          }, 500);
          return;
        }

        const IK = openIKWithDEK(localDEK, wrappedIK1);
        const { wrappedIK, zeroize } = await produceWrappedIKForShare({
          IK,
          recipientPublicKey_b64url: recipientKey.publicKey,
          itemId: passwordData?.itemId || "",
        });

        try {
          const shareBody = {
            itemId: passwordData?.itemId || "",
            recipientEmail: email.trim().toLowerCase(),
            wrappedIK,
            metadata: { readOnly: true },
          };

          const shareResp = await apiPostShare(shareBody);

          if (!shareResp.ok && shareResp.code === "UNAUTHORIZED") {
            shareSheetRef.current?.close();
            setTimeout(() => {
              showAlert(t("password.shareTitle"), t("password.someThingWentWrong"));
            }, 500);
            return;
          }

          if (shareResp.ok && shareResp.code === "SHARE_CREATED") {
            shareSheetRef.current?.close();
            setTimeout(() => {
              showAlert(t("password.shareTitle"), t("password.shareSuccess"));
            }, 500);
            try {
              await refreshEntitlements();
            } catch {}
            return;
          }

          if (!shareResp.ok) {
            const errCode = shareResp.code;
            if (errCode === "ITEM_NOT_FOUND") {
              shareSheetRef.current?.close();
              setTimeout(() => {
                showAlert(
                  t("password.shareTitle"),
                  t("password.itemNotFound") || shareResp.message,
                );
              }, 500);
              return;
            }
            if (errCode === "INVALID_RECIPIENT_OWNER") {
              shareSheetRef.current?.close();
              setTimeout(() => {
                showAlert(
                  t("password.shareTitle"),
                  t("password.cannotShareWithYourself") || shareResp.message,
                );
              }, 500);
              return;
            }
            if (errCode === "USER_NOT_FOUND") {
              shareSheetRef.current?.close();
              setTimeout(() => {
                showAlert(
                  t("password.shareTitle"),
                  t("password.inviteMailSends") || shareResp.message,
                );
              }, 500);
              return;
            }
            if (errCode === "INVALID_WRAPPED_IK" || errCode === "INVALID_INPUT") {
              shareSheetRef.current?.close();
              setTimeout(() => {
                showAlert(
                  t("password.shareTitle"),
                  t("password.someThingWentWrong") || shareResp.message,
                );
              }, 500);
              return;
            }
          }

          shareSheetRef.current?.close();
          setTimeout(() => {
            showAlert(
              t("password.shareTitle"),
              t("password.someThingWentWrong") || shareResp.message,
            );
          }, 500);
          return;
        } finally {
          try {
            IK.fill(0);
            zeroize();
          } catch {}
        }
      }

      if (
        status === API_STATUS.SERVER_ERROR ||
        (!success && code === API_GET_PUBLIC_KEY_BY_EMAIL_CODE.INTERNAL_ERROR)
      ) {
        showAlert(t("password.shareTitle"), t("password.someThingWentWrong") || message);
        return;
      }
      shareSheetRef.current?.close();
      setTimeout(() => {
        showAlert(t("password.shareTitle"), t("password.someThingWentWrong"));
      }, 500);
      return;
    } catch (e) {
      showAlert(t("password.shareTitle"), t("password.someThingWentWrong"));
    }
  };

  const openUnshareSheet = useCallback(async () => {
    try {
      if (!passwordData || isSharedView) return;
      const itemId = String((passwordData as any)?.itemId || "");
      if (!itemId) return;
      unshareSheetRef.current?.openLoading();
      const resp = await apiGetSharesByItem(itemId);
      if (resp.ok && resp.code === "SHARES_BY_ITEM" && Array.isArray(resp.data?.shares)) {
        const sharesArr = (resp.data.shares as any[]).map((s) => ({
          shareId: Number(s?.shareId),
          recipients: Array.isArray(s?.recipients)
            ? (s.recipients as any[])
                .filter((r) => String(r?.status || "") !== "REVOKED")
                .map((r) => ({
                  recipientId: Number(r?.recipientId),
                  displayName: String(r?.displayName || r?.email || r?.recipientId || ""),
                  status: String(r?.status || ""),
                }))
            : [],
        })) as ShareWithRecipients[];
        const nonEmpty = sharesArr.filter((s) => (s.recipients || []).length > 0);
        if (nonEmpty.length === 0) {
          unshareSheetRef.current?.close();
          return;
        }
        unshareSheetRef.current?.setData(nonEmpty);
        return;
      }
      unshareSheetRef.current?.close();
      showAlert(t("alerts.information"), t("password.someThingWentWrong"));
    } catch (e) {
      unshareSheetRef.current?.close();
      showAlert(t("alerts.information"), t("password.someThingWentWrong"));
    }
  }, [passwordData, isSharedView, t, showAlert, unshareSheetRef]);

  const refreshSharedWithUsingShares = useCallback(async () => {
    try {
      if (!passwordData || isSharedView) return;
      const itemId = String((passwordData as any)?.itemId || "");
      if (!itemId) return;
      const resp = await apiGetSharesByItem(itemId);
      if (resp.ok && resp.code === "SHARES_BY_ITEM" && Array.isArray(resp.data?.shares)) {
        const list: { recipient: string; status: string }[] = [];
        (resp.data.shares as any[]).forEach((s) => {
          const recs = Array.isArray(s?.recipients) ? (s.recipients as any[]) : [];
          for (const r of recs) {
            const st = String(r?.status || "");
            if (st === "REVOKED") continue;
            const name = String(r?.displayName || r?.email || r?.recipientId || "");
            list.push({ recipient: name, status: st });
          }
        });
        setShareStatuses(list);
        return;
      }
      setShareStatuses([]);
    } catch (e) {
      setShareStatuses([]);
    }
  }, [passwordData, isSharedView]);

  const handleRemoveRecipients = useCallback(
    async (selection: RemoveSelection) => {
      const total = Object.values(selection).reduce(
        (acc, ids) => acc + (Array.isArray(ids) ? ids.length : 0),
        0,
      );
      if (total === 0) {
        toastBus.show(t("password.selectAtLeastOne"));
        return;
      }

      resetModal?.();
      setIsLoading?.(true);
      setModalMsg?.(t("common.removingAccess"));
      setModalVisible?.(true);

      let ok = 0;
      let fail = 0;
      try {
        for (const [sidStr, ids] of Object.entries(selection)) {
          const shareId = Number(sidStr);
          if (!shareId || !Array.isArray(ids) || ids.length === 0) continue;
          try {
            const resp = await apiRemoveShareRecipients(shareId, { recipientIds: ids });
            if (resp.ok && resp.code === "RECIPIENTS_REMOVED") ok++;
            else fail++;
          } catch (e) {
            fail++;
          }
        }
      } finally {
        resetModal?.();
        setIsLoading?.(false);
      }

      if (ok > 0 && fail === 0) {
        toastBus.show(t("alerts.accessRemoved"));
      } else if (ok > 0) {
        toastBus.show(t("alerts.accessRemoved"));
      } else {
        toastBus.show(t("alerts.removeAccessFailed"));
      }
      refreshSharedWithUsingShares();
    },
    [t, refreshSharedWithUsingShares, setIsLoading, setModalVisible, setModalMsg, resetModal],
  );

  return {
    shareStatuses,
    shareStatusLoading,
    handleShareWithEmail,
    openUnshareSheet,
    handleRemoveRecipients,
    refreshSharedWithUsingShares,
  };
};
