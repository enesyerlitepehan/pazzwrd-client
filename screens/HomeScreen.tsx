import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../navigation/types";
import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native-virtualized-view";

import { apiGetPendingReceivedShares } from "../api/api";
import Header from "../components/Header";
import PasswordStrength from "../components/home/PasswordStrength";
import PlanLimits from "../components/home/PlanLimits";
import RecentActivity from "../components/home/RecentActivity";
import SecurityStatus from "../components/home/SecurityStatus";
import Statistics from "../components/home/Statistics";
import TrashSummary from "../components/home/TrashSummary";
import { COLORS, icons, images, SIZES } from "../constants";
import { useHomeMetrics } from "../hooks/useHomeMetrics";
import { useUserQuery } from "../hooks/useUserQuery";
import { useHomeHeaderState } from "./home/useHomeHeaderState";
import { usePendingSharesState } from "./home/usePendingSharesState";
import { AuthContext } from "../store/auth-context";
import { useSecurity } from "../store/security-context";
import { useEntitlements } from "../store/entitlements-context";
import { useTheme } from "../theme/ThemeProvider";
import { getGreeting } from "../utils/greeting";

const HomeScreen = () => {
  const authCtx = useContext(AuthContext);

  const navigation = useNavigation<RootStackNavigationProp<"TabLayout">>();
  const { colors } = useTheme();
  const { t } = useTranslation("common");
  const { counts, recent, trash, strength /*, loading, refresh */ } = useHomeMetrics();
  const { setEmailStatus } = useSecurity();
  const { refreshEntitlements } = useEntitlements();

  const { data: userData, refetch: refetchUser } = useUserQuery(authCtx.isAuthenticated);

  const { fullName, now, headerAvatar } = useHomeHeaderState(userData, setEmailStatus);
  const { hasPendingShares, pendingSharesCount, pendingSharesError } = usePendingSharesState();

  useFocusEffect(
    React.useCallback(() => {
      void (async () => {
        try {
          await Promise.allSettled([refetchUser(), refreshEntitlements()]);
        } catch {}
      })();

      return () => {};
    }, [refetchUser, refreshEntitlements]),
  );

  /**
   * Render header
   */
  const renderHeader = () => {
    return (
      <Header
        leftComponent={
          <View style={styles.viewLeft}>
            <Image
              source={headerAvatar || images.user1}
              resizeMode="contain"
              style={styles.userIcon}
            />
            <View style={styles.viewNameContainer}>
              <Text style={styles.greeeting}>{getGreeting(now)}</Text>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.text,
                  },
                ]}
              >
                {fullName || ""}
              </Text>
            </View>
          </View>
        }
        rightComponent={
          <View style={styles.viewRight}>
            <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
              <View style={styles.notiWrap}>
                <Image
                  source={icons.notificationBell2}
                  resizeMode="contain"
                  style={[styles.bellIcon, { tintColor: colors.icon }]}
                />
                {hasPendingShares && pendingSharesCount > 0 ? (
                  <View style={styles.notiBadge}>
                    <Text style={styles.notiBadgeText}>{`+${pendingSharesCount}`}</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  /**
   * Render dashboard (sections)
   */
  const renderDashboard = () => {
    return (
      <View>
        <RecentActivity recent={recent} />
        <Statistics counts={counts} />
        <TrashSummary counts={counts} trash={trash} />
        <PasswordStrength strength={strength} />
        <SecurityStatus />
        <PlanLimits />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <ScrollView showsVerticalScrollIndicator={false}>{renderDashboard()}</ScrollView>
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
  },
  headerContainer: {
    flexDirection: "row",
    width: SIZES.width - 32,
    justifyContent: "space-between",
    alignItems: "center",
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 32,
  },
  viewLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  greeeting: {
    fontSize: 12,
    fontFamily: "regular",
    color: "gray",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "bold",
    color: COLORS.greyscale900,
  },
  viewNameContainer: {
    marginLeft: 12,
  },
  viewRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  notiWrap: {
    position: "relative",
    paddingRight: 6,
    paddingTop: 2,
  },
  bellIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
    marginRight: 8,
  },
  notiBadge: {
    position: "absolute",
    top: -6,
    right: -2,
    backgroundColor: COLORS.primary,
    minWidth: 18,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  notiBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: "bold",
  },
  bookmarkIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
  },
  searchBarContainer: {
    width: SIZES.width - 32,
    backgroundColor: COLORS.secondaryWhite,
    padding: 16,
    borderRadius: 12,
    height: 52,
    marginVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  searchIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.gray,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "regular",
    marginHorizontal: 8,
  },
  filterIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.primary,
  },
  bannerContainer: {
    width: SIZES.width - 32,
    height: 154,
    paddingHorizontal: 28,
    paddingTop: 28,
    borderRadius: 32,
    backgroundColor: COLORS.secondary,
  },
  bannerTopContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerDicount: {
    fontSize: 12,
    fontFamily: "medium",
    color: COLORS.black,
    marginBottom: 4,
  },
  bannerDiscountName: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.black,
  },
  bannerDiscountNum: {
    fontSize: 46,
    fontFamily: "bold",
    color: COLORS.black,
  },
  bannerBottomContainer: {
    marginTop: 8,
  },
  bannerBottomTitle: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.black,
  },
  bannerBottomSubtitle: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.black,
    marginTop: 4,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
  },
  firstName: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.dark2,
    marginTop: 6,
  },
  bannerItemContainer: {
    width: "100%",
    paddingBottom: 10,
    backgroundColor: COLORS.secondary,
    height: 170,
    borderRadius: 32,
  },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ccc",
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: COLORS.black,
  },
  bottomTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
    color: COLORS.black,
    textAlign: "center",
    marginTop: 12,
  },
  separateLine: {
    height: 0.4,
    width: SIZES.width - 32,
    backgroundColor: COLORS.greyscale300,
    marginVertical: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.black,
    marginVertical: 12,
  },
  reusltTabContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: SIZES.width - 32,
    justifyContent: "space-between",
  },
  viewDashboard: {
    flexDirection: "row",
    alignItems: "center",
    width: 36,
    justifyContent: "space-between",
  },
  dashboardIcon: {
    width: 16,
    height: 16,
    tintColor: COLORS.primary,
  },
  tabText: {
    fontSize: 20,
    fontFamily: "semiBold",
    color: COLORS.black,
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 16,
    width: SIZES.width,
  },
  logoutButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.primary,
    borderRadius: 32,
  },
  // Dashboard styles
  cardBox: {
    width: SIZES.width - 32,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 16,
    fontFamily: "semiBold",
    marginBottom: 8,
    color: COLORS.greyscale900,
  },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowTextWrap: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: "semiBold",
  },
  rowSub: {
    fontSize: 12,
    fontFamily: "regular",
  },
  statGrid: {
    width: SIZES.width - 32,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 16,
  },
  statTile: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontFamily: "bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "regular",
    marginTop: 4,
    textAlign: "center",
  },
  securityCard: {
    width: SIZES.width - 32,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: "semiBold",
  },
  statusHint: {
    fontSize: 12,
    fontFamily: "regular",
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: "semiBold",
  },
  planCard: {
    width: SIZES.width - 32,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 24,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 12,
    fontFamily: "regular",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  planName: {
    fontSize: 20,
    fontFamily: "bold",
    marginTop: 4,
  },
  planSub: {
    fontSize: 12,
    fontFamily: "regular",
    marginTop: 4,
  },
  planAction: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  planActionText: {
    fontSize: 13,
    fontFamily: "semiBold",
  },
  limitRow: {
    marginTop: 12,
  },
  limitRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  limitLabel: {
    fontSize: 14,
    fontFamily: "semiBold",
  },
  limitValue: {
    fontSize: 14,
    fontFamily: "semiBold",
  },
  limitProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  limitProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  limitHint: {
    fontSize: 12,
    fontFamily: "regular",
    marginTop: 4,
  },
});

export default HomeScreen;
