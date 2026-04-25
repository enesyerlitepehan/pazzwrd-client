import React from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";

import { COLORS, SIZES } from "../../constants";
import type { HomeCounts, HomeTrash } from "../../hooks/useHomeMetrics";
import { useTheme } from "../../theme/ThemeProvider";
import { formatTimeRemaining } from "../../utils/trashUtils";

import SectionHeader from "./SectionHeader";

type Props = {
  counts: HomeCounts;
  trash: HomeTrash;
};

export default function TrashSummary({ counts, trash }: Props) {
  const { dark } = useTheme();
  const { t } = useTranslation("common");
  const tileWidth = (SIZES.width - 32 - 24) / 3;

  return (
    <View>
      <SectionHeader title="Trash" onPress={() => {}} />

      <View style={styles.statGrid}>
        <StatTile
          width={tileWidth}
          dark={dark}
          label={t("trash.passwordsLabel", { defaultValue: "Trash (Passwords)" })}
          value={String(counts.passwords.trash || 0)}
        />
        <StatTile
          width={tileWidth}
          dark={dark}
          label={t("trash.cardsLabel", { defaultValue: "Trash (Cards)" })}
          value={String(counts.cards.trash || 0)}
        />
      </View>

      {(counts.passwords.trash > 0 || counts.cards.trash > 0) && (
        <View style={styles.cardBox}>
          {counts.passwords.trash > 0 && trash?.passwords && !trash.passwords.expired ? (
            <Text style={[styles.rowSub, { color: dark ? COLORS.gray : COLORS.gray }]}>
              {t("trash.info.password", {
                time: formatTimeRemaining(t, trash.passwords.parts),
              })}
            </Text>
          ) : null}
          {counts.cards.trash > 0 && trash?.cards && !trash.cards.expired ? (
            <Text style={[styles.rowSub, { color: dark ? COLORS.gray : COLORS.gray }]}>
              {t("trash.info.card", {
                time: formatTimeRemaining(t, trash.cards.parts),
              })}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function StatTile({
  label,
  value,
  width,
  dark,
  accent,
}: {
  label: string;
  value: string | number;
  width: number;
  dark: boolean;
  accent?: string;
}) {
  return (
    <View
      style={[
        styles.statTile,
        {
          width,
          backgroundColor: dark ? COLORS.dark2 : "#F5F5F5",
          borderColor: dark ? COLORS.dark3 : "#E6E6E6",
        },
      ]}
    >
      <Text
        style={[styles.statValue, { color: accent || (dark ? COLORS.white : COLORS.greyscale900) }]}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: dark ? COLORS.gray : COLORS.gray }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statGrid: {
    width: SIZES.width - 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 16,
  },
  statTile: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontFamily: "bold",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "regular",
    textAlign: "center",
  },
  cardBox: {
    width: SIZES.width - 32,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "regular",
  },
});
