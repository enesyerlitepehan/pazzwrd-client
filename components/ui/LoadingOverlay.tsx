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
} from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { CONFIG } from "../../utils/config";
import Button from "../Button";

const logo = require("../../assets/images/loading/pazzwrd-loading-screen.png");

export type LoadingProps = {
  visible: boolean; // show/hide overlay
  message?: string; // raw message text (takes priority over messageKey)
  messageKey?: string; // i18n key, e.g. 'loading.unlockVault'
  messageParams?: Record<string, any>; // interpolation params
  showSpinner?: boolean; // default true
  onClose?: () => void; // called when timeout close button pressed
};

const ANIM_DURATION = 320;

// Subtle theme-aware background with gradient
const ThemedBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { dark } = useTheme();

  const gradientColors = useMemo<readonly [string, string]>(
    () => (dark ? ["#0B0B0F", "#101014"] : ["#F9F9FB", "#F1F3F9"]),
    [dark],
  );

  return (
    <View style={styles.bgBase}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
};

// Subtle premium decor: low-opacity blobs + very light vignette
const BackgroundDecor: React.FC = () => {
  const { dark } = useTheme();

  const blob1 = dark ? "rgba(108,77,218,0.10)" : "rgba(16,16,16,0.06)";
  const blob2 = dark ? "rgba(36,107,253,0.10)" : "rgba(108,77,218,0.08)";
  const vignetteMid = dark ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)";

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Blobs */}
      <View
        style={[
          styles.blob,
          {
            width: 260,
            height: 260,
            top: -60,
            left: -40,
            backgroundColor: blob1,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: 220,
            height: 220,
            bottom: -40,
            right: -20,
            backgroundColor: blob2,
          },
        ]}
      />

      {/* Vignette approximation (horizontal + vertical) */}
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

const LoadingOverlay: React.FC<LoadingProps> = ({
  visible,
  messageKey,
  messageParams,
  showSpinner = true,
  onClose,
}) => {
  const { t } = useTranslation("common");
  const { dark, colors } = useTheme();

  const [shouldRender, setShouldRender] = useState(visible);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(visible ? 1 : 0.98)).current;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (visible) {
      setIsTimedOut(false);
      timer = setTimeout(() => {
        setIsTimedOut(true);
      }, CONFIG.loadingTimeout * 1000);
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(opacity, {
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
        Animated.timing(opacity, {
          toValue: 0,
          duration: ANIM_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.98,
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
    return String(t(messageKey || "loading.default", messageParams));
  }, [t, messageKey, messageParams, isTimedOut]);

  if (!shouldRender) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedBackground>
        <BackgroundDecor />
        <Animated.View
          style={[
            styles.content,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Image
            source={logo}
            resizeMode="contain"
            style={styles.logo}
            accessible
            accessibilityLabel={t("accessibility.loadingLogo") || "App Logo"}
          />
          {isTimedOut && (
            <Text style={[styles.errorTitle, { color: dark ? "#fff" : "#000" }]}>
              {String(t("alerts.errorTitle") || "Error")}
            </Text>
          )}
          <Text
            style={[
              styles.subtitle,
              { color: dark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.88)" },
            ]}
            accessibilityRole="text"
          >
            {subtitle}
          </Text>
          {showSpinner && !isTimedOut && (
            <ActivityIndicator
              style={styles.spinner}
              size={Platform.OS === "ios" ? "small" : "small"}
              color={dark ? "#FFFFFF" : "#000000"}
            />
          )}
          {isTimedOut && (
            <Button
              title={String(t("common.close") || "Close")}
              onPress={() => (onClose ? onClose() : setShouldRender(false))}
              filled
              color={dark ? "#246BFD" : undefined}
              style={styles.closeButton}
            />
          )}
        </Animated.View>
      </ThemedBackground>
    </View>
  );
};

export default LoadingOverlay;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 160,
    height: 160,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "semiBold",
    textAlign: "center",
    marginTop: 16,
  },
  closeButton: {
    width: "100%",
    height: 48,
    borderRadius: 16,
    marginTop: 24,
  },
  spinner: {
    marginTop: 16,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    filter: Platform.select({ web: "blur(20px)", default: undefined }) as any,
  },
  vignetteVertical: {
    ...StyleSheet.absoluteFillObject,
  },
  vignetteHorizontal: {
    ...StyleSheet.absoluteFillObject,
  },
});
