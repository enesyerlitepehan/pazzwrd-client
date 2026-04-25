import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { COLORS, icons, SIZES } from "../../constants";
import { MASKED_VALUE, getAvatarSource } from "./helpers";
import { Password } from "../../utils/types/passwordTypes";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../theme/ThemeProvider";

interface PasswordRowProps {
  item: Password;
  isHiddenUsername: boolean;
  isHiddenPassword: boolean;
  decryptedUsername?: string;
  decryptedPassword?: string;
  toggleUsernameVisibility: (item: Password) => void;
  togglePasswordVisibility: (item: Password) => void;
  handleCopyUsername: (item: Password) => void;
  handleCopyPassword: (item: Password) => void;
  handleLongPress: (item: Password) => void;
  onPress: (item: Password) => void;
}

const ICON_SIZE = 20;
const HIDDEN_ICON_SIZE = 22;
const ICON_SPACING = 12;

const PasswordRow = ({
  item,
  isHiddenUsername,
  isHiddenPassword,
  decryptedUsername,
  decryptedPassword,
  toggleUsernameVisibility,
  togglePasswordVisibility,
  handleCopyUsername,
  handleCopyPassword,
  handleLongPress,
  onPress,
}: PasswordRowProps) => {
  const { colors } = useTheme();
  const { t } = useTranslation("common");

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.surface,
        },
      ]}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.detailsContainer}>
        <View>
          <View
            style={[
              styles.productImageContainer,
              {
                backgroundColor: colors.surfaceAlternative,
              },
            ]}
          >
            <Image
              source={getAvatarSource(item.metadataPublic?.avatar_id)}
              resizeMode="cover"
              style={styles.productImage}
            />
          </View>
        </View>
        <View style={styles.detailsRightContainer}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.name,
              {
                color: colors.text,
              },
            ]}
          >
            {item?.metadataPublic?.name || t("passwords.unnamed")}
          </Text>
          <View style={styles.priceContainer}>
            <View style={styles.priceItemContainer}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.totalPrice,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              >
                {isHiddenUsername ? MASKED_VALUE : decryptedUsername || MASKED_VALUE}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCopyUsername(item)}
              style={{
                marginLeft: "auto",
                marginRight: ICON_SPACING,
              }}
            >
              <Image
                source={icons.copy}
                resizeMode="contain"
                style={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  tintColor: colors.iconSecondary,
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleUsernameVisibility(item)}
              style={{ marginLeft: ICON_SPACING }}
            >
              <Image
                source={isHiddenUsername ? icons.passwordHiddenOn : icons.passwordHiddenOff}
                resizeMode="contain"
                style={{
                  width: HIDDEN_ICON_SIZE,
                  height: HIDDEN_ICON_SIZE,
                  tintColor: colors.iconSecondary,
                }}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.priceContainer}>
            <View style={styles.priceItemContainer}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.totalPrice,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              >
                {isHiddenPassword ? MASKED_VALUE : decryptedPassword || MASKED_VALUE}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCopyPassword(item)}
              style={{
                marginLeft: "auto",
                marginRight: ICON_SPACING,
              }}
            >
              <Image
                source={icons.copy}
                resizeMode="contain"
                style={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  tintColor: colors.iconSecondary,
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => togglePasswordVisibility(item)}
              style={{ marginLeft: ICON_SPACING }}
            >
              <Image
                source={isHiddenPassword ? icons.passwordHiddenOn : icons.passwordHiddenOff}
                resizeMode="contain"
                style={{
                  width: HIDDEN_ICON_SIZE,
                  height: HIDDEN_ICON_SIZE,
                  tintColor: colors.iconSecondary,
                }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.separateLine,
          {
            marginVertical: 10,
            backgroundColor: colors.border,
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: SIZES.width - 32,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  separateLine: {
    width: "100%",
    height: 0.7,
    backgroundColor: COLORS.greyScale800,
    marginVertical: 12,
  },
  detailsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  productImageContainer: {
    width: 88,
    height: 88,
    borderRadius: 16,
    marginHorizontal: 12,
    backgroundColor: COLORS.silver,
  },
  productImage: {
    width: 88,
    height: 88,
    borderRadius: 16,
  },
  detailsRightContainer: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 17,
    fontFamily: "bold",
    color: COLORS.greyscale900,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  totalPrice: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.primary,
    textAlign: "center",
  },
  priceItemContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
});

export default React.memo(PasswordRow);
