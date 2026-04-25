import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiGetPlans, apiSyncRevenueCat } from "../api/api";
import Header from "../components/Header";
import LoadingModal from "../components/ui/LoadingModal";
import { APPLE_STANDARD_EULA_URL } from "../constants/legal";
import { COLORS, SIZES } from "../constants";
import { RC_DEFAULT_OFFERING_ID, RC_PRODUCT_IDS } from "../constants/revenuecat";
import * as RC from "../service/revenuecat";
import { AuthContext } from "../store/auth-context";
import { useEntitlements } from "../store/entitlements-context";
import { useTheme } from "../theme/ThemeProvider";

type Plan = {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
  isPremium: boolean;
  passwordLimit: number | null;
  cardLimit: number | null;
  shareLimit: number | null;
  cloudSync: boolean;
  secureNotes: boolean;
  watchtower: boolean;
  itemHistory: boolean;
  exportEnabled: boolean;
  prioritySupport: boolean;
  familySharing: boolean;
  maxFamilyMembers: number;
  monthlyPrice: number | string;
  yearlyPrice: number | string;
};

export default function SettingsUpgradePlans() {
  const { colors, dark } = useTheme();
  const { t } = useTranslation("common");
  const navigation = useNavigation<any>();
  const authCtx = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalResult, setModalResult] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { entitlements, refreshEntitlements } = useEntitlements();
  const currentPlanCode = `${(entitlements as any)?.subscriptionPlanCode || ""}`.toUpperCase();
  const hasActiveSubscription =
    !!(entitlements as any)?.isPremium && currentPlanCode !== "" && currentPlanCode !== "BASIC";

  const showAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMsg(message);
    setModalResult(true);
    setModalVisible(true);
  };

  const openExternalUrl = useCallback(
    async (targetUrl: string) => {
      try {
        await Linking.openURL(targetUrl);
      } catch (error) {
        showAlert(t("alerts.errorTitle"), t("upgrade.legalLinkError"));
      }
    },
    [t],
  );

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await apiGetPlans();
      if (resp && resp.ok && Array.isArray(resp.data)) {
        const parsedPlans = resp.data;
        console.log("plans parsed:", { count: parsedPlans.length });
        setPlans(parsedPlans);
      } else {
        setError(resp?.message || t("upgrade.failedToLoadPlans"));
      }
      // Try fetch RevenueCat offerings for localized prices
      try {
        const offerings = await RC.getOfferings();
        const current =
          offerings?.current ||
          offerings?.offerings?.find?.((o: any) => o.identifier === RC_DEFAULT_OFFERING_ID);
        const p = current?.availablePackages || current?.packages || [];
        if (!current) {
          console.warn("[RevenueCat] No current/default offering found", {
            expectedOfferingId: RC_DEFAULT_OFFERING_ID,
          });
        } else if (!Array.isArray(p) || p.length === 0) {
          console.warn("[RevenueCat] Offering loaded but has no purchasable packages", {
            offeringIdentifier: current?.identifier || RC_DEFAULT_OFFERING_ID,
          });
        }
        setPackages(Array.isArray(p) ? p : []);
      } catch {}
    } catch (e) {
      setError(t("upgrade.unexpectedError"));
    } finally {
      setLoading(false);
    }
  }, [authCtx.accessToken]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
        {value}
      </Text>
    </View>
  );

  const formatPrice = (v: number | string): string => {
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (!isFinite(n) || isNaN(n)) return String(v ?? "");
    if (n <= 0) return t("upgrade.free");
    return `$${n.toFixed(2)}`;
  };

  const formatBilling = (v: number | string, unit: string): string => {
    const p = formatPrice(v);
    return p === t("upgrade.free") ? p : `${p}/${unit}`;
  };

  const returnToUpgradeSummary = useCallback(() => {
    setModalVisible(false);
    setModalResult(false);
    if (typeof (navigation as any)?.canGoBack === "function" && (navigation as any).canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("SettingsUpgrade");
  }, [navigation]);

  const purchase = useCallback(
    async (pkg: any) => {
      try {
        setIsProcessing(true);
        setModalMsg(t("upgrade.processingPurchase"));
        setModalResult(false);
        setModalVisible(true);
        const { success, error, diagnostics } = await RC.purchasePackage(pkg);
        if (success) {
          try {
            await apiSyncRevenueCat();
          } catch {}
          await refreshEntitlements();
          returnToUpgradeSummary();
        } else if (error?.userCancelled) {
          setModalVisible(false);
        } else if (error) {
          const details = [
            error?.readableErrorCode || error?.code,
            diagnostics?.productIdentifier,
            diagnostics?.offeringIdentifier,
          ].filter(Boolean);
          const messageParts = [
            error?.message || t("upgrade.purchaseFailedGeneric"),
            details.length
              ? t("upgrade.purchaseDiagnostics", { details: details.join(" • ") })
              : null,
            error?.underlyingErrorMessage || null,
            diagnostics?.canMakePayments === false
              ? t("upgrade.purchasePaymentsUnavailable")
              : null,
          ].filter(Boolean);
          showAlert(t("upgrade.purchaseFailed"), messageParts.join("\n\n"));
        }
      } catch (e: any) {
        showAlert(t("upgrade.purchaseError"), String(e?.message || e));
      } finally {
        setIsProcessing(false);
      }
    },
    [refreshEntitlements, authCtx.accessToken, returnToUpgradeSummary, t],
  );

  const restore = useCallback(async () => {
    setModalMsg(t("upgrade.restoringPurchases"));
    setModalResult(false);
    setModalVisible(true);
    const { success, error } = await RC.restorePurchases();
    if (success) {
      try {
        await apiSyncRevenueCat();
      } catch {}
      await refreshEntitlements();
      showAlert(t("upgrade.restored"), t("upgrade.purchasesRestored"));
    } else if (error) {
      showAlert(t("upgrade.restoreFailed"), String(error?.message || error));
    }
  }, [refreshEntitlements, authCtx.accessToken, t]);

  // Helpers to extract info from RevenueCat package objects consistently
  const getProductId = useCallback((pkg: any): string | undefined => {
    const rawProductId =
      pkg?.product?.productIdentifier ||
      pkg?.product?.identifier ||
      pkg?.storeProduct?.productIdentifier ||
      pkg?.storeProduct?.identifier ||
      pkg?.storeProduct?.sku; // legacy

    if (!rawProductId) return undefined;

    // Google Play subscriptions may be exposed by RevenueCat as
    // "<subscription_id>:<base_plan_id>". The paywall logic in this screen
    // compares against canonical subscription ids, so normalize Android ids.
    return String(rawProductId).split(":")[0];
  }, []);

  const getPriceString = useCallback((pkg: any): string => {
    return pkg?.product?.priceString || pkg?.storeProduct?.priceString || "";
  }, []);

  // Build a map of productId -> package
  const packagesByProductId = useMemo(() => {
    const map: Record<string, any> = {};
    (packages || []).forEach((pkg) => {
      const pid = getProductId(pkg);
      if (pid) map[pid] = pkg;
    });
    return map;
  }, [packages, getProductId]);

  // Buttons for a specific package with custom human-friendly title
  const LabeledPackageButton = ({
    title,
    pkg,
    disabled,
    disabledLabel,
  }: {
    title: string;
    pkg: any | undefined;
    disabled?: boolean;
    disabledLabel?: string;
  }) => {
    if (!pkg) return null;
    const billing = getPriceString(pkg);
    const label = disabledLabel || (billing ? `${title} • ${billing}` : title);
    return (
      <TouchableOpacity
        style={[
          styles.buyBtn,
          disabled
            ? {
                backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              }
            : { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
        ]}
        disabled={isProcessing || disabled}
        onPress={() => {
          if (!disabled) purchase(pkg);
        }}
      >
        <Text
          style={{
            color: disabled ? (dark ? COLORS.white : COLORS.greyscale900) : COLORS.white,
            fontFamily: "semiBold",
            opacity: isProcessing || disabled ? 0.7 : 1,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("upgrade.choosePlan")} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={{ color: dark ? COLORS.white : COLORS.black }}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {plans.map((p) => (
              <View
                key={p.id}
                style={[
                  styles.card,
                  { backgroundColor: dark ? COLORS.dark2 : COLORS.white },
                  currentPlanCode === `${p.code || ""}`.toUpperCase()
                    ? styles.currentPlanCard
                    : null,
                ]}
              >
                <View style={styles.planHeaderRow}>
                  <Text
                    style={[styles.planTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
                  >
                    {p.name} {p.isDefault ? `(${t("upgrade.default")})` : ""}
                  </Text>
                  {currentPlanCode === `${p.code || ""}`.toUpperCase() ? (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>{t("upgrade.currentPlanBadge")}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.planCode, { color: COLORS.grayscale700 }]}>
                  {t("upgrade.code", { code: p.code })}{" "}
                  {p.isPremium ? `• ${t("upgrade.premium")}` : ""}
                </Text>
                {currentPlanCode === `${p.code || ""}`.toUpperCase() ? (
                  <Text
                    style={[
                      styles.currentPlanDescription,
                      { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 },
                    ]}
                  >
                    {t("upgrade.currentPlanDescription")}
                  </Text>
                ) : null}
                <Row
                  label={t("upgrade.monthly")}
                  value={formatBilling(p.monthlyPrice, t("upgrade.monthUnit"))}
                />
                <Row
                  label={t("upgrade.yearly")}
                  value={formatBilling(p.yearlyPrice, t("upgrade.yearUnit"))}
                />
                <View style={styles.divider} />
                <Row
                  label={t("upgrade.passwords")}
                  value={
                    p.passwordLimit == null || p.passwordLimit < 0
                      ? t("upgrade.unlimited")
                      : String(p.passwordLimit)
                  }
                />
                <Row
                  label={t("upgrade.cards")}
                  value={
                    p.cardLimit == null || p.cardLimit < 0
                      ? t("upgrade.unlimited")
                      : String(p.cardLimit)
                  }
                />
                <Row
                  label={t("upgrade.shares")}
                  value={
                    p.shareLimit == null || p.shareLimit < 0
                      ? t("upgrade.unlimited")
                      : String(p.shareLimit)
                  }
                />
                <View style={styles.divider} />
                <Row
                  label={t("upgrade.cloudSync")}
                  value={p.cloudSync ? t("upgrade.included") : t("upgrade.notIncluded")}
                />
                <Row
                  label={t("upgrade.secureNotes")}
                  value={p.secureNotes ? t("upgrade.included") : t("upgrade.notIncluded")}
                />
                <Row
                  label={t("upgrade.watchtower")}
                  value={p.watchtower ? t("upgrade.included") : t("upgrade.notIncluded")}
                />
                <Row
                  label={t("upgrade.itemHistory")}
                  value={p.itemHistory ? t("upgrade.included") : t("upgrade.notIncluded")}
                />
                <Row
                  label={t("upgrade.export")}
                  value={p.exportEnabled ? t("upgrade.included") : t("upgrade.notIncluded")}
                />
                <Row
                  label={t("upgrade.prioritySupport")}
                  value={p.prioritySupport ? t("upgrade.included") : t("upgrade.notIncluded")}
                />
                <Row
                  label={t("upgrade.familySharing")}
                  value={p.familySharing ? t("upgrade.included") : t("upgrade.notIncluded")}
                />
                <Row label={t("upgrade.maxFamilyMembers")} value={String(p.maxFamilyMembers)} />

                {/* Purchase buttons per plan */}
                {(() => {
                  const codeUpper = `${p.code || p.name || ""}`.toUpperCase();
                  const isPro = codeUpper.includes("PRO");
                  const isFamily = codeUpper.includes("FAMILY");
                  const isBasic = !isPro && !isFamily; // Basic: no purchase buttons
                  const isCurrentPlan = currentPlanCode === codeUpper;

                  if (isBasic) return null;

                  if (isCurrentPlan) {
                    return (
                      <View style={styles.currentPlanCta}>
                        <Text style={styles.currentPlanCtaText}>
                          {t("upgrade.currentPlanButtonLabel")}
                        </Text>
                      </View>
                    );
                  }

                  if (hasActiveSubscription) {
                    return (
                      <Text
                        style={[
                          styles.subscriptionManagedText,
                          { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 },
                        ]}
                      >
                        {t("upgrade.subscriptionManagedInStore")}
                      </Text>
                    );
                  }

                  const proMonthly = packagesByProductId[RC_PRODUCT_IDS.PRO_MONTHLY];
                  const proYearly = packagesByProductId[RC_PRODUCT_IDS.PRO_YEARLY];
                  const familyMonthly = packagesByProductId[RC_PRODUCT_IDS.FAMILY_MONTHLY];
                  const familyYearly = packagesByProductId[RC_PRODUCT_IDS.FAMILY_YEARLY];

                  return (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      {isPro ? (
                        <>
                          <LabeledPackageButton title={t("upgrade.proMonthly")} pkg={proMonthly} />
                          <LabeledPackageButton title={t("upgrade.proYearly")} pkg={proYearly} />
                        </>
                      ) : null}
                      {isFamily ? (
                        <>
                          <LabeledPackageButton
                            title={t("upgrade.familyMonthly")}
                            pkg={familyMonthly}
                          />
                          <LabeledPackageButton
                            title={t("upgrade.familyYearly")}
                            pkg={familyYearly}
                          />
                        </>
                      ) : null}
                    </View>
                  );
                })()}
              </View>
            ))}

            {/* Restore purchases */}
            <TouchableOpacity style={styles.restoreBtn} onPress={restore}>
              <Text
                style={{
                  color: dark ? COLORS.white : COLORS.black,
                  fontFamily: "semiBold",
                }}
              >
                {t("upgrade.restorePurchases")}
              </Text>
            </TouchableOpacity>

            {packages.length === 0 ? (
              <Text
                style={[
                  styles.productsUnavailableText,
                  { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 },
                ]}
              >
                {t("upgrade.productsUnavailable")}
              </Text>
            ) : null}

            {/* Manage subscription */}
            <TouchableOpacity style={styles.manageBtn} onPress={() => RC.openManageSubscriptions()}>
              <Text
                style={{
                  color: dark ? COLORS.white : COLORS.black,
                  fontFamily: "semiBold",
                }}
              >
                {t("upgrade.manageSubscription")}
              </Text>
            </TouchableOpacity>

            <View
              style={[styles.legalCard, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}
            >
              <Text
                style={[styles.legalTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}
              >
                {t("upgrade.legalTitle")}
              </Text>
              <Text
                style={[
                  styles.legalDescription,
                  { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 },
                ]}
              >
                {t("upgrade.legalDescription")}
              </Text>
              <View style={styles.legalActions}>
                <TouchableOpacity
                  style={styles.legalLink}
                  onPress={() => navigation.navigate("SubscriptionPrivacyPolicy")}
                >
                  <Text style={styles.legalLinkText}>{t("upgrade.privacyPolicy")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.legalLink}
                  onPress={() => openExternalUrl(APPLE_STANDARD_EULA_URL)}
                >
                  <Text style={styles.legalLinkText}>{t("upgrade.termsOfUse")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
      <LoadingModal
        visible={modalVisible}
        message={modalMsg}
        titleKey={modalTitle}
        showSpinner={!modalResult}
        resultMode={modalResult}
        showActionButton={modalResult}
        onAction={() => {
          setModalVisible(false);
          setModalResult(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, padding: 16, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    marginBottom: 16,
  },
  currentPlanCard: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  planTitle: { fontSize: 18, fontFamily: "bold" },
  planCode: { fontSize: 13, fontFamily: "regular", marginTop: 4 },
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
  currentPlanDescription: {
    fontSize: 13,
    fontFamily: "regular",
    lineHeight: 20,
    marginTop: 8,
  },
  currentPlanCta: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.tansparentPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.primary,
  },
  currentPlanCtaText: {
    color: COLORS.primary,
    fontFamily: "semiBold",
    fontSize: 14,
  },
  subscriptionManagedText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: "regular",
    lineHeight: 20,
  },
  divider: { height: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { fontSize: 14, fontFamily: "regular" },
  rowValue: { fontSize: 14, fontFamily: "semiBold" },
  buyBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  restoreBtn: {
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  manageBtn: {
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  productsUnavailableText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "regular",
    lineHeight: 20,
  },
  legalCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    marginTop: 8,
  },
  legalTitle: {
    fontSize: 16,
    fontFamily: "semiBold",
  },
  legalDescription: {
    fontSize: 13,
    fontFamily: "regular",
    lineHeight: 20,
    marginTop: 8,
  },
  legalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    flexWrap: "wrap",
  },
  legalLink: {
    paddingVertical: 8,
  },
  legalLinkText: {
    fontSize: 14,
    fontFamily: "semiBold",
    color: COLORS.primary,
  },
});
