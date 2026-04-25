import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import React, { useState, useRef, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, TouchableOpacity, Image, Switch } from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native-virtualized-view";

import Button from "../../components/Button";
import ButtonFilled from "../../components/ButtonFilled";
import SettingsItem from "../../components/SettingsItem";
import { COLORS, icons, images, SIZES } from "../../constants";
import { AuthContext } from "../../store/auth-context";
import { useTheme } from "../../theme/ThemeProvider";
import { launchImagePicker } from "../../utils/ImagePickerHelper";
import { AsyncStorage } from "../../utils/userScopedStorage";
import { useUserQuery } from "../../hooks/useUserQuery";
import Header from "../Header";

type Nav = {
  navigate: (value: string) => void;
};

const Profile = () => {
  const refRBSheet = useRef<any>(null);
  const { dark, colors, setScheme } = useTheme();
  const { navigate } = useNavigation<Nav>();
  const authCtx = useContext(AuthContext);
  const { t, i18n } = useTranslation("common");

  const getLanguageName = (code: string) => {
    switch (code) {
      case "tr":
        return "Türkçe";
      case "fr":
        return "Français";
      case "en":
      default:
        return "English (US)";
    }
  };

  /**
   * Render User Profile
   */
  const renderProfile = () => {
    const defaultAvatars = [
      images.user1,
      images.user2,
      images.user3,
      images.user4,
      images.user5,
      images.user6,
      images.user7,
      images.user8,
      images.user9,
      images.user10,
    ];

    // Persisted avatar keys (scoped per active user via userScopedStorage)
    const AVATAR_URI_KEY = "avatarUri";
    const AVATAR_DEFAULT_INDEX_KEY = "avatarDefaultIndex";

    const [image, setImage] = useState<any>(null);
    const [fullName, setFullName] = useState<string>("");
    const [email, setEmail] = useState<string>("");

    const { data: userData } = useUserQuery(authCtx.isAuthenticated);

    useEffect(() => {
      if (userData) {
        if (userData.fullName) setFullName(userData.fullName);
        if (userData.mail) setEmail(userData.mail);
        else if (userData.email) setEmail(userData.email);
      }
    }, [userData]);

    // Load avatar (URI > saved default index > pick random and save index)
    useEffect(() => {
      let isActive = true;
      (async () => {
        try {
          // Load persisted avatar first
          const savedUri = await AsyncStorage.getItem(AVATAR_URI_KEY);
          if (!isActive) return;
          if (savedUri) {
            setImage({ uri: savedUri });
          } else {
            const idxStr = await AsyncStorage.getItem(AVATAR_DEFAULT_INDEX_KEY);
            if (!isActive) return;
            if (idxStr !== null && idxStr !== undefined) {
              const idx = Number(idxStr);
              if (!Number.isNaN(idx) && defaultAvatars[idx]) {
                setImage(defaultAvatars[idx]);
              } else {
                // Fallback: randomize and persist
                const r = Math.floor(Math.random() * defaultAvatars.length);
                setImage(defaultAvatars[r]);
                await AsyncStorage.setItem(AVATAR_DEFAULT_INDEX_KEY, String(r));
              }
            } else {
              const r = Math.floor(Math.random() * defaultAvatars.length);
              setImage(defaultAvatars[r]);
              await AsyncStorage.setItem(AVATAR_DEFAULT_INDEX_KEY, String(r));
            }
          }
        } catch {}
      })();
      return () => {
        isActive = false;
      };
    }, []);

    // Refresh avatar whenever the Profile screen gains focus
    useFocusEffect(
      React.useCallback(() => {
        let isActive = true;
        (async () => {
          try {
            const savedUri = await AsyncStorage.getItem(AVATAR_URI_KEY);
            if (!isActive) return;
            if (savedUri) {
              setImage({ uri: savedUri });
            } else {
              const idxStr = await AsyncStorage.getItem(AVATAR_DEFAULT_INDEX_KEY);
              if (!isActive) return;
              const idx = idxStr != null ? Number(idxStr) : NaN;
              if (!Number.isNaN(idx) && defaultAvatars[idx]) {
                setImage(defaultAvatars[idx]);
              }
            }
          } catch {}
        })();
        return () => {
          isActive = false;
        };
      }, []),
    );

    const pickImage = async () => {
      try {
        const tempUri = await launchImagePicker();
        if (!tempUri) return;
        setImage({ uri: tempUri });
        // Persist user-chosen avatar URI
        try {
          await AsyncStorage.setItem(AVATAR_URI_KEY, tempUri);
        } catch {}
      } catch (error) {}
    };

    return (
      <View style={styles.profileContainer}>
        <View>
          <Image source={image || images.user1} resizeMode="cover" style={styles.avatar} />
          {/*<TouchableOpacity onPress={pickImage} style={styles.picContainer}>
            <MaterialIcons name="edit" size={16} color={COLORS.white} />
          </TouchableOpacity>*/}
        </View>
        <Text style={[styles.title, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
          {fullName || ""}
        </Text>
        <Text
          style={[styles.subtitle, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}
        >
          {email || ""}
        </Text>
      </View>
    );
  };
  /**
   * Render Settings
   */
  const renderSettings = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleDarkMode = () => {
      setIsDarkMode((prev) => !prev);
      dark ? setScheme("light") : setScheme("dark");
    };

    return (
      <View style={styles.settingsContainer}>
        <SettingsItem
          icon={icons.padlock}
          name={t("settings.updatePassword")}
          onPress={() => navigate("UpdatePassword")}
        />
        <SettingsItem
          icon={icons.bell3}
          name={t("settings.myNotification")}
          onPress={() => navigate("Notifications")}
        />
        <SettingsItem
          icon={icons.userOutline}
          name={t("settings.editProfile")}
          onPress={() => navigate("EditProfile")}
        />
        <SettingsItem
          icon={icons.shieldOutline}
          name={t("settings.security")}
          onPress={() => navigate("SettingsSecurity")}
        />
        <SettingsItem
          icon={icons.masterPassword}
          name={"Master Password"}
          onPress={() => navigate("SettingsMasterPassword")}
        />
        <SettingsItem
          icon={icons.premium1}
          name={t("upgrade.upgradeToPro")}
          onPress={() => navigate("SettingsUpgrade")}
        />
        <TouchableOpacity
          onPress={() => navigate("SettingsLanguage")}
          style={styles.settingsItemContainer}
        >
          <View style={styles.leftContainer}>
            <Image
              source={icons.more}
              resizeMode="contain"
              style={[
                styles.settingsIcon,
                {
                  tintColor: dark ? COLORS.white : COLORS.greyscale900,
                },
              ]}
            />
            <Text
              style={[
                styles.settingsName,
                {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                },
              ]}
            >
              {t("settings.languageRegion")}
            </Text>
          </View>
          <View style={styles.rightContainer}>
            <Text
              style={[
                styles.rightLanguage,
                {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                },
              ]}
            >
              {getLanguageName(i18n.language)}
            </Text>
            <Image
              source={icons.arrowRight}
              resizeMode="contain"
              style={[
                styles.settingsArrowRight,
                {
                  tintColor: dark ? COLORS.white : COLORS.greyscale900,
                },
              ]}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsItemContainer}>
          <View style={styles.leftContainer}>
            <Image
              source={icons.show}
              resizeMode="contain"
              style={[
                styles.settingsIcon,
                {
                  tintColor: dark ? COLORS.white : COLORS.greyscale900,
                },
              ]}
            />
            <Text
              style={[
                styles.settingsName,
                {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                },
              ]}
            >
              {t("settings.darkMode")}
            </Text>
          </View>
          <View style={styles.rightContainer}>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              thumbColor={isDarkMode ? "#fff" : COLORS.white}
              trackColor={{ false: "#EEEEEE", true: COLORS.primary }}
              ios_backgroundColor={COLORS.white}
              style={styles.switch}
            />
          </View>
        </TouchableOpacity>
        <SettingsItem
          icon={icons.lockedComputerOutline}
          name={t("settings.privacyPolicy")}
          onPress={() => navigate("SettingsPrivacyPolicy")}
        />
        <SettingsItem
          icon={icons.infoCircle}
          name={t("settings.helpCenter")}
          onPress={() => navigate("SettingsHelpCenter")}
        />
        <SettingsItem
          icon={icons.people4}
          name={t("settings.inviteFriends")}
          onPress={() => navigate("SettingsInviteFriends")}
        />
        <SettingsItem
          icon={icons.settings}
          name={t("settings.logoutPreferences")}
          onPress={() => navigate("SettingsLogoutPreferences")}
        />
        <TouchableOpacity onPress={() => refRBSheet.current.open()} style={styles.logoutContainer}>
          <View style={styles.logoutLeftContainer}>
            <Image
              source={icons.logout}
              resizeMode="contain"
              style={[
                styles.logoutIcon,
                {
                  tintColor: "red",
                },
              ]}
            />
            <Text
              style={[
                styles.logoutName,
                {
                  color: "red",
                },
              ]}
            >
              {t("settings.logout")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };
  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title={t("profile.title")}
          showBack={false}
          showLogo={true}
          logoSource={dark ? images.lightLogo : images.darkLogo}
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderProfile()}
          {renderSettings()}
        </ScrollView>
      </View>
      <RBSheet
        ref={refRBSheet}
        closeOnPressMask={true}
        height={SIZES.height * 0.8}
        customStyles={{
          wrapper: {
            backgroundColor: "rgba(0,0,0,0.5)",
          },
          draggableIcon: {
            backgroundColor: dark ? COLORS.gray2 : COLORS.grayscale200,
            height: 4,
          },
          container: {
            borderTopRightRadius: 32,
            borderTopLeftRadius: 32,
            height: 260,
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          },
        }}
      >
        <Text style={styles.bottomTitle}>{t("logout.title")}</Text>
        <View
          style={[
            styles.separateLine,
            {
              backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
            },
          ]}
        />
        <Text
          style={[
            styles.bottomSubtitle,
            {
              color: dark ? COLORS.white : COLORS.black,
            },
          ]}
        >
          {t("logout.message")}
        </Text>
        <View style={styles.bottomContainer}>
          <Button
            title={t("common.cancel")}
            style={{
              width: (SIZES.width - 32) / 2 - 8,
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderRadius: 32,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
            }}
            textColor={dark ? COLORS.white : COLORS.primary}
            onPress={() => refRBSheet.current.close()}
          />
          <ButtonFilled
            title={t("common.yesLogout")}
            style={styles.logoutButton}
            onPress={() => {
              authCtx.logout();
              refRBSheet.current.close();
            }}
          />
        </View>
      </RBSheet>
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
    marginBottom: 32,
  },
  profileContainer: {
    alignItems: "center",
    borderBottomColor: COLORS.grayscale400,
    borderBottomWidth: 0.4,
    paddingVertical: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 999,
  },
  picContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    position: "absolute",
    right: 0,
    bottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.greyscale900,
    fontFamily: "medium",
    marginTop: 4,
  },
  settingsContainer: {
    marginVertical: 12,
  },
  settingsItemContainer: {
    width: SIZES.width - 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900,
  },
  settingsName: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginLeft: 12,
  },
  settingsArrowRight: {
    width: 24,
    height: 24,
    tintColor: COLORS.greyscale900,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightLanguage: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginRight: 8,
  },
  switch: {
    marginLeft: 8,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], // Adjust the size of the switch
  },
  logoutContainer: {
    width: SIZES.width - 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  logoutLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900,
  },
  logoutName: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginLeft: 12,
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  logoutButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.primary,
    borderRadius: 32,
  },
  bottomTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
    color: "red",
    textAlign: "center",
    marginTop: 12,
  },
  bottomSubtitle: {
    fontSize: 20,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginVertical: 28,
  },
  separateLine: {
    width: SIZES.width,
    height: 1,
    backgroundColor: COLORS.grayscale200,
    marginTop: 12,
  },
});

export default Profile;
