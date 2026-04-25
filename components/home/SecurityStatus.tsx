import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import React from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";

import { COLORS } from "../../constants";
import { useSecurity } from "../../store/security-context";
import { useTheme } from "../../theme/ThemeProvider";

import SectionHeader from "./SectionHeader";

export default function SecurityStatus() {
  const { dark } = useTheme();
  const { t } = useTranslation("common");
  const navigation = useNavigation<RootStackNavigationProp<"TabLayout">>();
  const { mpStatus, emailStatus } = useSecurity();

  const rows = [
    {
      key: "master",
      label: t("home.masterPassword", { defaultValue: "Master Password" }),
      badgeKey: (mpStatus as string) || "NONE",
      badgeMap: {
        CONFIGURED: {
          badge: t("home.statusBadge.configured", { defaultValue: "Active" }),
          hint: t("home.statusHint.master.CONFIGURED", {
            defaultValue: "Your vault is protected with a Master Password.",
          }),
          color: COLORS.success,
        },
        PENDING: {
          badge: t("home.statusBadge.pending", { defaultValue: "Pending" }),
          hint: t("home.statusHint.master.PENDING", {
            defaultValue: "Finish setting your Master Password to unlock cloud features.",
          }),
          color: COLORS.warning,
        },
        SKIPPED: {
          badge: t("home.statusBadge.skipped", { defaultValue: "Skipped" }),
          hint: t("home.statusHint.master.SKIPPED", {
            defaultValue: "Setup skipped. Enable it to secure your data.",
          }),
          color: COLORS.error,
        },
        NONE: {
          badge: t("home.statusBadge.none", { defaultValue: "Missing" }),
          hint: t("home.statusHint.master.NONE", {
            defaultValue: "No Master Password yet. Set it up to secure your vault.",
          }),
          color: COLORS.error,
        },
      } as const,
    },
    {
      key: "email",
      label: t("home.emailVerification", { defaultValue: "Email verification" }),
      badgeKey: (emailStatus as string) || "UNVERIFIED",
      badgeMap: {
        VERIFIED: {
          badge: t("home.statusBadge.verified", { defaultValue: "Verified" }),
          hint: t("home.statusHint.email.VERIFIED", {
            defaultValue: "Email is confirmed. Sharing and cloud sync are enabled.",
          }),
          color: COLORS.success,
        },
        UNVERIFIED: {
          badge: t("home.statusBadge.unverified", { defaultValue: "Unverified" }),
          hint: t("home.statusHint.email.UNVERIFIED", {
            defaultValue: "Verify your email to enable sharing and cloud sync.",
          }),
          color: COLORS.warning,
        },
      } as const,
    },
  ];

  return (
    <View>
      <SectionHeader
        title={t("home.securityStatus", { defaultValue: "Security Status" })}
        onPressText={t("home.securityManageCta", { defaultValue: "Security" })}
        onPress={() => navigation.navigate("SettingsSecurity")}
      />
      <View
        style={[
          styles.securityCard,
          {
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
            borderColor: dark ? COLORS.dark3 : "#E6E6E6",
          },
        ]}
      >
        {rows.map((row, idx) => {
          const meta =
            (row.badgeMap as any)[row.badgeKey] ||
            (row.badgeMap as any)[Object.keys(row.badgeMap)[0]];
          return (
            <View
              key={row.key}
              style={[
                styles.statusRow,
                {
                  borderColor: dark ? COLORS.dark3 : "#E6E6E6",
                  borderBottomWidth: idx === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={[styles.statusLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
                >
                  {row.label}
                </Text>
                <Text style={[styles.statusHint, { color: dark ? COLORS.gray : COLORS.gray }]}>
                  {meta?.hint}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    borderColor: meta?.color || COLORS.primary,
                    backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                  },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: meta?.color || COLORS.primary }]}>
                  {meta?.badge}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  securityCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: "medium",
    marginBottom: 6,
  },
  statusHint: {
    fontSize: 12,
    fontFamily: "regular",
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: "semiBold",
  },
});
