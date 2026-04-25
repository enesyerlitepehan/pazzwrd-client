import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

import ButtonFilled from "./ButtonFilled";
import InputWithTooltip from "./InputWithTooltip";
import SegmentedControl from "./SegmentedControl";

interface CardDetailFormProps {
  formState: {
    inputValues: {
      [key: string]: string;
    };
    inputValidities: {
      [key: string]: string | boolean;
    };
  };
  onInputChanged: (inputId: string, inputValue: string) => void;
  syncType: "local" | "cloud";
  onSyncTypeChanged: (id: string, option: string) => void;
  onSave: () => void;
  isLoading: boolean;
  buttonTitle?: string; // Optional prop for button title
  readOnly?: boolean;
  infoMessage?: string;
}

/**
 * CardDetailForm component for displaying and editing card details
 */
const CardDetailForm: React.FC<CardDetailFormProps> = ({
  formState,
  onInputChanged,
  syncType,
  onSyncTypeChanged,
  onSave,
  isLoading = false,
  buttonTitle,
  readOnly = false,
  infoMessage,
}) => {
  const [isCardPasswordHidden, setIsCardPasswordHidden] = useState(true);
  const { colors } = useTheme();
  const { t } = useTranslation("common");
  // Custom handler for CVV input - limit to 3 digits
  const handleCvvInput = useCallback(
    (id: string, value: string) => {
      // Only allow up to 3 numeric characters
      const formattedValue = value.replace(/\D/g, "").slice(0, 3);
      onInputChanged(id, formattedValue);
    },
    [onInputChanged],
  );
  // Custom handler for card number input - limit to 16 digits and format
  const handleCardNumberInput = useCallback(
    (id: string, value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 16);
      const formattedValue = digits.replace(/(.{4})/g, "$1 ").trim();
      onInputChanged(id, formattedValue);
    },
    [onInputChanged],
  );
  // Custom handler for expiry date input - format as MM/YY
  const handleExpiryDateInput = useCallback(
    (id: string, value: string) => {
      // Remove non-numeric characters
      const numericValue = value.replace(/\D/g, "");

      let formattedValue = "";

      if (numericValue.length <= 2) {
        // Just show the month part
        formattedValue = numericValue;
      } else {
        // Format as MM/YY
        formattedValue = `${numericValue.slice(0, 2)}/${numericValue.slice(2, 4)}`;
      }

      onInputChanged(id, formattedValue);
    },
    [onInputChanged],
  );

  return (
    <View style={{ paddingBottom: 26 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="on-drag"
      >
        {infoMessage ? (
          <View
            style={{
              backgroundColor: COLORS.secondary + "22",
              borderColor: COLORS.secondary,
              borderWidth: StyleSheet.hairlineWidth,
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.text }}>
              {t("common.information")}: {infoMessage}
            </Text>
          </View>
        ) : null}
        <SegmentedControl
          id="syncType"
          options={["local", "cloud"]}
          selectedOption={syncType}
          onSelectionChanged={(id, option) => {
            onSyncTypeChanged(id, option);
          }}
          labelMap={{ local: t("sync.local"), cloud: t("sync.cloud") }}
          tooltipInfo={t("card.tooltips.sync")}
          disabled={readOnly}
        />

        <InputWithTooltip
          id="bankName"
          onInputChanged={onInputChanged}
          label={t("card.bankNamePlaceholder")}
          errorText={
            typeof formState.inputValidities["bankName"] === "string"
              ? formState.inputValidities["bankName"]
              : undefined
          }
          placeholder={t("card.bankNamePlaceholder")}
          placeholderTextColor={colors.inputPlaceholder}
          tooltipInfo={t("card.tooltips.bankName")}
          value={formState.inputValues.bankName}
          editable={!readOnly}
          showDoneButton={!readOnly}
        />
        <InputWithTooltip
          id="cardHolderName"
          onInputChanged={onInputChanged}
          label={t("card.holderNamePlaceholder")}
          errorText={
            typeof formState.inputValidities["cardHolderName"] === "string"
              ? formState.inputValidities["cardHolderName"]
              : undefined
          }
          placeholder={t("card.holderNamePlaceholder")}
          placeholderTextColor={colors.inputPlaceholder}
          tooltipInfo={t("card.tooltips.holderName")}
          value={formState.inputValues.cardHolderName}
          editable={!readOnly}
          showDoneButton={!readOnly}
        />
        <InputWithTooltip
          id="cardNumber"
          onInputChanged={handleCardNumberInput}
          label={t("card.numberPlaceholder")}
          errorText={
            typeof formState.inputValidities["cardNumber"] === "string"
              ? formState.inputValidities["cardNumber"]
              : undefined
          }
          placeholder={t("card.numberPlaceholder")}
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="number-pad"
          returnKeyType="done"
          tooltipInfo={t("card.tooltips.number")}
          value={formState.inputValues.cardNumber}
          maxLength={19}
          editable={!readOnly}
          showDoneButton={!readOnly}
        />
        <InputWithTooltip
          id="expiryDate"
          onInputChanged={handleExpiryDateInput}
          label={t("card.expiryPlaceholder")}
          errorText={
            typeof formState.inputValidities["expiryDate"] === "string"
              ? formState.inputValidities["expiryDate"]
              : undefined
          }
          placeholder={t("card.expiryPlaceholder")}
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="number-pad"
          returnKeyType="done"
          tooltipInfo={t("card.tooltips.expiry")}
          value={formState.inputValues.expiryDate}
          maxLength={5}
          editable={!readOnly}
          showDoneButton={!readOnly}
        />
        <InputWithTooltip
          id="cvv"
          onInputChanged={handleCvvInput}
          label={t("card.cvvPlaceholder")}
          errorText={
            typeof formState.inputValidities["cvv"] === "string"
              ? formState.inputValidities["cvv"]
              : undefined
          }
          placeholder={t("card.cvvPlaceholder")}
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="number-pad"
          returnKeyType="done"
          tooltipInfo={t("card.tooltips.cvv")}
          value={formState.inputValues.cvv}
          maxLength={3}
          editable={!readOnly}
          showDoneButton={!readOnly}
        />
        <InputWithTooltip
          id="cardPassword"
          onInputChanged={onInputChanged}
          label={t("card.cardPasswordPlaceholder")}
          placeholder={t("card.cardPasswordPlaceholder")}
          placeholderTextColor={colors.inputPlaceholder}
          tooltipInfo={t("card.tooltips.cardPassword")}
          value={formState.inputValues.cardPassword}
          secureTextEntry={isCardPasswordHidden}
          showVisibilityToggle={!readOnly}
          onToggleVisibility={() => setIsCardPasswordHidden((v) => !v)}
          editable={!readOnly}
          showDoneButton={!readOnly}
        />
        <ButtonFilled
          title={
            isLoading
              ? t("common.saving")
              : readOnly
                ? "Restore"
                : (() => {
                    if (!buttonTitle) return t("common.save");
                    const normalized = buttonTitle.trim().toLowerCase();
                    if (normalized === "update") return t("common.update");
                    if (normalized === "save") return t("common.save");
                    return buttonTitle; // assume already localized
                  })()
          }
          style={styles.continueButton}
          onPress={onSave}
          disabled={isLoading}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  continueButton: {
    width: SIZES.width - 32,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});

export default CardDetailForm;
