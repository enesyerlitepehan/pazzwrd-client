import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { validateInput } from "../../utils/actions/formActions";
import { Password } from "../../utils/types/passwordTypes";
import { buildFormValues, PasswordFormValues } from "./formState";

interface UsePasswordDetailFormLifecycleProps {
  passwordData?: Password;
  syncType: "local" | "cloud";
  setSyncType: (type: "local" | "cloud") => void;
  readOnly: boolean;
  dispatchFormState: React.Dispatch<any>;
  onConfirmUnsaved: (onProceed: () => void) => void;
}

export const usePasswordDetailFormLifecycle = ({
  passwordData,
  syncType,
  setSyncType,
  readOnly,
  dispatchFormState,
  onConfirmUnsaved,
}: UsePasswordDetailFormLifecycleProps) => {
  const { t } = useTranslation("common");
  const navigation = useNavigation();

  const initialFormValues = useMemo(() => buildFormValues(passwordData, null), [passwordData]);
  const [updatedValues, setUpdatedValues] = useState<PasswordFormValues>(initialFormValues);

  const initialValuesRef = useRef<PasswordFormValues>(initialFormValues);
  const initialSyncTypeRef = useRef(syncType);
  const hasUserEditedRef = useRef(false);
  const ignoreNextRef = useRef(false);

  const dispatchInitialFormState = useCallback(
    (values: PasswordFormValues) => {
      const formValues = {
        name: values.name || "",
        userName: values.userName || "",
        password: values.password || "",
        url: values.url || "",
        notes: values.notes || "",
        tags: values.tags || "",
        expireDate: values.expireDate || "",
        lastUpdated: values.updatedAt || "",
      };

      const initialValidities: any = {};
      Object.keys(formValues).forEach((key) => {
        initialValidities[key] = validateInput(key, (formValues as any)[key]);
      });

      dispatchFormState({
        type: "RESET_FORM",
        initialState: {
          inputValues: formValues,
          inputValidities: initialValidities,
          formIsValid: !Object.values(initialValidities).some((v) => typeof v === "string"),
        },
      });
    },
    [dispatchFormState],
  );

  // Sync form state when passwordData changes
  useEffect(() => {
    const baseValues = buildFormValues(passwordData, null);
    setUpdatedValues(baseValues);
    initialValuesRef.current = baseValues;
    hasUserEditedRef.current = false;

    dispatchInitialFormState(baseValues);

    const sync = baseValues.sync ? "cloud" : "local";
    setSyncType(sync);
    initialSyncTypeRef.current = sync;
  }, [passwordData, dispatchInitialFormState, setSyncType]);

  const isDirty = useMemo(() => {
    if (readOnly) return false;
    const init = initialValuesRef.current;
    const curr = updatedValues;
    return (
      init.name !== curr.name ||
      init.userName !== curr.userName ||
      init.password !== curr.password ||
      init.url !== curr.url ||
      init.notes !== curr.notes ||
      init.tags !== curr.tags ||
      init.expireDate !== curr.expireDate ||
      init.updatedAt !== curr.updatedAt ||
      initialSyncTypeRef.current !== syncType
    );
  }, [updatedValues, syncType, readOnly]);

  useEffect(() => {
    const beforeRemove = (e: any) => {
      if (ignoreNextRef.current || !isDirty) {
        ignoreNextRef.current = false;
        return;
      }
      e.preventDefault();

      onConfirmUnsaved(() => {
        ignoreNextRef.current = true;
        // Proceed the navigation action
        navigation.dispatch(e.data.action);
      });
    };

    const sub = navigation.addListener("beforeRemove", beforeRemove);
    return sub;
  }, [navigation, isDirty, onConfirmUnsaved]);

  const inputChangedHandler = useCallback(
    (inputId: string, inputValue: string) => {
      hasUserEditedRef.current = true;
      // Update the form state for validation
      const result = validateInput(inputId, inputValue);
      dispatchFormState({
        inputId,
        validationResult: result,
        inputValue,
      });

      // Also update our tracked values state
      setUpdatedValues((prevValues) => {
        if (inputId === "syncType") return { ...prevValues, sync: inputValue === "cloud" };
        return { ...prevValues, [inputId]: inputValue } as PasswordFormValues;
      });
    },
    [dispatchFormState],
  );

  return {
    updatedValues,
    setUpdatedValues,
    initialValuesRef,
    hasUserEditedRef,
    ignoreNextRef,
    isDirty,
    inputChangedHandler,
    dispatchInitialFormState,
  };
};
