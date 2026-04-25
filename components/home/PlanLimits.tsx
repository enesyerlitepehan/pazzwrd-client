import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import React from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import { COLORS } from "../../constants";
import { useEntitlements } from "../../store/entitlements-context";
import { useTheme } from "../../theme/ThemeProvider";

import SectionHeader from "./SectionHeader";

export default function PlanLimits() {
  const { dark } = useTheme();
  const { t } = useTranslation("common");
  const navigation = useNavigation<RootStackNavigationProp<"TabLayout">>();
  const { entitlements } = useEntitlements();

  const quotas = [
    {
      key: "password",
      label: t("items.password"),
      quota: entitlements?.quotas?.password,
    },
    { key: "card", label: t("items.card"), quota: entitlements?.quotas?.card },
    {
      key: "share",
      label: t("home.shares", { defaultValue: "Shares" }),
      quota: entitlements?.quotas?.share,
    },
  ] as const;

  return (
    <View>
      <SectionHeader
        title={t("home.planLimits", { defaultValue: "Plan & Limits" })}
        onPressText={
          entitlements?.isPremium
            ? t("home.planManageCta", { defaultValue: "Manage" })
            : t("home.planUpgradeCta")
        }
        onPress={() => navigation.navigate("SettingsUpgrade")}
      />

      <View
        style={[
          styles.planCard,
          {
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
            borderColor: dark ? COLORS.dark3 : "#E6E6E6",
          },
        ]}
      >
        <View style={styles.planHeader}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.planLabel, { color: dark ? COLORS.gray : COLORS.gray }]}>
              {t("home.planCurrent", { defaultValue: "Current plan" })}
            </Text>
            <Text style={[styles.planName, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
              {entitlements
                ? entitlements.isPremium
                  ? t("home.planPremiumName", { defaultValue: "Premium" })
                  : t("home.planFreeName", { defaultValue: "Free" })
                : t("home.planUnknownName", { defaultValue: "Loading..." })}
            </Text>
            <Text style={[styles.planSub, { color: dark ? COLORS.gray : COLORS.gray }]}>
              {entitlements
                ? entitlements.isPremium
                  ? t("home.planPremiumDescription", {
                      defaultValue: "Premium limits are active.",
                    })
                  : t("home.planFreeDescription", {
                      defaultValue: "Upgrade to unlock more storage and sharing.",
                    })
                : t("home.planLoading", {
                    defaultValue: "Fetching entitlements...",
                  })}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.planAction,
              {
                borderColor: dark ? COLORS.dark3 : COLORS.primary,
                backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              },
            ]}
            onPress={() => navigation.navigate("SettingsUpgrade")}
          >
            <Text style={[styles.planActionText, { color: dark ? COLORS.white : COLORS.primary }]}>
              {entitlements?.isPremium
                ? t("home.planManageCta", { defaultValue: "Manage" })
                : t("home.planUpgradeCta")}
            </Text>
          </TouchableOpacity>
        </View>

        {quotas.map((row) => {
          const used = Number.isFinite(row.quota?.used) ? row.quota!.used : 0;
          const max = Number.isFinite(row.quota?.max) ? (row.quota!.max as number) : null;
          const rawProgress = max == null || max <= 0 ? 0 : used / max;
          const progress = Number.isFinite(rawProgress) ? Math.min(1, Math.max(0, rawProgress)) : 0;
          const remaining = max == null ? null : Math.max(Math.floor(max - used), 0);
          return (
            <View key={row.key} style={styles.limitRow}>
              <View style={styles.limitRowHeader}>
                <Text
                  style={[styles.limitLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
                >
                  {row.label}
                </Text>
                <Text
                  style={[styles.limitValue, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
                >
                  {used} / {max == null ? "∞" : max}
                </Text>
              </View>
              <View
                style={[
                  styles.limitProgressTrack,
                  {
                    backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                  },
                ]}
              >
                <View style={[styles.limitProgressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={[styles.limitHint, { color: dark ? COLORS.gray : COLORS.gray }]}>
                {max == null
                  ? t("home.unlimited", { defaultValue: "Unlimited" })
                  : t("home.remaining", {
                      count: remaining ?? 0,
                      defaultValue: "{{count}} remaining",
                    })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  planCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 12,
    fontFamily: "regular",
    marginBottom: 4,
  },
  planName: {
    fontSize: 16,
    fontFamily: "semiBold",
    marginBottom: 6,
  },
  planSub: {
    fontSize: 12,
    fontFamily: "regular",
  },
  planAction: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  planActionText: {
    fontSize: 14,
    fontFamily: "medium",
  },
  limitRow: {
    marginTop: 8,
  },
  limitRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  limitLabel: {
    fontSize: 14,
    fontFamily: "medium",
  },
  limitValue: {
    fontSize: 14,
    fontFamily: "semiBold",
  },
  limitProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 6,
    overflow: "hidden",
  },
  limitProgressFill: {
    height: 8,
    backgroundColor: COLORS.primary,
  },
  limitHint: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "regular",
  },
});
