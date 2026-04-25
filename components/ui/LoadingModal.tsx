import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
} from "react-native";

import { COLORS, SIZES } from "../../constants";
import { useTheme } from "../../theme/ThemeProvider";
import { CONFIG } from "../../utils/config";
import Button from "../Button";

import type { LoadingProps } from "./LoadingOverlay";

const logo = require("../../assets/images/loading/pazzwrd-loading-screen.png");

const ANIM_DURATION = 320;

// Background for the panel (theme-aware gradient + subtle decor)
const PanelBackground: React.FC = () => {
  const { dark } = useTheme();

  const gradientColors = useMemo(
    () =>
      (dark ? ["#0B0B0F", "#101014"] : ["#F9F9FB", "#F1F3F9"]) as unknown as readonly [
        string,
        string,
        ...string[],
      ],
    [dark],
  );

  const blob1 = dark ? "rgba(108,77,218,0.10)" : "rgba(16,16,16,0.06)";
  const blob2 = dark ? "rgba(36,107,253,0.10)" : "rgba(108,77,218,0.08)";
  const vignetteMid = dark ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle blobs */}
      <View
        style={[
          styles.blob,
          {
            width: 160,
            height: 160,
            top: -30,
            left: -20,
            backgroundColor: blob1,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: 140,
            height: 140,
            bottom: -20,
            right: -10,
            backgroundColor: blob2,
          },
        ]}
      />

      {/* Very light vignette */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", vignetteMid, "rgba(0,0,0,0)"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.vignetteVertical}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0)", vignetteMid, "rgba(0,0,0,0)"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.vignetteHorizontal}
      />
    </View>
  );
};

type LoadingModalProps = LoadingProps & {
  // When true, modal shows result content (no spinner) instead of plain loading
  resultMode?: boolean;
  // When true, modal shows confirmation buttons
  confirmMode?: boolean;
  // Operation context to render brief info (create/update/delete)
  opKind?: "create" | "update" | "delete";
  // Item type context for translations (default "password")
  itemType?: "password" | "card";
  // Password score (0..100) to display in result mode
  score?: number | null;
  // Optional action button (default false to keep existing behavior)
  showActionButton?: boolean;
  actionLabel?: string; // direct label text (fallback if no i18n key is passed)
  onAction?: () => void; // called when action button pressed (or confirmed)
  onCancel?: () => void; // called when cancel button pressed
  cancelLabel?: string;
  confirmLabel?: string;
  titleKey?: string;
};

const LoadingModal: React.FC<LoadingModalProps> = ({
  visible,
  message,
  messageKey,
  messageParams,
  showSpinner = true,
  resultMode = false,
  confirmMode = false,
  opKind,
  itemType = "password",
  score = null,
  showActionButton = false,
  actionLabel,
  onAction,
  onCancel,
  cancelLabel,
  confirmLabel,
  titleKey,
}) => {
  const { t } = useTranslation("common");
  const { dark } = useTheme();

  const [shouldRender, setShouldRender] = useState(visible);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const scrimOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const panelOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(visible ? 1 : 0.96)).current;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (visible) {
      setIsTimedOut(false);
      timer = setTimeout(() => {
        setIsTimedOut(true);
      }, CONFIG.loadingTimeout * 1000);
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: ANIM_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 0,
          duration: ANIM_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.96,
          duration: ANIM_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setShouldRender(false);
      });
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible]);

  const subtitle = useMemo(() => {
    if (isTimedOut) return String(t("loading.timeout") || "Request timed out. Please try again.");
    if (message) return message;
    return String(t(messageKey || "loading.default", messageParams));
  }, [t, message, messageKey, messageParams, isTimedOut]);

  const opTitle = useMemo(() => {
    if (isTimedOut) return String(t("alerts.errorTitle") || "Error");
    if (titleKey) return String(t(titleKey));
    if (!opKind) return "";
    // Use existing alert copy for brevity (both create/update lead to saved state)
    try {
      if (itemType === "card") {
        if (opKind === "delete") return String(t("common.delete")) + " " + String(t("items.card"));
        return String(t("alerts.cardSaved"));
      }
      if (opKind === "delete")
        return String(t("common.delete")) + " " + String(t("items.password"));
      return String(t("alerts.passwordSaved"));
    } catch {
      if (itemType === "card") {
        if (opKind === "delete") return "Delete Card";
        return opKind === "create" ? "Card created" : "Card updated";
      }
      if (opKind === "delete") return "Delete Password";
      return opKind === "create" ? "Password created" : "Password updated";
    }
  }, [opKind, itemType, t, titleKey]);

  const strengthLabel = useMemo(() => {
    try {
      return String(t("home.passwordStrength"));
    } catch {
      return "Password Strength";
    }
  }, [t]);

  // Avoid duplicate messages: when in result mode and we already show a result title
  // (e.g., "Password saved successfully"), don't render the subtitle if it is the
  // same message or if an operation kind is provided.
  const shouldShowSubtitle = useMemo(() => {
    if (isTimedOut) return true;
    if (confirmMode) return true;
    if (!resultMode) return true;

    // If we have an explicit titleKey, we want to show both title and subtitle if they differ.
    // This is typically the case for validation errors or specific alerts.
    if (titleKey) {
      return subtitle.trim() !== opTitle.trim();
    }

    // If no titleKey but opKind is set, we show opTitle (e.g. "Password saved")
    // and hide subtitle to prevent duplicated text (since subtitle often has the same msg).
    if (opKind) return false;

    // Fallback: show subtitle if it's different from the title.
    return subtitle.trim() !== opTitle.trim();
  }, [resultMode, opKind, subtitle, opTitle, confirmMode, titleKey, isTimedOut]);

  if (!shouldRender) return null;

  return (
    <Modal transparent visible={shouldRender} animationType="none" onRequestClose={() => {}}>
      <View style={styles.container} pointerEvents="auto">
        {/* Backdrop scrim that blocks touches */}
        <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} pointerEvents="auto" />

        {/* Centered modal panel */}
        <Animated.View
          style={[
            styles.panel,
            {
              opacity: panelOpacity,
              transform: [{ scale }],
            },
          ]}
          pointerEvents="auto"
          accessible
          accessibilityRole="alert"
        >
          <PanelBackground />
          <ScrollView
            style={styles.panelScroll}
            contentContainerStyle={styles.panelContent}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={logo}
              resizeMode="contain"
              style={styles.logoSmall}
              accessible
              accessibilityLabel={t("accessibility.loadingLogo") || "Loading logo"}
            />

            {/* Loading vs Result vs Confirm content */}
            {!resultMode && !confirmMode && !isTimedOut ? (
              <>
                {shouldShowSubtitle ? (
                  <Text
                    style={[
                      styles.subtitle,
                      {
                        color: dark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.88)",
                      },
                    ]}
                    accessibilityRole="text"
                  >
                    {subtitle}
                  </Text>
                ) : null}
                {showSpinner ? (
                  <ActivityIndicator
                    style={styles.spinner}
                    size={Platform.OS === "ios" ? "small" : "small"}
                    color={dark ? "#FFFFFF" : "#000000"}
                  />
                ) : null}
              </>
            ) : (
              <View style={styles.resultWrap}>
                {opKind || titleKey || isTimedOut ? (
                  <Text style={[styles.resultTitle, { color: dark ? "#fff" : "#000" }]}>
                    {opTitle}
                  </Text>
                ) : null}

                {shouldShowSubtitle ? (
                  <Text
                    style={[
                      styles.subtitle,
                      {
                        color: dark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.88)",
                      },
                    ]}
                    accessibilityRole="text"
                  >
                    {subtitle}
                  </Text>
                ) : null}

                {typeof score === "number" && !confirmMode ? (
                  <View style={styles.scoreWrap}>
                    <Text
                      style={[
                        styles.scoreLabel,
                        {
                          color: dark ? "rgba(255,255,255,0.74)" : "rgba(0,0,0,0.74)",
                        },
                      ]}
                    >
                      {strengthLabel}
                    </Text>
                    <Text style={[styles.scoreValue, { color: dark ? "#fff" : "#000" }]}>
                      {score}/100
                    </Text>
                  </View>
                ) : null}

                {isTimedOut ? (
                  <View style={styles.actionWrap}>
                    <Button
                      title={String(t("common.close") || "Close")}
                      onPress={() => (onCancel ? onCancel() : setShouldRender(false))}
                      filled
                      color={dark ? "#246BFD" : undefined}
                      style={styles.fullWidthButton}
                    />
                  </View>
                ) : confirmMode ? (
                  <View style={styles.actionWrap}>
                    <View style={styles.confirmButtonsRow}>
                      <Button
                        title={cancelLabel || String(t("common.cancel"))}
                        onPress={() => onCancel?.()}
                        style={[
                          styles.confirmButton,
                          {
                            backgroundColor: dark ? COLORS.dark3 : COLORS.tertiaryWhite,
                            borderColor: dark ? COLORS.dark3 : COLORS.tertiaryWhite,
                          },
                        ]}
                        textColor={dark ? COLORS.white : COLORS.greyscale900}
                      />
                      <Button
                        title={confirmLabel || String(t("common.delete"))}
                        onPress={() => onAction?.()}
                        filled
                        color={COLORS.primary}
                        style={styles.confirmButton}
                      />
                    </View>
                  </View>
                ) : showActionButton ? (
                  <View style={styles.actionWrap}>
                    <Button
                      title={actionLabel || String(t("common.ok", { defaultValue: "OK" }))}
                      onPress={() => onAction?.()}
                      filled
                      color={dark ? "#246BFD" : undefined}
                      style={styles.fullWidthButton}
                    />
                  </View>
                ) : null}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default LoadingModal;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    alignItems: "center",
    justifyContent: "center",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.46)", // 46% opacity scrim
  },
  panel: {
    width: "86%", // ~80–88%
    height: "46%", // ~40–50%
    maxWidth: 600,
    maxHeight: 560,
    borderRadius: 24,
    overflow: "hidden",

    // Shadow/elevation
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  panelContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  panelScroll: {
    flex: 1,
  },
  logoSmall: {
    width: 120,
    height: 120,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },
  spinner: {
    marginTop: 16,
  },
  resultWrap: {
    width: "100%",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: "semiBold",
    textAlign: "center",
    marginBottom: 6,
  },
  scoreWrap: {
    alignItems: "center",
    marginTop: 4,
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontFamily: "bold",
  },
  actionWrap: {
    width: "100%",
    marginTop: 18,
  },
  confirmButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  confirmButton: {
    width: "48%",
    height: 48,
    borderRadius: 16,
  },
  fullWidthButton: {
    width: "100%",
    height: 48,
    borderRadius: 16,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    filter: Platform.select({ web: "blur(18px)", default: undefined }) as any,
  },
  vignetteVertical: {
    ...StyleSheet.absoluteFillObject,
  },
  vignetteHorizontal: {
    ...StyleSheet.absoluteFillObject,
  },
});
