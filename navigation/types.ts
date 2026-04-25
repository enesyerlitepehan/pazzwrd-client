import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  CompositeNavigationProp,
  NavigatorScreenParams,
  RouteProp,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Card } from "../utils/types/cardTypes";
import { Password } from "../utils/types/passwordTypes";

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPasswordMethods: undefined;
  ForgotPasswordEmail: undefined;
  OTPVerification: undefined;
  CreateNewPassword: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Cart:
    | {
        initialTab?: "passwords" | "cards";
        initialIndex?: number;
        initialSyncType?: "cloud" | "local";
      }
    | undefined;
  Password: { initialTab?: "cloud" | "local" | "trash"; initialIndex?: number } | undefined;
  Card: { initialTab?: "cloud" | "local" | "trash"; initialIndex?: number } | undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  TabLayout: NavigatorScreenParams<BottomTabParamList>;
  FAQs: undefined;
  Policy: undefined;
  Report: undefined;
  TermsOfService: undefined;
  HomeScreen: undefined;
  ActivityLog: undefined;
  PasswordDetail: {
    readOnly?: boolean;
    passwordData: Password;
  };
  CardDetail: {
    readOnly?: boolean;
    cardData: Card;
  };
  ProducteReceipt: undefined;
  UpdatePassword: undefined;
  Notifications: undefined;
  EditProfile: undefined;
  SettingsHelpCenter: undefined;
  SettingsInviteFriends: undefined;
  SettingsLanguage: undefined;
  SettingsLogoutPreferences: undefined;
  SettingsPrivacyPolicy: undefined;
  SettingsSecurity: undefined;
  SettingsUpgrade: undefined;
  SettingsUpgradePlans: undefined;
  SubscriptionPrivacyPolicy: undefined;
  SettingsDeleteAccount: undefined;
  SettingsMasterPassword: undefined;
  FingerPrint: undefined;
  FaceID: undefined;
  CreateNewPin: undefined;
  MasterPassword: undefined;
  ConfirmMasterPassword: undefined;
};

// Helper types for navigation props
export type RootStackNavigationProp<T extends keyof RootStackParamList> = NativeStackNavigationProp<
  RootStackParamList,
  T
>;

export type AuthStackNavigationProp<T extends keyof AuthStackParamList> = NativeStackNavigationProp<
  AuthStackParamList,
  T
>;

export type BottomTabNavProp<T extends keyof BottomTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Helper types for route props
export type RootStackRouteProp<T extends keyof RootStackParamList> = RouteProp<
  RootStackParamList,
  T
>;

export type AuthStackRouteProp<T extends keyof AuthStackParamList> = RouteProp<
  AuthStackParamList,
  T
>;

export type BottomTabRouteProp<T extends keyof BottomTabParamList> = RouteProp<
  BottomTabParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
