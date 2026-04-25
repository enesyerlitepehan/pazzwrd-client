import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";

import { COLORS, SIZES } from "../constants";

import ButtonFilled from "./ButtonFilled";
import InputWithTooltip from "./InputWithTooltip";
import SegmentedControl from "./SegmentedControl";

export type RBSheetExpireDateRef = {
  open: () => void;
  close: () => void;
};

interface Props {
  dark: boolean;
  onApply: (formattedDate: string) => void;
}

const RBSheetExpireDate = forwardRef<RBSheetExpireDateRef, Props>(({ dark, onApply }, ref) => {
  const { t } = useTranslation("common");
  const sheetRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.open(),
    close: () => sheetRef.current?.close(),
  }));

  // Local state managing IN/ON and quick/custom modes
  const [expireMode, setExpireMode] = useState<"IN" | "ON">("IN");
  const [inModeType, setInModeType] = useState<"QUICK" | "CUSTOM">("QUICK");
  const [selectedQuick, setSelectedQuick] = useState<number>(30);
  const [customAmount, setCustomAmount] = useState<string>("30");
  const [customUnit, setCustomUnit] = useState<"days" | "weeks" | "months">("days");
  const [onDate, setOnDate] = useState<Date>(new Date());

  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const computeTargetDate = useMemo(() => {
    if (expireMode === "ON") return onDate;
    if (inModeType === "QUICK") return addDays(new Date(), selectedQuick);
    const amt = parseInt(customAmount || "0", 10) || 0;
    const days = customUnit === "days" ? amt : customUnit === "weeks" ? amt * 7 : amt * 30; // approx months
    return addDays(new Date(), days);
  }, [expireMode, inModeType, selectedQuick, customAmount, customUnit, onDate]);

  const formatDate = (d: Date) => {
    try {
      return d.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  };

  const handleApply = () => {
    const formatted = formatDate(computeTargetDate);
    onApply(formatted);
    sheetRef.current?.close();
  };

  return (
    <RBSheet
      ref={sheetRef}
      closeOnPressMask={true}
      height={520}
      customStyles={{
        wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
        draggableIcon: { backgroundColor: dark ? COLORS.dark3 : "#000" },
        container: {
          borderTopRightRadius: 32,
          borderTopLeftRadius: 32,
          height: 380,
          backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          alignItems: "center",
          padding: 16,
        },
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          color: dark ? COLORS.white : COLORS.greyscale900,
          marginTop: 8,
          marginBottom: 12,
        }}
      >
        {t("password.expireDate")}
      </Text>

      <View style={{ width: SIZES.width - 32, marginBottom: 12 }}>
        <SegmentedControl
          id="expireMode"
          options={["IN", "ON"]}
          selectedOption={expireMode}
          onSelectionChanged={(id, option) => setExpireMode(option as any)}
          labelMap={{ IN: "IN", ON: "ON" }}
        />
      </View>

      {expireMode === "IN" ? (
        <View style={{ width: SIZES.width - 32 }}>
          <SegmentedControl
            id="inModeType"
            options={["QUICK", "CUSTOM"]}
            selectedOption={inModeType}
            onSelectionChanged={(id, option) => setInModeType(option as any)}
            labelMap={{
              QUICK: t("common.quick") || "Quick",
              CUSTOM: t("common.custom") || "Custom",
            }}
          />

          {inModeType === "QUICK" ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {[30, 60, 90, 180].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setSelectedQuick(d)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor:
                      selectedQuick === d
                        ? COLORS.primary
                        : dark
                          ? COLORS.dark3
                          : COLORS.greyscale500,
                    backgroundColor:
                      selectedQuick === d
                        ? COLORS.tansparentPrimary
                        : dark
                          ? COLORS.dark2
                          : COLORS.white,
                  }}
                >
                  <Text
                    style={{ color: dark ? COLORS.white : COLORS.greyscale900 }}
                  >{`${d}d`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ marginTop: 12 }}>
              <InputWithTooltip
                id="customAmount"
                onInputChanged={(id, val) => setCustomAmount(val.replace(/[^0-9]/g, ""))}
                placeholder={t("common.amount") || "Amount"}
                keyboardType="numeric"
                value={customAmount}
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
              />
              <View style={{ marginTop: 8 }}>
                <SegmentedControl
                  id="customUnit"
                  options={["days", "weeks", "months"]}
                  selectedOption={customUnit}
                  onSelectionChanged={(id, option) => setCustomUnit(option as any)}
                  labelMap={{
                    days: t("common.days") || "days",
                    weeks: t("common.weeks") || "weeks",
                    months: t("common.months") || "months",
                  }}
                />
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={{ width: SIZES.width - 32 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              const next = new Date(onDate);
              next.setDate(next.getDate() + 1);
              setOnDate(next);
            }}
          >
            <InputWithTooltip
              id="onDate"
              onInputChanged={() => {}}
              placeholder={t("common.date") || "Date"}
              value={formatDate(onDate)}
              editable={false}
              placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            />
          </TouchableOpacity>
          <Text
            style={{
              color: dark ? COLORS.greyscale500 : COLORS.greyscale600,
              textAlign: "center",
              marginTop: 4,
            }}
          >
            {t("common.tip") || "Tip"}:{" "}
            {t("common.tapToChange") || "tap to change day (placeholder)"}
          </Text>
        </View>
      )}

      <View style={{ width: SIZES.width - 32, marginTop: 16 }}>
        <Text style={{ color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }}>
          {t("common.preview") || "Preview"}: {formatDate(computeTargetDate)}
        </Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <ButtonFilled
              title={t("common.cancel") || "Cancel"}
              onPress={() => sheetRef.current?.close()}
            />
          </View>
          <View style={{ flex: 1 }}>
            <ButtonFilled title={t("common.apply") || "Apply"} onPress={handleApply} />
          </View>
        </View>
      </View>
    </RBSheet>
  );
});

export default RBSheetExpireDate;
