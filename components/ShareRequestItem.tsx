import React, { useContext, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet } from "react-native";

import { apiPostReceivedShareCheck } from "../api/api";
import { COLORS } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";

import Button from "./Button";
import { useToast } from "./ToastProvider";

type Props = {
  shareId: number | string;
  ownerDisplay?: string | null;
  onResolved?: (shareId: number | string, accepted: boolean) => void;
};

const ShareRequestItem: React.FC<Props> = ({ shareId, ownerDisplay, onResolved }) => {
  const { dark } = useTheme();
  const authCtx = useContext(AuthContext);
  const [loading, setLoading] = useState<null | "accept" | "decline">(null);
  const { t } = useTranslation("common");
  const toast = useToast();

  const title = useMemo(() => {
    const who = ownerDisplay || t("notifications.someone");
    return t("notifications.shareRequest", { who });
  }, [ownerDisplay, t]);

  async function decide(accept: boolean) {
    if (loading) return;
    try {
      setLoading(accept ? "accept" : "decline");
      const resp = await apiPostReceivedShareCheck({ shareId, accept });
      const status = resp?.status;
      if (resp.ok && status === 200) {
        // Show localized toast
        const toastMsg = accept
          ? t("notifications.shareAccepted")
          : t("notifications.shareDeclined");
        toast.show(String(toastMsg));
        onResolved?.(shareId, accept);
      } else {
        const errMsg = t("notifications.shareDecisionFailed");
        toast.show(String(errMsg));
        console.warn("Share decision failed:", status, resp?.code || "ERROR", resp?.message);
      }
    } catch (e: any) {
      const errMsg = t("notifications.shareDecisionFailed");
      toast.show(String(errMsg));
      console.error("Share decision error:", e?.message || e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: dark ? COLORS.dark2 : "#F5F5F5",
          borderColor: dark ? COLORS.dark3 : "#E6E6E6",
        },
      ]}
    >
      <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
        {title}
      </Text>
      <View style={styles.actions}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Button
            title={t("common.decline")}
            onPress={() => decide(false)}
            filled={false}
            isLoading={loading === "decline"}
            color={COLORS.primary}
            textColor={dark ? COLORS.white : COLORS.primary}
            style={{ height: 44 }}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Button
            title={t("common.accept")}
            onPress={() => decide(true)}
            filled
            isLoading={loading === "accept"}
            color={COLORS.primary}
            style={{ height: 44 }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: "semiBold",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ShareRequestItem;
