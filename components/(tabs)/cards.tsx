import { useQueryClient } from "@tanstack/react-query";
import { BottomTabNavProp, BottomTabRouteProp } from "../../navigation/types";
import { useNavigation, useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useContext, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabBar, TabView } from "react-native-tab-view";

import { COLORS, images } from "../../constants";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { useCardsQuery } from "../../hooks/useCardsQuery";
import { AuthContext } from "../../store/auth-context";
import { CardTab } from "../../tabs";
import { useTheme } from "../../theme/ThemeProvider";
import { shouldAutoDelete } from "../../utils/trashUtils";
import Header from "../Header";
import LoadingModal from "../ui/LoadingModal";

const Cards = () => {
  const navigation = useNavigation<BottomTabNavProp<"Card">>();
  const layout = useWindowDimensions();
  const { dark, colors } = useTheme();
  const authCtx = useContext(AuthContext);
  const isFocused = useIsFocused();
  const route = useRoute<BottomTabRouteProp<"Card">>();

  const { t, i18n } = useTranslation("common");
  const queryClient = useQueryClient();

  const [index, setIndex] = React.useState(0);

  const { data: cloudData, isLoading: cloudLoading } = useCardsQuery("cloud", isFocused);
  const { data: localData, isLoading: localLoading } = useCardsQuery("local", isFocused);
  const { data: trashData, isLoading: trashLoading } = useCardsQuery("trash", isFocused);

  const loadingVisible = cloudLoading || localLoading || trashLoading;

  // Allow other screens to preselect the inner tab (e.g., initialTab: "cloud" | "local" | "trash")
  useEffect(() => {
    try {
      const params = route?.params;
      if (params) {
        if (params.initialTab === "cloud" || params.initialIndex === 0) {
          setIndex(0);
        } else if (params.initialTab === "local" || params.initialIndex === 1) {
          setIndex(1);
        } else if (params.initialTab === "trash" || params.initialIndex === 2) {
          setIndex(2);
        }
      }
    } catch (e) {
      // silent fail
    }
  }, [route?.params]);
  const routes = React.useMemo(
    () => [
      { key: "first", title: t("cards.tabs.cloud") },
      { key: "second", title: t("cards.tabs.local") },
      { key: "third", title: t("cards.tabs.trash") },
    ],
    [t, i18n.language],
  );

  // Handle auto purge for trash
  useEffect(() => {
    if (trashData && isFocused) {
      const expired = trashData.filter((it: any) => shouldAutoDelete(it?.deletedAt));
      if (expired.length > 0) {
        (async () => {
          try {
            await Promise.all(expired.map((it: any) => authCtx.removeCard(it.id, false, true)));
            queryClient.invalidateQueries({
              queryKey: [authCtx.userId, QUERY_KEYS.CARDS.ROOT, "trash"],
            });
          } catch (e) {
            console.warn("Error purging expired trash cards", e);
          }
        })();
      }
    }
  }, [trashData, isFocused, authCtx, queryClient]);

  // No-op for manual delete because React Query will re-fetch or invalidate
  const handleDeleteItem = useCallback((id: string | number, routeKey: string) => {
    // We let the mutation handle the cache invalidation
  }, []);

  // Create a wrapper renderScene function that passes the appropriate data
  const renderScene = ({ route }: { route: { key: string } }) => {
    // Only render the component if it's the active tab
    const currentRoute = routes[index];
    if (!currentRoute || route.key !== currentRoute.key) return null;

    // Get the appropriate data based on the tab
    let data;
    switch (route.key) {
      case "first":
        data = cloudData;
        break;
      case "second":
        data = localData;
        break;
      case "third":
        data = trashData;
        break;
      default:
        data = null;
    }

    // Pass the data to the CardTab component
    return (
      <CardTab
        data={data as any}
        hideCreateCta={route.key === "third"}
        onDelete={(id) => handleDeleteItem(id, route.key)}
        source={route.key === "first" ? "cloud" : route.key === "second" ? "local" : "trash"}
      />
    );
  };

  interface TabRoute {
    key: string;
    title: string;
  }

  interface RenderLabelProps {
    route: TabRoute;
    focused: boolean;
  }

  const renderTabBar = (props: any) => (
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
      renderLabel={({ route, focused }: RenderLabelProps) => (
        <Text
          style={{
            color: focused ? (dark ? COLORS.white : COLORS.primary) : "gray",
            fontSize: 16,
            fontFamily: "semiBold",
          }}
        >
          {route.title}
        </Text>
      )}
    />
  );

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title={t("cards.title")}
          showBack={false}
          showLogo={true}
          logoSource={dark ? images.lightLogo : images.darkLogo}
        />
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
        />
      </View>
      {/* Loading overlay shown while waiting endpoint responses (parity with passwords screen) */}
      <LoadingModal visible={loadingVisible} />
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
  },
});

export default Cards;
