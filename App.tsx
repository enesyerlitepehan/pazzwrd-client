import {
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  TouchableOpacity,
} from "react-native";
import "./i18n";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import TabLayout from "./components/(tabs)/_layout";
import AppLock from "./components/AppLock";
import ScreenSecurityProvider from "./components/ScreenSecurityProvider";
import { ToastProvider, GlobalToastBridge } from "./components/ToastProvider";
import ActivityLog from "./screens/ActivityLog";
import CardDetail from "./screens/CardDetail";
import ConfirmMasterPassword from "./screens/ConfirmMasterPassword";
import CreateNewPassword from "./screens/CreateNewPassword";
import CreateNewPin from "./screens/CreateNewPin";
import EditProfile from "./screens/EditProfile";
import FaceID from "./screens/FaceID";
import FAQsScreen from "./screens/FAQsScreen";
import FingerPrint from "./screens/FingerPrint";
import ForgotPasswordEmail from "./screens/ForgotPasswordEmail";
import ForgotPasswordMethods from "./screens/ForgotPasswordMethods";
import HomeScreen from "./screens/HomeScreen";
import MasterPassword from "./screens/MasterPassword";
import Notifications from "./screens/Notifications";
import OTPVerification from "./screens/OTPVerification";
import PasswordDetail from "./screens/PasswordDetail";
import PolicyScreen from "./screens/PolicyScreen";
import ProducteReceipt from "./screens/ProducteReceipt";
import ReportScreen from "./screens/ReportScreen";
import SettingsHelpCenter from "./screens/SettingsHelpCenter";
import SettingsInviteFriends from "./screens/SettingsInviteFriends";
import SettingsLanguage from "./screens/SettingsLanguage";
import SettingsLogoutPreferences from "./screens/SettingsLogoutPreferences";
import SettingsMasterPassword from "./screens/SettingsMasterPassword";
import SettingsPrivacyPolicy from "./screens/SettingsPrivacyPolicy";
import SettingsSecurity from "./screens/SettingsSecurity";
import SettingsUpgrade from "./screens/SettingsUpgrade";
import SettingsUpgradePlans from "./screens/SettingsUpgradePlans";
import SettingsDeleteAccount from "./screens/SettingsDeleteAccount";
import SignInScreen from "./screens/SignInScreen";
import SignupScreen from "./screens/SignupScreen";
import SubscriptionPrivacyPolicy from "./screens/SubscriptionPrivacyPolicy";
import TermsOfServiceScreen from "./screens/TermsOfServiceScreen";
import UpdatePassword from "./screens/UpdatePassword";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./api/queryClient";
import AuthContextProvider, { AuthContext } from "./store/auth-context";
import { EntitlementsProvider } from "./store/entitlements-context";
import { ThemeProvider } from "./theme/ThemeProvider";
import { logger } from "./utils/logger";
import { createNavigationContainerRef, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

import NetInfo from "@react-native-community/netinfo";

import { SecurityProvider, useSecurity } from "./store/security-context";
import { runSecurityGate } from "./utils/navigationGuard";
import { AuthStackParamList, RootStackParamList } from "./navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStackComp = createNativeStackNavigator<AuthStackParamList>();
export const navRef = createNavigationContainerRef<RootStackParamList>();

function AuthStack() {
  return (
    <AuthStackComp.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#bc2929" },
        headerTintColor: "white",
        contentStyle: { backgroundColor: "#F4F4FB" },
      }}
    >
      <AuthStackComp.Screen
        name="Login"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <AuthStackComp.Screen
        name="SignUp"
        component={SignupScreen}
        options={{ headerShown: false }}
      />
      <AuthStackComp.Screen
        name={"ForgotPasswordMethods"}
        component={ForgotPasswordMethods}
        options={{ headerShown: false }}
      />
      <AuthStackComp.Screen
        name={"ForgotPasswordEmail"}
        component={ForgotPasswordEmail}
        options={{ headerShown: false }}
      />
      <AuthStackComp.Screen
        name={"OTPVerification"}
        component={OTPVerification}
        options={{ headerShown: false }}
      />
      <AuthStackComp.Screen
        name={"CreateNewPassword"}
        component={CreateNewPassword}
        options={{ headerShown: false }}
      />
    </AuthStackComp.Navigator>
  );
}

function AuthenticatedStack({
  isSearchVisible,
  setIsSearchVisible,
}: {
  isSearchVisible: boolean;
  setIsSearchVisible: (visible: boolean) => void;
}) {
  const authCtx = useContext(AuthContext);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TabLayout" component={TabLayout} />
      <Stack.Screen name={"FAQs"} component={FAQsScreen} />
      <Stack.Screen name={"Policy"} component={PolicyScreen} />
      <Stack.Screen name={"Report"} component={ReportScreen} />
      <Stack.Screen name={"TermsOfService"} component={TermsOfServiceScreen} />
      <Stack.Screen name={"HomeScreen"} component={HomeScreen} />
      <Stack.Screen name={"ActivityLog"} component={ActivityLog} />
      <Stack.Screen name={"PasswordDetail"} component={PasswordDetail} />
      <Stack.Screen name={"CardDetail"} component={CardDetail} />
      <Stack.Screen name={"ProducteReceipt"} component={ProducteReceipt} />
      <Stack.Screen name={"UpdatePassword"} component={UpdatePassword} />
      <Stack.Screen name={"Notifications"} component={Notifications} />
      <Stack.Screen name={"EditProfile"} component={EditProfile} />
      <Stack.Screen name={"SettingsHelpCenter"} component={SettingsHelpCenter} />
      <Stack.Screen name={"SettingsInviteFriends"} component={SettingsInviteFriends} />
      <Stack.Screen name={"SettingsLanguage"} component={SettingsLanguage} />
      <Stack.Screen name={"SettingsLogoutPreferences"} component={SettingsLogoutPreferences} />
      <Stack.Screen name={"SettingsPrivacyPolicy"} component={SettingsPrivacyPolicy} />
      <Stack.Screen name={"SettingsSecurity"} component={SettingsSecurity} />
      <Stack.Screen name={"SettingsUpgrade"} component={SettingsUpgrade} />
      <Stack.Screen name={"SettingsUpgradePlans"} component={SettingsUpgradePlans} />
      <Stack.Screen name={"SubscriptionPrivacyPolicy"} component={SubscriptionPrivacyPolicy} />
      <Stack.Screen name={"SettingsDeleteAccount"} component={SettingsDeleteAccount} />
      <Stack.Screen name={"SettingsMasterPassword"} component={SettingsMasterPassword} />
      <Stack.Screen name={"FingerPrint"} component={FingerPrint} />
      <Stack.Screen name={"FaceID"} component={FaceID} />
      <Stack.Screen name={"CreateNewPin"} component={CreateNewPin} />
      <Stack.Screen
        name={"MasterPassword"}
        component={MasterPassword}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name={"ConfirmMasterPassword"} component={ConfirmMasterPassword} />
    </Stack.Navigator>
  );
}

function Navigation({
  isSearchVisible,
  setIsSearchVisible,
}: {
  isSearchVisible: boolean;
  setIsSearchVisible: (visible: boolean) => void;
}) {
  const authCtx = useContext(AuthContext);
  const { accountAccess, mpStatus, emailStatus, isHydrated, setMpStatus } = useSecurity();

  // Use a ref to ensure the async runSecurityGate can always check the latest auth state,
  // avoiding stale closure issues during logout or stack transitions.
  const isAuthenticatedRef = useRef(authCtx.isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = authCtx.isAuthenticated;
  }, [authCtx.isAuthenticated]);

  const handleRunGate = useCallback(() => {
    if (!navRef.isReady() || !isHydrated || !authCtx.isAuthenticated) return;
    runSecurityGate(
      navRef,
      accountAccess,
      mpStatus,
      emailStatus,
      () => isAuthenticatedRef.current,
      setMpStatus,
    );
  }, [accountAccess, mpStatus, emailStatus, isHydrated, authCtx.isAuthenticated, setMpStatus]);

  // Re-run security gate when security context values hydrate/change
  useEffect(() => {
    if (!navRef.isReady()) return;
    handleRunGate();
  }, [accountAccess, mpStatus, emailStatus, authCtx.isAuthenticated, isHydrated, handleRunGate]);

  return (
    <NavigationContainer
      ref={navRef}
      onReady={async () => {
        // Run once on app start
        await logger.load();
        const route = navRef.getCurrentRoute();
        if (route?.name) {
          logger.info("ui", `Screen: ${route.name}`);
        }
        handleRunGate();
      }}
      onStateChange={() => {
        // Run on every navigation change
        const route = navRef.getCurrentRoute();
        if (route?.name) {
          logger.info("ui", `Screen: ${route.name}`);
        }
        handleRunGate();
      }}
    >
      {!authCtx.isAuthenticated && <AuthStack />}
      {authCtx.isAuthenticated && (
        <AuthenticatedStack
          isSearchVisible={isSearchVisible}
          setIsSearchVisible={setIsSearchVisible}
        />
      )}
    </NavigationContainer>
  );
}

function Root({
  isSearchVisible,
  setIsSearchVisible,
}: {
  isSearchVisible: boolean;
  setIsSearchVisible: (visible: boolean) => void;
}) {
  return <Navigation isSearchVisible={isSearchVisible} setIsSearchVisible={setIsSearchVisible} />;
}

export default function App() {
  const [isSearchVisible, setIsSearchVisible] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Global error handler: log and then forward to the previous handler.
    // @ts-ignore
    const ErrorUtilsAny = (global as any).ErrorUtils;
    if (!ErrorUtilsAny || typeof ErrorUtilsAny.setGlobalHandler !== "function") return;

    const previousHandler =
      typeof ErrorUtilsAny.getGlobalHandler === "function"
        ? ErrorUtilsAny.getGlobalHandler()
        : null;

    ErrorUtilsAny.setGlobalHandler((e: any, isFatal?: boolean) => {
      try {
        logger.error("error", e?.message || "Uncaught error", {
          isFatal,
          stack: e?.stack,
        });
      } catch {}

      try {
        if (typeof previousHandler === "function") {
          previousHandler(e, isFatal);
        }
      } catch {}
    });
  }, []);

  useEffect(() => {
    // Init logger
    logger.info("ui", "App start");
    let mounted = true;
    // Initial connectivity check
    NetInfo.fetch()
      .then((state) => {
        if (!mounted) return;
        const offline = state.isConnected === false || state.isInternetReachable === false;
        setIsOffline(offline);
      })
      .catch(() => {});

    // Subscribe to connectivity changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline((prev) => {
        if (prev !== offline) {
          logger.info("network", offline ? "offline" : "online");
        }
        return offline;
      });
    });

    return () => {
      mounted = false;
      try {
        unsubscribe && unsubscribe();
      } catch {}
    };
  }, []);

  const closeSearchAndKeyboard = () => {
    Keyboard.dismiss(); // Dismiss the keyboard
    setIsSearchVisible(false); // Close the search input if visible
  };

  const handleRefreshNetwork = () => {
    NetInfo.fetch()
      .then((state) => {
        const offline = state.isConnected === false || state.isInternetReachable === false;
        setIsOffline(offline);
      })
      .catch(() => {});
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TouchableWithoutFeedback onPress={closeSearchAndKeyboard}>
        <ThemeProvider>
          <View style={styles.container}>
            <StatusBar style="light" />
            <AuthContextProvider>
              <SecurityProvider>
                <EntitlementsProvider>
                  {isOffline && (
                    <SafeAreaView>
                      <View style={styles.offlineBanner}>
                        <Text style={styles.offlineText}>
                          You are offline. Some features may be unavailable.
                        </Text>
                        <TouchableOpacity
                          onPress={handleRefreshNetwork}
                          style={styles.refreshButton}
                        >
                          <Text style={styles.refreshButtonText}>Refresh network</Text>
                        </TouchableOpacity>
                      </View>
                    </SafeAreaView>
                  )}
                  <ToastProvider>
                    <GlobalToastBridge />
                    <ScreenSecurityProvider>
                      <Root
                        isSearchVisible={isSearchVisible}
                        setIsSearchVisible={setIsSearchVisible}
                      />
                      <AppLock />
                    </ScreenSecurityProvider>
                  </ToastProvider>
                </EntitlementsProvider>
              </SecurityProvider>
            </AuthContextProvider>
          </View>
        </ThemeProvider>
      </TouchableWithoutFeedback>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F4FB",
  },
  offlineBanner: {
    backgroundColor: "#FFEDED",
    borderBottomWidth: 1,
    borderBottomColor: "#E0B3B3",
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  offlineText: {
    color: "#8A1C1C",
    flex: 1,
    marginRight: 12,
  },
  refreshButton: {
    backgroundColor: "#bc2929",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
