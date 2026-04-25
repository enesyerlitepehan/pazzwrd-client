import React from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";

import { COLORS, SIZES } from "../../constants";
import type { HomeCounts } from "../../hooks/useHomeMetrics";
import { useTheme } from "../../theme/ThemeProvider";

import SectionHeader from "./SectionHeader";

type Props = {
  counts: HomeCounts;
};

export default function Statistics({ counts }: Props) {
  const { dark } = useTheme();
  const { t } = useTranslation("common");

  const tileWidth = (SIZES.width - 32 - 24) / 3; // 3 tiles per row with spacing

  return (
    <View>
      <SectionHeader title={t("home.statistics")} onPress={() => {}} />
      <View style={styles.statGrid}>
        <StatTile
          width={tileWidth}
          dark={dark}
          label="Passwords (Cloud)"
          value={String(counts.passwords.cloud || 0)}
        />
        <StatTile
          width={tileWidth}
          dark={dark}
          label="Passwords (Local)"
          value={String(counts.passwords.local || 0)}
        />
        <StatTile
          width={tileWidth}
          dark={dark}
          label="Cards"
          value={String((counts.cards.cloud || 0) + (counts.cards.local || 0))}
        />
      </View>
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
    marginBottom: 12,
  },
  statTile: {
    paddingVertical: 16,
    borderRadius: 12,
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
  },
});
