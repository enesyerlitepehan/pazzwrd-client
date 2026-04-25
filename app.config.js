const appName = process.env.EXPO_APP_NAME || "pazzwrd";
const appSlug = process.env.EXPO_APP_SLUG || "frontend";
const appScheme = process.env.EXPO_APP_SCHEME || "pmgr";
const iosBundleIdentifier = process.env.EXPO_IOS_BUNDLE_IDENTIFIER || "com.example.passwordclient";
const androidPackage = process.env.EXPO_ANDROID_PACKAGE || "com.example.passwordclient";
const easProjectId = process.env.EXPO_EAS_PROJECT_ID || undefined;
const expoOwner = process.env.EXPO_OWNER || undefined;

const expoConfig = {
  scheme: appScheme,
  name: appName,
  slug: appSlug,
  version: "1.0.7",
  orientation: "portrait",
  icon: "./assets/icon-1024x1024.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-2048x2048.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    icon: "./assets/icon-1024x1024-ios.png",
    supportsTablet: true,
    bundleIdentifier: iosBundleIdentifier,
    buildNumber: "1.0.11",
    infoPlist: {
      NSFaceIDUsageDescription: "This app uses Face ID to authenticate you quickly and securely.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/icon-1024x1024.png",
      backgroundColor: "#ffffff",
    },
    package: androidPackage,
    versionCode: 5,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-router", "expo-secure-store"],
  extra: {
    router: {},
  },
};

if (easProjectId) {
  expoConfig.extra.eas = {
    projectId: easProjectId,
  };
}

if (expoOwner) {
  expoConfig.owner = expoOwner;
}

module.exports = {
  expo: expoConfig,
};
