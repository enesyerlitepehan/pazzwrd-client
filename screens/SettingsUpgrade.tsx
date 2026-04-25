import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Button from "../components/Button";
import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import { COLORS, SIZES } from "../constants";
import { useEntitlements } from "../store/entitlements-context";
import { useTheme } from "../theme/ThemeProvider";
import { RootStackNavigationProp } from "../navigation/types";

export default function SettingsUpgrade() {
  const { colors } = useTheme();
  const { t } = useTranslation("common");
  const navigation = useNavigation<RootStackNavigationProp<"SettingsUpgrade">>();
  const { entitlements } = useEntitlements();
  const [isLoading, setIsLoading] = useState(false);

  const q = entitlements?.quotas;
  const Row = ({ label, used, max }: { label: string; used?: number; max?: number | null }) => (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>
        {typeof used === "number" ? used : "-"} / {max == null ? "∞" : max}
      </Text>
    </View>
  );

  const handleCancel = useCallback(() => navigation.goBack(), [navigation]);
  const handleUpgrade = useCallback(async () => {
    setIsLoading(true);
    try {
      navigation.navigate("SettingsUpgradePlans");
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("upgrade.title")} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
        >
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("upgrade.subtitle")}
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("upgrade.subscriptionDetail")}
              </Text>
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>{t("upgrade.currentPlanBadge")}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t("upgrade.plan")}</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>
                {(entitlements as any)?.subscriptionPlanCode || "BASIC"}
              </Text>
            </View>
            {(entitlements as any)?.subscriptionExpiresAt && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  {t("upgrade.expiresAt")}
                </Text>
                <Text style={[styles.rowValue, { color: colors.text }]}>
                  {new Date((entitlements as any).subscriptionExpiresAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("upgrade.currentLimits")}
            </Text>
            <Row
              label={t("upgrade.passwords")}
              used={q?.password?.used}
              max={q?.password?.max ?? null}
            />
            <Row label={t("upgrade.cards")} used={q?.card?.used} max={q?.card?.max ?? null} />
            <Row label={t("upgrade.shares")} used={q?.share?.used} max={q?.share?.max ?? null} />
          </View>
        </ScrollView>
      </View>

      <View style={styles.bottomContainer}>
        <Button
          title={t("common.cancel")}
          style={{
            width: (SIZES.width - 32) / 2 - 8,
            borderRadius: 32,
            backgroundColor: colors.buttonSecondaryBackground,
            borderColor: colors.buttonSecondaryBackground,
          }}
          textColor={colors.buttonSecondaryText}
          onPress={handleCancel}
        />
        <ButtonFilled
          title={t("upgrade.upgrade")}
          style={styles.upgradeButton}
          onPress={handleUpgrade}
          isLoading={isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, padding: 16, backgroundColor: COLORS.white },
  subtitle: {
    fontSize: 14,
    fontFamily: "regular",
    marginTop: 8,
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontFamily: "semiBold", marginBottom: 8 },
  currentBadge: {
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  currentBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: "semiBold",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { fontSize: 14, fontFamily: "regular" },
  rowValue: { fontSize: 14, fontFamily: "semiBold" },
  bottomContainer: {
    position: "absolute",
    bottom: 32,
    right: 16,
    left: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    width: SIZES.width - 32,
    alignItems: "center",
  },
  upgradeButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});
