import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

import ButtonFilled from "./ButtonFilled";
import InputWithTooltip from "./InputWithTooltip";

export type RBSheetShareRef = {
  open: () => void;
  close: () => void;
};

interface Props {
  onShare: (email: string) => Promise<void> | void;
}

const RBSheetShare = forwardRef<RBSheetShareRef, Props>(({ onShare }, ref) => {
  const { dark } = useTheme();
  const { t } = useTranslation("common");
  const sheetRef = useRef<any>(null);

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      setError(undefined);
      sheetRef.current?.open();
    },
    close: () => sheetRef.current?.close(),
  }));

  const onInputChanged = (_: string, value: string) => {
    setEmail(value);
    if (error) setError(undefined);
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      await onShare(email);
      sheetRef.current?.close();
    } catch (e) {
      console.log("RBSheetShare: onShare error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RBSheet
      ref={sheetRef}
      closeOnPressMask={true}
      height={300}
      customStyles={{
        wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
        draggableIcon: { backgroundColor: dark ? COLORS.dark3 : "#000" },
        container: {
          borderTopRightRadius: 32,
          borderTopLeftRadius: 32,
          height: 300,
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
        {t("password.shareTitle") || "Share Password"}
      </Text>
      <View style={{ width: SIZES.width - 32 }}>
        <InputWithTooltip
          id="email"
          onInputChanged={onInputChanged}
          placeholder={t("common.email") || "Email"}
          placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          errorText={error as any}
        />
      </View>
      <View
        style={{
          width: SIZES.width - 32,
          marginTop: 8,
          flexDirection: "row",
          gap: 8,
        }}
      >
        <ButtonFilled
          title={t("common.cancel") || "Cancel"}
          onPress={() => sheetRef.current?.close()}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <ButtonFilled
          title={t("common.share") || "Share"}
          onPress={handleShare}
          isLoading={loading}
          disabled={loading}
          style={{ flex: 1 }}
        />
      </View>
    </RBSheet>
  );
});

export default RBSheetShare;
