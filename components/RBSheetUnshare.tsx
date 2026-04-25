import Checkbox from "expo-checkbox";
import React, { forwardRef, useImperativeHandle, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";

import { COLORS, SIZES } from "../constants";
import { useTheme } from "../theme/ThemeProvider";

import ButtonFilled from "./ButtonFilled";

export type RecipientEntry = {
  recipientId: number;
  displayName: string;
  status: string;
};

export type ShareWithRecipients = {
  shareId: number;
  recipients: RecipientEntry[];
};

export type RemoveSelection = Record<number, number[]>; // map: shareId -> recipientIds[]

export type RBSheetUnshareRef = {
  open: (data: ShareWithRecipients[]) => void;
  openLoading: () => void;
  setData: (data: ShareWithRecipients[]) => void;
  close: () => void;
};

interface Props {
  onRemove: (selection: RemoveSelection) => Promise<void> | void;
}

const RBSheetUnshare = forwardRef<RBSheetUnshareRef, Props>(({ onRemove }, ref) => {
  const sheetRef = useRef<any>(null);
  const { dark } = useTheme();
  const { t } = useTranslation("common");

  const [data, setData] = useState<ShareWithRecipients[]>([]);
  const [selected, setSelected] = useState<RemoveSelection>({});
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const applyData = (d: ShareWithRecipients[]) => {
    setData(d || []);
    setSelected({});
    setIsFetching(false);
  };

  useImperativeHandle(ref, () => ({
    open: (d: ShareWithRecipients[]) => {
      applyData(d || []);
      sheetRef.current?.open();
    },
    openLoading: () => {
      setData([]);
      setSelected({});
      setIsFetching(true);
      sheetRef.current?.open();
    },
    setData: (d: ShareWithRecipients[]) => {
      applyData(d || []);
    },
    close: () => {
      setIsFetching(false);
      sheetRef.current?.close();
    },
  }));

  const flatCount = useMemo(
    () => data.reduce((acc, s) => acc + (s.recipients?.length || 0), 0),
    [data],
  );

  const toggle = (shareId: number, recipientId: number) => {
    setSelected((prev) => {
      const cur = new Set(prev[shareId] || []);
      if (cur.has(recipientId)) cur.delete(recipientId);
      else cur.add(recipientId);
      return { ...prev, [shareId]: Array.from(cur) };
    });
  };

  const handleRemove = async () => {
    setLoading(true);
    // Close the sheet immediately to avoid blocking the UI while the removal is processed
    sheetRef.current?.close();
    try {
      await onRemove(selected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RBSheet
      ref={sheetRef}
      closeOnPressMask={true}
      height={Math.min(520, Math.max(320, 140 + Math.min(8, flatCount) * 48))}
      customStyles={{
        wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
        draggableIcon: { backgroundColor: dark ? COLORS.dark3 : "#000" },
        container: {
          borderTopRightRadius: 32,
          borderTopLeftRadius: 32,
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
        {t("password.selectPeopleToUnshare")}
      </Text>
      <ScrollView style={{ width: SIZES.width - 32 }}>
        {isFetching && (
          <View
            style={{
              minHeight: 120,
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
            }}
          >
            <ActivityIndicator size="small" color={dark ? COLORS.white : COLORS.greyscale900} />
            <Text
              style={{
                fontSize: 14,
                color: dark ? COLORS.secondaryWhite : COLORS.grayscale700,
              }}
            >
              {t("password.shareStatusLoading")}
            </Text>
          </View>
        )}
        {data.map((s) => (
          <View key={`share-${s.shareId}`} style={{ marginBottom: 8 }}>
            {data.length > 1 && (
              <Text
                style={{
                  fontSize: 12,
                  color: dark ? COLORS.secondaryWhite : COLORS.grayscale700,
                  marginBottom: 4,
                }}
              >
                #{s.shareId}
              </Text>
            )}
            {(s.recipients || []).map((r) => {
              const checked = (selected[s.shareId] || []).includes(r.recipientId);
              return (
                <TouchableOpacity
                  onPress={() => toggle(s.shareId, r.recipientId)}
                  key={`r-${s.shareId}-${r.recipientId}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8,
                    gap: 10,
                  }}
                >
                  <Checkbox
                    value={checked}
                    onValueChange={() => toggle(s.shareId, r.recipientId)}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        color: dark ? COLORS.white : COLORS.greyscale900,
                      }}
                      numberOfLines={1}
                    >
                      {r.displayName || String(r.recipientId)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: dark ? COLORS.secondaryWhite : COLORS.grayscale700,
                      }}
                    >
                      {r.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <View
        style={{
          width: SIZES.width - 32,
          marginTop: 8,
          flexDirection: "row",
          gap: 8,
        }}
      >
        <ButtonFilled
          title={t("common.cancel")}
          onPress={() => {
            setIsFetching(false);
            sheetRef.current?.close();
          }}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <ButtonFilled
          title={t("password.removeAccess")}
          onPress={handleRemove}
          isLoading={loading}
          disabled={loading || isFetching}
          style={{ flex: 1 }}
        />
      </View>
    </RBSheet>
  );
});

export default RBSheetUnshare;
