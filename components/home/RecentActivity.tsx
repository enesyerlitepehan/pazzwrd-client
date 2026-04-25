import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";

import { COLORS, SIZES } from "../../constants";
import type { HomeRecent } from "../../hooks/useHomeMetrics";
import { useTheme } from "../../theme/ThemeProvider";

import SectionHeader from "./SectionHeader";

type Props = {
  recent: HomeRecent;
};

export default function RecentActivity({ recent }: Props) {
  const { dark } = useTheme();
  const { t } = useTranslation("common");

  const history = {
    password: {
      added: recent.password.added || { title: "", when: "" },
      updated: recent.password.updated || { title: "", when: "" },
      deleted: recent.password.deleted || { title: "", when: "" },
    },
    card: {
      added: recent.card.added || { title: "", when: "" },
      updated: recent.card.updated || { title: "", when: "" },
      deleted: recent.card.deleted || { title: "", when: "" },
    },
  } as const;

  return (
    <View>
      <SectionHeader title={t("home.recentActivity")} onPress={() => {}} />

      <View style={styles.cardBox}>
        <Text style={[styles.groupTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
          {t("items.password")}
        </Text>
        <HistoryRow
          iconName="plus"
          color={COLORS.primary}
          label="Last added"
          item={history.password.added}
          dark={dark}
        />
        <HistoryRow
          iconName="edit"
          color={COLORS.primary}
          label="Last updated"
          item={history.password.updated}
          dark={dark}
        />
        <HistoryRow
          iconName="trash"
          color={COLORS.primary}
          label="Last deleted"
          item={history.password.deleted}
          dark={dark}
        />
      </View>

      <View style={styles.cardBox}>
        <Text style={[styles.groupTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
          {t("items.card")}
        </Text>
        <HistoryRow
          iconName="plus"
          color={COLORS.primary}
          label="Last added"
          item={history.card.added}
          dark={dark}
        />
        <HistoryRow
          iconName="edit"
          color={COLORS.primary}
          label="Last updated"
          item={history.card.updated}
          dark={dark}
        />
        <HistoryRow
          iconName="trash"
          color={COLORS.primary}
          label="Last deleted"
          item={history.card.deleted}
          dark={dark}
        />
      </View>
    </View>
  );
}

function HistoryRow({
  iconName,
  color,
  label,
  item,
  dark,
}: {
  iconName: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
  label: string;
  item: { title: string; when: string };
  dark: boolean;
}) {
  return (
    <View
      style={[
        styles.rowItem,
        {
          backgroundColor: dark ? COLORS.dark2 : "#F5F5F5",
          borderColor: dark ? COLORS.dark3 : "#E6E6E6",
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: dark ? COLORS.dark3 : COLORS.white }]}>
        <FontAwesome name={iconName} size={14} color={color} />
      </View>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
          {label}
        </Text>
        <Text
          style={[styles.rowSub, { color: dark ? COLORS.gray : COLORS.gray }]}
          numberOfLines={1}
        >
          {item.title} • {item.when}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardBox: {
    width: SIZES.width - 32,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  groupTitle: {
    fontSize: 16,
    fontFamily: "semiBold",
    marginBottom: 8,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: "medium",
    marginBottom: 4,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "regular",
  },
});
