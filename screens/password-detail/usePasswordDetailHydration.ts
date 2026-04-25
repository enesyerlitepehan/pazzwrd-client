import { useQueryClient } from "@tanstack/react-query";
import React, { useContext, useEffect } from "react";

import { apiGetShareDetail } from "../../api/api";
import { getPrivateKey, deriveKShareForRecipient } from "../../service/key-management-service";
import { AuthContext } from "../../store/auth-context";
import {
  isReceivedShareGoneError,
  removeReceivedShareFromCache,
} from "../../utils/receivedSharesCache";
import { Password } from "../../utils/types/passwordTypes";
import { decryptEncryptedItem, aeadOpen, makeAAD, decryptItemWithIK } from "../../utils/util";
import { buildFormValues, PasswordFormValues, DecryptedPasswordPayload } from "./formState";
import { normalizeSharedMetadata } from "./sharedPasswordDetail";

interface UsePasswordDetailHydrationProps {
  passwordData?: Password;
  getDEK: () => Promise<Uint8Array | null>;
  hasUserEditedRef: React.MutableRefObject<boolean>;
  setUpdatedValues: (values: PasswordFormValues) => void;
  initialValuesRef: React.MutableRefObject<PasswordFormValues>;
  dispatchInitialFormState: (values: PasswordFormValues) => void;
  setSharedOwnerMail: (mail: string | null) => void;
  setIsLoading?: (loading: boolean) => void;
  setModalVisible?: (visible: boolean) => void;
  setModalMsg?: (msg: string | undefined) => void;
}

/**
 * Hook to manage the hydration and decryption flow for both owned and shared passwords.
 * Handles fetching shared details, unwrapping keys, and updating the form state.
 */
export const usePasswordDetailHydration = ({
  passwordData,
  getDEK,
  hasUserEditedRef,
  setUpdatedValues,
  initialValuesRef,
  dispatchInitialFormState,
  setSharedOwnerMail,
  setIsLoading,
  setModalVisible,
  setModalMsg,
}: UsePasswordDetailHydrationProps) => {
  const queryClient = useQueryClient();
  const { userId } = useContext(AuthContext);

  useEffect(() => {
    let cancelled = false;

    const decrypt = async () => {
      if (!passwordData) return;

      let didIOpenModal = false;

      // Shared item decrypt note:
      // If this password is a shared item, the decrypt flow differs from owned items.
      if ((passwordData as any)?.isShared) {
        setIsLoading?.(true);
        setModalVisible?.(true);
        didIOpenModal = true;
        try {
          const shareId = (passwordData as any)?.shareId;
          if (!shareId) {
            console.warn("Shared item is missing shareId; cannot fetch detail");
            return;
          }

          const resp = await apiGetShareDetail(shareId);
          if (cancelled) return;

          if (resp.ok && resp.code === "SHARE_DETAIL") {
            const data = resp.data;
            const item = data?.item;
            const ownerMail = data?.owner?.mail || null;
            if (ownerMail) setSharedOwnerMail(String(ownerMail));

            // Normalize metadata_public -> metadataPublic
            const metadataPublic = normalizeSharedMetadata(item);

            // Optionally update non-secret fields in form if user hasn't edited
            if (!hasUserEditedRef.current) {
              const base = buildFormValues(
                {
                  ...(passwordData as any),
                  // Ensure latest non-secret fields are shown from detail response
                  itemId: item?.itemId ?? (passwordData as any)?.itemId,
                  version:
                    typeof item?.version === "number"
                      ? item.version
                      : Number(item?.version) || (passwordData as any)?.version,
                  metadataPublic,
                  // Preserve isShared marker and owner/display fields if present
                } as any,
                null, // do not provide decrypted secrets yet
              );
              setUpdatedValues(base);
              initialValuesRef.current = base;
              dispatchInitialFormState(base);
            }

            // Shared decrypt path (recipient side): unwrap IK and decrypt ciphertext.
            try {
              const wrappedIK = data?.wrappedIK;
              const itemCipher = item?.ciphertext;
              const itemId = String(item?.itemId || (passwordData as any)?.itemId || "");
              const rawVersion =
                typeof item?.version === "number" ? item.version : Number(item?.version);
              const version = Number.isFinite(rawVersion) ? (rawVersion as number) : undefined;
              if (
                !wrappedIK ||
                !wrappedIK.nonce ||
                !wrappedIK.ct ||
                !wrappedIK.sender_ephemeral_pub
              ) {
                console.warn("Shared decrypt: missing wrappedIK fields");
              } else if (
                !itemCipher ||
                !itemCipher.nonce ||
                !itemCipher.ct ||
                !itemId ||
                version === undefined
              ) {
                console.warn("Shared decrypt: missing ciphertext or identifiers");
              } else {
                // TODO(keys): If the recipient's private key is not stored locally, prompt user to restore/generate it.
                const recipientPriv = await getPrivateKey();
                if (!recipientPriv) {
                  console.warn("Shared decrypt: private key not found locally");
                  // TODO(keys): If the private key is backed up wrapped by DEK, first recover DEK (authCtx.getDEK()) then unwrap the private key.
                  // TODO(dek): If DEK is not present locally, guide user through DEK recovery/MP flow.
                } else {
                  const salt = new TextEncoder().encode(itemId);
                  const K_share = deriveKShareForRecipient(
                    recipientPriv,
                    wrappedIK.sender_ephemeral_pub,
                    salt,
                  );
                  try {
                    const IK = aeadOpen(
                      K_share,
                      wrappedIK.nonce,
                      wrappedIK.ct,
                      makeAAD({ itemId, mode: "user" }),
                    );
                    try {
                      const decrypted = decryptItemWithIK(IK, itemCipher, {
                        itemId,
                        version,
                      }) as DecryptedPasswordPayload;

                      if (!hasUserEditedRef.current && !cancelled) {
                        const valuesWithDecrypted = buildFormValues(
                          {
                            ...(passwordData as any),
                            itemId,
                            version,
                            metadataPublic,
                            isShared: true,
                            shareId,
                          } as any,
                          decrypted,
                        );
                        setUpdatedValues(valuesWithDecrypted);
                        initialValuesRef.current = valuesWithDecrypted;
                        dispatchInitialFormState(valuesWithDecrypted);
                      }
                      // console.log("Shared decrypt success");
                    } finally {
                      // Zeroize IK bytes
                      if ((IK as any)?.fill) {
                        (IK as Uint8Array).fill(0);
                      }
                    }
                  } finally {
                    // Zeroize derived K_share
                    if ((K_share as any)?.fill) {
                      (K_share as Uint8Array).fill(0);
                    }
                    // Note: Keeping recipientPriv in memory for future ops; do not zeroize here.
                  }
                }
              }
            } catch (e) {
              // Shared decrypt failed
            }
          } else {
            if (isReceivedShareGoneError(resp)) {
              removeReceivedShareFromCache(queryClient, userId, shareId);
            }
            // Standardized errors from server (UNAUTHORIZED, FORBIDDEN, NOT_FOUND, ITEM_NOT_FOUND, INTERNAL_ERROR)
            // console.warn("Failed to fetch share detail");
          }
        } catch (e: any) {
          // Error fetching share detail
        } finally {
          if (!cancelled && didIOpenModal) {
            setIsLoading?.(false);
            setModalVisible?.(false);
          }
        }
        return; // Stop normal decrypt path for shared items
      }

      try {
        const decrypted = await decryptEncryptedItem(passwordData, getDEK);
        if (cancelled) return;

        if (decrypted && !hasUserEditedRef.current) {
          const valuesWithDecrypted = buildFormValues(
            passwordData,
            decrypted as DecryptedPasswordPayload,
          );
          setUpdatedValues(valuesWithDecrypted);
          initialValuesRef.current = valuesWithDecrypted;
          dispatchInitialFormState(valuesWithDecrypted);
        }
      } catch (error) {
        // Failed to decrypt password detail
      }
    };

    decrypt();

    return () => {
      cancelled = true;
    };
  }, [
    passwordData,
    getDEK,
    setUpdatedValues,
    initialValuesRef,
    dispatchInitialFormState,
    setSharedOwnerMail,
    hasUserEditedRef,
    queryClient,
    userId,
    setIsLoading,
    setModalVisible,
    setModalMsg,
  ]);
};
