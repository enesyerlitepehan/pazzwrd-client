import { useRoute, useFocusEffect, useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabBar, TabView } from "react-native-tab-view";

import { COLORS, images } from "../../constants";
import { BottomTabNavProp, BottomTabRouteProp } from "../../navigation/types";
import { NewCardTab, NewPasswordTab } from "../../tabs";
import { useTheme } from "../../theme/ThemeProvider";
import Header from "../Header";

interface TabRoute {
  key: string;
  title: string;
}

const New: React.FC = () => {
  const layout = useWindowDimensions();
  const { dark, colors } = useTheme();
  const { t, i18n } = useTranslation("common");
  const navigation = useNavigation<BottomTabNavProp<"Cart">>();

  const route = useRoute<BottomTabRouteProp<"Cart">>();
  const [index, setIndex] = React.useState(() => {
    const params = route.params;
    if (params?.initialTab === "cards" || params?.initialIndex === 1) return 1;
    return 0;
  });
  const [capturedSyncType, setCapturedSyncType] = useState<"cloud" | "local" | undefined>(
    () => route.params?.initialSyncType,
  );
  const [resetKey, setResetKey] = useState(0);

  const renderScene = ({ route: tabRoute }: { route: TabRoute }) => {
    switch (tabRoute.key) {
      case "first":
        return <NewPasswordTab initialSyncType={capturedSyncType} />;
      case "second":
        return <NewCardTab initialSyncType={capturedSyncType} />;
      default:
        return null;
    }
  };

  // Consume and clear initialSyncType once
  useEffect(() => {
    if (route.params?.initialSyncType) {
      setCapturedSyncType(route.params.initialSyncType);
      navigation.setParams({ initialSyncType: undefined });
    }
  }, [route.params?.initialSyncType, navigation]);

  // Sync index if params change later
  useEffect(() => {
    const params = route.params;
    if (params?.initialTab === "cards" || params?.initialIndex === 1) {
      setIndex(1);
    } else if (params?.initialTab === "passwords" || params?.initialIndex === 0) {
      setIndex(0);
    }
  }, [route.params?.initialTab, route.params?.initialIndex]);

  // Default inactivity timeout in minutes (changeable)
  const ttlMinutes = 20;
  const ttlMs = ttlMinutes * 60 * 1000;
  const LAST_BLUR_KEY = "new_screen_last_blur";

  useFocusEffect(
    React.useCallback(() => {
      const isActive = true;
      const checkExpiry = async () => {
        try {
          const lastBlurStr = await SecureStore.getItemAsync(LAST_BLUR_KEY);
          const lastBlur = lastBlurStr ? parseInt(lastBlurStr, 10) : NaN;
          const now = Date.now();
          if (!isNaN(lastBlur) && now - lastBlur > ttlMs) {
            if (isActive) {
              // Force remount the TabView and reset to first tab (scroll to top)
              setResetKey((k) => k + 1);
              setIndex(0);
            }
          }
        } catch (e) {
          // silent fail
        }
      };
      checkExpiry();

      // On blur/unfocus, store the timestamp and clear one-time sync target
      return () => {
        SecureStore.setItemAsync(LAST_BLUR_KEY, String(Date.now())).catch(() => {});
        setCapturedSyncType(undefined);
      };
    }, [ttlMs]),
  );

  const routes = React.useMemo(
    () => [
      { key: "first", title: t("tabs.new.passwordTab") },
      { key: "second", title: t("tabs.new.cardsTab") },
    ],
    [t, i18n.language],
  );

  const renderTabBar = (props: React.ComponentProps<typeof TabBar<TabRoute>>) => (
    <TabBar
      {...props}
      indicatorStyle={{
        backgroundColor: dark ? COLORS.white : COLORS.primary,
      }}
      style={{
        backgroundColor: colors.background,
      }}
      activeColor={dark ? COLORS.white : COLORS.primary}
      inactiveColor={dark ? COLORS.white : COLORS.greyscale900}
    />
  );

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title={t("tabs.new.title")}
          showBack={false}
          showLogo={true}
          logoSource={dark ? images.lightLogo : images.darkLogo}
        />
        <TabView
          key={resetKey}
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 16,
  },
});

export default New;
