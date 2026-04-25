import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../navigation/types";
import React, { useContext } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native-virtualized-view";

import { apiGetPendingReceivedShares } from "../api/api";
import Header from "../components/Header";
import NotificationEmptyState from "../components/NotificationEmptyState";
import ShareRequestItem from "../components/ShareRequestItem";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, icons } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";

const Notifications = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<RootStackNavigationProp<"Notifications">>();
  const authCtx = useContext(AuthContext);
  const [pendingSharesCount, setPendingSharesCount] = React.useState<number>(0);
  const [pendingShares, setPendingShares] = React.useState<any[]>([]);
  const [pendingSharesError, setPendingSharesError] = React.useState<string | null>(null);
  const [loadingVisible, setLoadingVisible] = React.useState<boolean>(false);

  /**
   * Render header
   */
  const renderHeader = () => {
    return <Header title="Notifications" />;
  };

  const fetchPendingShares = React.useCallback(async () => {
    setLoadingVisible(true);
    try {
      const resp = await apiGetPendingReceivedShares();
      const { status, ok: success, code, message, data } = resp;
      const body = data as any;
      const shares: any[] = Array.isArray(body?.shares) ? body.shares : [];
      if (success && Array.isArray(shares)) {
        setPendingShares(shares);
        setPendingSharesCount(shares.length || 0);
        setPendingSharesError(null);
        console.log(`Notifications: pending received shares = ${shares.length}`);
      } else {
        const errText = `[${status}] ${code || "ERROR"}: ${
          message || "Failed to fetch pending received shares"
        }`;
        setPendingShares([]);
        setPendingSharesCount(0);
        setPendingSharesError(errText);
        console.warn("Notifications pending shares error:", errText);
      }
    } catch (e: any) {
      setPendingShares([]);
      setPendingSharesCount(0);
      setPendingSharesError(String(e?.message || e));
      console.error("Notifications error fetching pending received shares:", e?.message || e);
    } finally {
      setLoadingVisible(false);
    }
  }, []);

  // On screen focus, fetch pending received shares (same as HomeScreen)
  useFocusEffect(
    React.useCallback(() => {
      fetchPendingShares();
      return () => {};
    }, [fetchPendingShares]),
  );

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingVertical: 8 }} />
          {pendingShares.length > 0 ? (
            pendingShares.map((sh: any) => (
              <ShareRequestItem
                key={`share-${String(sh?.shareId)}`}
                shareId={sh?.shareId}
                ownerDisplay={sh?.ownerDisplay}
                onResolved={() => {
                  fetchPendingShares();
                }}
              />
            ))
          ) : (
            <NotificationEmptyState />
          )}
        </ScrollView>
      </View>
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerIconContainer: {
    height: 46,
    width: 46,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  arrowBackIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.black,
  },
  headerNoti: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  headerNotiLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  notiTitle: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.black,
  },
  headerNotiView: {
    height: 16,
    width: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  headerNotiTitle: {
    fontSize: 10,
    fontFamily: "bold",
    color: COLORS.white,
  },
  clearAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: "medium",
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "bold",
    fontSize: 16,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  iconContainer: {
    backgroundColor: "#000",
    borderRadius: 999,
    marginRight: 12,
    height: 68,
    width: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTitle: {
    fontFamily: "bold",
    fontSize: 18,
    color: COLORS.greyscale900,
    marginBottom: 6,
  },
  notificationDescription: {
    color: "gray",
    fontSize: 14,
    fontFamily: "medium",
  },
});

export default Notifications;
