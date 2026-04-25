import { useEffect, useState, useCallback, useRef } from "react";
import { decryptEncryptedItem } from "../../utils/util";

export function useCardTabSecrets(orders: any[] | null, isFocused: boolean, authContext: any) {
  const [hiddenUsernames, setHiddenUsernames] = useState<Record<string, boolean>>({});
  const [hiddenPasswords, setHiddenPasswords] = useState<Record<string, boolean>>({});
  const [decryptedHolders, setDecryptedHolders] = useState<Record<string, string>>({});
  const [decryptedNumbers, setDecryptedNumbers] = useState<Record<string, string>>({});
  const [decryptedTypes, setDecryptedTypes] = useState<Record<string, string>>({});

  const decryptedHoldersRef = useRef(decryptedHolders);
  const decryptedNumbersRef = useRef(decryptedNumbers);
  const decryptedTypesRef = useRef(decryptedTypes);
  const hiddenUsernamesRef = useRef(hiddenUsernames);
  const hiddenPasswordsRef = useRef(hiddenPasswords);

  useEffect(() => {
    decryptedHoldersRef.current = decryptedHolders;
  }, [decryptedHolders]);
  useEffect(() => {
    decryptedNumbersRef.current = decryptedNumbers;
  }, [decryptedNumbers]);
  useEffect(() => {
    decryptedTypesRef.current = decryptedTypes;
  }, [decryptedTypes]);
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
      setDecryptedHolders({});
      setDecryptedNumbers({});
      setDecryptedTypes({});
    }
  }, [isFocused]);

  // Ensure decrypted data is cached for a given item
  const ensureDecryptedCard = useCallback(
    async (item: any) => {
      const key = String(item?.id);
      const cached = {
        holder: decryptedHoldersRef.current[key],
        number: decryptedNumbersRef.current[key],
        type: decryptedTypesRef.current[key],
      } as any;

      if (cached.holder !== undefined || cached.number !== undefined || cached.type !== undefined) {
        return cached;
      }

      const getDEKFn = (authContext as any)?.getDEK;
      if (typeof getDEKFn !== "function") return cached;

      try {
        const decrypted = await decryptEncryptedItem(item as any, getDEKFn);
        if (decrypted && typeof decrypted === "object") {
          const holder =
            typeof (decrypted as any).cardHolderName === "string"
              ? (decrypted as any).cardHolderName
              : "";
          const number =
            typeof (decrypted as any).cardNumber === "string" ? (decrypted as any).cardNumber : "";
          const type =
            typeof (decrypted as any).cardType === "string" ? (decrypted as any).cardType : "";

          setDecryptedHolders((prev) =>
            prev[key] !== undefined ? prev : { ...prev, [key]: holder },
          );
          setDecryptedNumbers((prev) =>
            prev[key] !== undefined ? prev : { ...prev, [key]: number },
          );
          setDecryptedTypes((prev) => (prev[key] !== undefined ? prev : { ...prev, [key]: type }));

          return { holder, number, type };
        }
      } catch (e) {
        console.error("Error decrypting card item:", e);
      }
      return cached;
    },
    [authContext?.getDEK],
  );

  useEffect(() => {
    if (orders && orders.length > 0 && isFocused) {
      orders.forEach((item) => {
        const key = String(item.id);
        const needsDecryption =
          !item?.metadataPublic?.cardType || !item?.metadataPublic?.cardNumberLast4;

        if (needsDecryption && decryptedNumbersRef.current[key] === undefined) {
          ensureDecryptedCard(item);
        }
      });
    }
  }, [orders, isFocused, ensureDecryptedCard]);

  const toggleHolderHidden = useCallback(
    async (item: any) => {
      const key = String(item?.id);
      const current = hiddenUsernamesRef.current[key] ?? true;
      const next = !current;
      setHiddenUsernames((prev) => ({ ...prev, [key]: next }));
      if (!next && decryptedHoldersRef.current[key] === undefined) {
        await ensureDecryptedCard(item);
      }
    },
    [ensureDecryptedCard],
  );

  const toggleNumberHidden = useCallback(
    async (item: any) => {
      const key = String(item?.id);
      const current = hiddenPasswordsRef.current[key] ?? true;
      const next = !current;
      setHiddenPasswords((prev) => ({ ...prev, [key]: next }));
      if (!next && decryptedNumbersRef.current[key] === undefined) {
        await ensureDecryptedCard(item);
      }
    },
    [ensureDecryptedCard],
  );

  return {
    hiddenUsernames,
    hiddenPasswords,
    decryptedHolders,
    decryptedNumbers,
    decryptedTypes,
    toggleHolderHidden,
    toggleNumberHidden,
    ensureDecryptedCard,
  };
}
