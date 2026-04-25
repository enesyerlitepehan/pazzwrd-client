import { useQueryClient } from "@tanstack/react-query";
import { useRoute, useNavigation, useIsFocused } from "@react-navigation/native";
import { BottomTabNavProp, BottomTabRouteProp } from "../../navigation/types";
import React, { useEffect, useContext, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TabBar, TabView } from "react-native-tab-view";

import { COLORS, images } from "../../constants";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { usePasswordsQuery } from "../../hooks/usePasswordsQuery";
import { useReceivedSharesQuery } from "../../hooks/useReceivedSharesQuery";
import { AuthContext } from "../../store/auth-context";
import { PasswordTab } from "../../tabs";
import { useTheme } from "../../theme/ThemeProvider";
import { shouldAutoDelete } from "../../utils/trashUtils";
import { sortItemsNewestFirst } from "../../utils/util";
import { Password } from "../../utils/types/passwordTypes";
import Header from "../Header";
import LoadingModal from "../ui/LoadingModal";

interface TabRoute {
  key: string;
  title: string;
}

interface RenderLabelProps {
  route: TabRoute;
  focused: boolean;
}

const Passwords = () => {
  const navigation = useNavigation<BottomTabNavProp<"Password">>();
  const layout = useWindowDimensions();
  const { dark, colors } = useTheme();
  const authCtx = useContext(AuthContext);
  const isFocused = useIsFocused();
  const route = useRoute<BottomTabRouteProp<"Password">>();

  const { t, i18n } = useTranslation("common");
  const [index, setIndex] = React.useState(0);
  const queryClient = useQueryClient();

  const { data: rawCloudData, isLoading: cloudLoading } = usePasswordsQuery("cloud", isFocused);
  const { data: localData, isLoading: localLoading } = usePasswordsQuery("local", isFocused);
  const { data: trashData, isLoading: trashLoading } = usePasswordsQuery("trash", isFocused);
  const { data: shares, isLoading: sharesLoading } = useReceivedSharesQuery(isFocused);

  const cloudData = React.useMemo(() => {
    if (!rawCloudData) return null;
    if (!shares) return rawCloudData;

    const sharedAsCloudItems = shares.map((sh: any) => {
      const mp = (sh?.item?.metadata_public || {}) as Record<string, any>;
      const metadataPublic = {
        ...mp,
        createdAt: mp.createdAt ?? sh?.createdAt ?? mp.created_at,
        updatedAt: mp.updatedAt ?? sh?.createdAt ?? mp.updated_at,
      } as Record<string, any>;
      return {
        id: sh?.shareId,
        itemId: sh?.itemId,
        version: sh?.item?.version,
        metadataPublic,
        isShared: true,
        ownerId: sh?.ownerId,
        ownerDisplay: sh?.ownerDisplay,
        createdAt: sh?.createdAt,
        sync: true,
        shareId: sh?.shareId,
        itemType: sh?.itemType,
      } as any;
    });

    return sortItemsNewestFirst([...rawCloudData, ...sharedAsCloudItems]);
  }, [rawCloudData, shares]);

  const loadingVisible = cloudLoading || localLoading || trashLoading || sharesLoading;

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
      { key: "first", title: t("passwords.tabs.cloud") },
      { key: "second", title: t("passwords.tabs.local") },
      { key: "third", title: t("passwords.tabs.trash") },
    ],
    [t, i18n.language],
  );

  // Handle auto-purge for trash
  useEffect(() => {
    if (trashData && isFocused) {
      const expired = trashData.filter((it: any) => shouldAutoDelete(it?.deletedAt));
      if (expired.length > 0) {
        (async () => {
          try {
            await Promise.all(expired.map((it: any) => authCtx.removePassword(it.id, false, true)));
            // After purge, invalidate trash query to refresh
            queryClient.invalidateQueries({
              queryKey: [authCtx.userId, QUERY_KEYS.PASSWORDS.ROOT, "trash"],
            });
          } catch (e) {
            console.warn("Error purging expired trash passwords", e);
          }
        })();
      }
    }
  }, [trashData, isFocused, authCtx, queryClient]);

  // No-op for manual delete because React Query will re-fetch or invalidate
  const handleDeleteItem = useCallback((id: string | number, routeKey: string) => {
    // We let the mutation handles the cache invalidation
  }, []);

  // Create a wrapper renderScene function that uses renderSceneContent
  const renderScene = ({ route }: { route: TabRoute }) => {
    // Only render the component if it's the active tab
    const currentRoute = routes[index];
    if (route.key !== currentRoute.key) return null;

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

    // Use the renderSceneContent function to render the tab
    return (
      <PasswordTab
        data={data}
        hideCreateCta={route.key === "third"}
        onDelete={(id) => handleDeleteItem(id, route.key)}
        source={route.key === "first" ? "cloud" : route.key === "second" ? "local" : "trash"}
      />
    );
  };

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
          title={t("passwords.title")}
          showBack={false}
          showLogo={true}
          logoSource={dark ? images.lightLogo : images.darkLogo}
          onLogoPress={() => navigation.goBack()}
        />
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
        />
      </View>
      {/* TEMP: Loading overlay to preview new design; ensure at least 3s visibility */}
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

export default Passwords;
