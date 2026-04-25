import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useCopyToClipboard } from "../../utils/copy";
import { AuthContext } from "../../store/auth-context";
import {
  isReceivedShareGoneError,
  removeReceivedShareFromCache,
} from "../../utils/receivedSharesCache";
import { Password } from "../../utils/types/passwordTypes";
import { apiGetShareDetail } from "../../api/api";
import { getPrivateKey, deriveKShareForRecipient } from "../../service/key-management-service";
import { decryptEncryptedItem, aeadOpen, makeAAD, decryptItemWithIK } from "../../utils/util";
import { getPasswordRowKey } from "./identity";

export const usePasswordTabSecrets = () => {
  const [hiddenUsernames, setHiddenUsernames] = useState<Record<string, boolean>>({});
  const [hiddenPasswords, setHiddenPasswords] = useState<Record<string, boolean>>({});
  const [decryptedUsernames, setDecryptedUsernames] = useState<Record<string, string>>({});
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});

  const copy = useCopyToClipboard();
  const authContext = useContext(AuthContext);
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();

  const decryptedUsernamesRef = useRef(decryptedUsernames);
  const decryptedPasswordsRef = useRef(decryptedPasswords);
  const hiddenUsernamesRef = useRef(hiddenUsernames);
  const hiddenPasswordsRef = useRef(hiddenPasswords);

  useEffect(() => {
    decryptedUsernamesRef.current = decryptedUsernames;
  }, [decryptedUsernames]);
  useEffect(() => {
    decryptedPasswordsRef.current = decryptedPasswords;
  }, [decryptedPasswords]);
  useEffect(() => {
    hiddenUsernamesRef.current = hiddenUsernames;
  }, [hiddenUsernames]);
  useEffect(() => {
    hiddenPasswordsRef.current = hiddenPasswords;
  }, [hiddenPasswords]);

  // Reset visibility and decryption states when screen loses focus
  useEffect(() => {
    if (!isFocused) {
      setHiddenUsernames({});
      setHiddenPasswords({});
      setDecryptedUsernames({});
      setDecryptedPasswords({});
    }
  }, [isFocused]);

  const ensureDecryptedItem = useCallback(
    async (item: Password) => {
      const key = getPasswordRowKey(item);
      const existing = {
        userName: decryptedUsernamesRef.current[key],
        password: decryptedPasswordsRef.current[key],
      };

      // Return cached if available
      if (existing.userName !== undefined || existing.password !== undefined) {
        return existing;
      }

      // Shared item decrypt flow (recipient side)
      if ((item as any)?.isShared) {
        try {
          const shareId = (item as any)?.shareId || item.id; // id is shareId for shared items
          if (!shareId) {
            console.warn("ensureDecryptedItem(shared): missing shareId");
            return existing;
          }

          const resp = await apiGetShareDetail(shareId);
          const { ok: success, code, status, message, data } = resp;
          if (success && code === "SHARE_DETAIL") {
            const detailItem = data?.item;
            const wrappedIK = data?.wrappedIK;

            const itemCipher = detailItem?.ciphertext;
            const itemId = String(detailItem?.itemId || (item as any)?.itemId || "");
            const rawVersion =
              typeof detailItem?.version === "number"
                ? detailItem.version
                : Number(detailItem?.version);
            const version = Number.isFinite(rawVersion) ? (rawVersion as number) : undefined;

            if (
              !wrappedIK ||
              !wrappedIK.nonce ||
              !wrappedIK.ct ||
              !wrappedIK.sender_ephemeral_pub
            ) {
              console.warn("ensureDecryptedItem(shared): missing wrappedIK fields");
              return existing;
            }
            if (
              !itemCipher ||
              !itemCipher.nonce ||
              !itemCipher.ct ||
              !itemId ||
              version === undefined
            ) {
              console.warn("ensureDecryptedItem(shared): missing ciphertext or identifiers");
              return existing;
            }

            // Retrieve recipient private key
            const recipientPriv = await getPrivateKey();
            if (!recipientPriv) {
              console.warn("ensureDecryptedItem(shared): private key not found locally");
              return existing;
            }

            // Derive K_share and unwrap IK
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
                const decryptedObj = decryptItemWithIK(IK, itemCipher, {
                  itemId,
                  version,
                });
                const userNameValue =
                  typeof decryptedObj?.userName === "string" ? decryptedObj.userName : "";
                const passwordValue =
                  typeof decryptedObj?.password === "string" ? decryptedObj.password : "";

                setDecryptedUsernames((prev) =>
                  prev[key] !== undefined ? prev : { ...prev, [key]: userNameValue },
                );
                setDecryptedPasswords((prev) =>
                  prev[key] !== undefined ? prev : { ...prev, [key]: passwordValue },
                );

                return { userName: userNameValue, password: passwordValue };
              } finally {
                if ((IK as any)?.fill) (IK as Uint8Array).fill(0);
              }
            } finally {
              if ((K_share as any)?.fill) (K_share as Uint8Array).fill(0);
            }
          } else {
            if (isReceivedShareGoneError(resp)) {
              removeReceivedShareFromCache(queryClient, authContext.userId, shareId);
            }
            console.warn(
              "ensureDecryptedItem(shared): failed to fetch share detail",
              `[${status}] ${code || "ERROR"}: ${message || "Failed"}`,
            );
          }
        } catch (e) {
          // ensureDecryptedItem(shared) error
        }

        return existing;
      }

      // Owned item decrypt flow (uses local DEK)
      const getDEKFn = authContext.getDEK;
      if (typeof getDEKFn !== "function") {
        return existing;
      }

      try {
        const decrypted = await decryptEncryptedItem(item, getDEKFn);
        if (decrypted && typeof decrypted === "object") {
          const userNameValue = typeof decrypted.userName === "string" ? decrypted.userName : "";
          const passwordValue = typeof decrypted.password === "string" ? decrypted.password : "";

          setDecryptedUsernames((prev) =>
            prev[key] !== undefined ? prev : { ...prev, [key]: userNameValue },
          );
          setDecryptedPasswords((prev) =>
            prev[key] !== undefined ? prev : { ...prev, [key]: passwordValue },
          );

          return { userName: userNameValue, password: passwordValue };
        }
      } catch (error) {
        // Error decrypting password item
      }

      return existing;
    },
    [authContext.getDEK, authContext.userId, queryClient],
  );

  const toggleUsernameVisibility = useCallback(
    async (item: Password) => {
      const key = getPasswordRowKey(item);
      const current = hiddenUsernamesRef.current[key] ?? true;
      const nextState = !current;

      setHiddenUsernames((prev) => ({ ...prev, [key]: nextState }));
      if (!nextState && decryptedUsernamesRef.current[key] === undefined) {
        await ensureDecryptedItem(item);
      }
    },
    [ensureDecryptedItem],
  );

  const togglePasswordVisibility = useCallback(
    async (item: Password) => {
      const key = getPasswordRowKey(item);
      const current = hiddenPasswordsRef.current[key] ?? true;
      const nextState = !current;

      setHiddenPasswords((prev) => ({ ...prev, [key]: nextState }));

      if (!nextState && decryptedPasswordsRef.current[key] === undefined) {
        await ensureDecryptedItem(item);
      }
    },
    [ensureDecryptedItem],
  );

  const handleCopyUsername = useCallback(
    async (item: Password) => {
      const decrypted = await ensureDecryptedItem(item);
      const value = decrypted?.userName || "";
      copy(value, "username");
    },
    [ensureDecryptedItem, copy],
  );

  const handleCopyPassword = useCallback(
    async (item: Password) => {
      const decrypted = await ensureDecryptedItem(item);
      const value = decrypted?.password || "";
      copy(value, "password");
    },
    [ensureDecryptedItem, copy],
  );

  return {
    hiddenUsernames,
    hiddenPasswords,
    decryptedUsernames,
    decryptedPasswords,
    toggleUsernameVisibility,
    togglePasswordVisibility,
    handleCopyUsername,
    handleCopyPassword,
  };
};
