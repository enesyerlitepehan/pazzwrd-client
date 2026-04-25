import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";

import { useEntitlements } from "../../store/entitlements-context";
import { decryptEncryptedItem } from "../../utils/util";
import { RootStackNavigationProp, RootStackRouteProp } from "../../navigation/types";
import {
  CardFormState,
  buildInitialCardFormValues,
  buildDecryptedCardFormValues,
  CardFormValues,
} from "./formState";

interface UseCardDetailLifecycleProps {
  formState: CardFormState;
  dispatchFormState: React.Dispatch<any>;
  navigation: RootStackNavigationProp<"CardDetail">;
  route: RootStackRouteProp<"CardDetail">;
  getDEK: (() => Promise<Uint8Array | null>) | undefined;
  readOnly: boolean;
  onBeforeRemove: (e: any) => void;
  onCloudNotAllowed: (reason?: string) => void;
}

export const useCardDetailLifecycle = ({
  formState,
  dispatchFormState,
  navigation,
  route,
  getDEK,
  readOnly,
  onBeforeRemove,
  onCloudNotAllowed,
}: UseCardDetailLifecycleProps) => {
  const { t } = useTranslation("common");
  const { canCreateCardCloudAuto } = useEntitlements();

  const [cardId, setCardId] = useState<number | null>(null);
  const [syncType, setSyncType] = useState<"local" | "cloud">("local");

  const initialValuesRef = useRef<CardFormValues>(buildInitialCardFormValues({}));
  const initialSyncTypeRef = useRef<"local" | "cloud">("local");
  const ignoreNextRef = useRef(false);
  const hasUserEditedRef = useRef(false);

  // 1. Initial hydration from metadataPublic
  useEffect(() => {
    if (route.params?.cardData) {
      const cardData = route.params.cardData;
      setCardId(cardData.id as number);

      const sync = cardData.sync ? ("cloud" as const) : ("local" as const);
      setSyncType(sync);
      initialSyncTypeRef.current = sync;

      const nextInitial = buildInitialCardFormValues(cardData);

      // Dispatch base values
      (Object.keys(nextInitial) as (keyof CardFormValues)[]).forEach((key) => {
        dispatchFormState({
          inputId: key,
          validationResult: undefined,
          inputValue: nextInitial[key] || "",
        });
      });

      initialValuesRef.current = nextInitial;
      hasUserEditedRef.current = false;
    }
  }, [route.params?.cardData, dispatchFormState]);

  // 2. Decrypt private fields
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const item = route.params?.cardData;
        if (!item || typeof getDEK !== "function") return;

        const decrypted: any = await decryptEncryptedItem(item, getDEK);
        if (cancelled) return;

        if (decrypted && !hasUserEditedRef.current) {
          const nextValues = buildDecryptedCardFormValues(
            decrypted,
            initialValuesRef.current as CardFormValues,
          );

          (Object.keys(nextValues) as (keyof CardFormValues)[]).forEach((key) => {
            dispatchFormState({
              inputId: key,
              validationResult: undefined,
              inputValue: (nextValues as any)[key] || "",
            });
          });

          initialValuesRef.current = nextValues;
        }
      } catch (e) {
        console.error("Failed to decrypt card detail", e);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [route.params?.cardData, getDEK, dispatchFormState]);

  // 3. Handle sync type change with entitlement gate
  const handleSyncTypeChange = useCallback(
    async (id: string, option: string) => {
      const next = option as "local" | "cloud";
      const currentIsCloud = !!route.params?.cardData?.sync;
      if (!currentIsCloud && next === "cloud") {
        const gate = await canCreateCardCloudAuto();
        if (!gate.allowed) {
          onCloudNotAllowed(gate.reason || t("alerts.cloudNotAllowed"));
          // Revert to local
          setSyncType("local");
          dispatchFormState({
            inputId: id,
            validationResult: undefined,
            inputValue: "local",
          });
          return;
        }
      }
      setSyncType(next);
      dispatchFormState({
        inputId: id,
        validationResult: undefined,
        inputValue: next,
      });
    },
    [route.params?.cardData, canCreateCardCloudAuto, t, dispatchFormState, onCloudNotAllowed],
  );

  // 4. Dirty state tracking
  const isDirty = useMemo(() => {
    if (readOnly) return false;
    const init = initialValuesRef.current as any;
    const curr = formState.inputValues as any;
    const changedKey = Object.keys(init).some((k) => init[k] !== curr[k]);
    const syncChanged = initialSyncTypeRef.current !== syncType;
    return changedKey || syncChanged;
  }, [formState.inputValues, syncType, readOnly]);

  // 5. beforeRemove guard
  useEffect(() => {
    const beforeRemove = (e: any) => {
      if (ignoreNextRef.current || !isDirty) {
        ignoreNextRef.current = false;
        return;
      }
      onBeforeRemove(e);
    };

    // @ts-ignore
    const sub = navigation.addListener("beforeRemove", beforeRemove);
    return sub;
  }, [navigation, isDirty, onBeforeRemove]);

  return {
    cardId,
    syncType,
    setSyncType,
    initialValuesRef,
    hasUserEditedRef,
    ignoreNextRef,
    isDirty,
    handleSyncTypeChange,
  };
};
