import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SIZES, COLORS, icons } from "../../constants";
import { formatCardNumber } from "../../utils/cardUtils";
import { useTheme } from "../../theme/ThemeProvider";

interface CardRowProps {
  item: any;
  isHiddenHolder: boolean;
  isHiddenNumber: boolean;
  decryptedHolder?: string;
  decryptedNumber?: string;
  decryptedType?: string;
  toggleHolderHidden: (item: any) => void;
  toggleNumberHidden: (item: any) => void;
  handleCopyHolder: (item: any) => void;
  handleCopyNumber: (item: any) => void;
  handleLongPress: (item: any) => void;
  onPress: (item: any) => void;
  t: (key: string) => string;
}

const ICON_SIZE = 20;
const HIDDEN_ICON_SIZE = 22;
const ICON_SPACING = 12;

const CardRow = ({
  item,
  isHiddenHolder,
  isHiddenNumber,
  decryptedHolder,
  decryptedNumber,
  decryptedType,
  toggleHolderHidden,
  toggleNumberHidden,
  handleCopyHolder,
  handleCopyNumber,
  handleLongPress,
  onPress,
  t,
}: CardRowProps) => {
  const { colors } = useTheme();

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
              source={(() => {
                const type = (item?.metadataPublic?.cardType || decryptedType || "").toUpperCase();
                if (type === "VISA") return icons.visaCard;
                if (type === "MASTERCARD") return icons.masterCardLogo;
                if (type === "AMEX") return icons.amexCard;
                if (type === "DISCOVER") return icons.discoverCard;
                if (type === "DINERS") return icons.dinersClubCard;
                if (type === "JCB") return icons.jcbCard;
                return icons.creditCard;
              })()}
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
            {item?.metadataPublic?.bankName || t("items.card")}
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
                {isHiddenHolder ? "••••••••" : decryptedHolder || ""}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleCopyHolder(item)} style={{ marginLeft: "auto" }}>
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
              onPress={() => toggleHolderHidden(item)}
              style={{ marginLeft: ICON_SPACING }}
            >
              <Image
                source={isHiddenHolder ? icons.passwordHiddenOn : icons.passwordHiddenOff}
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
                {isHiddenNumber
                  ? "•••• •••• •••• " +
                    (item?.metadataPublic?.cardNumberLast4 ||
                      (decryptedNumber || "").slice(-4) ||
                      "••••")
                  : formatCardNumber(decryptedNumber || "")}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleCopyNumber(item)} style={{ marginLeft: "auto" }}>
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
              onPress={() => toggleNumberHidden(item)}
              style={{ marginLeft: ICON_SPACING }}
            >
              <Image
                source={isHiddenNumber ? icons.passwordHiddenOn : icons.passwordHiddenOff}
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

export default React.memo(CardRow);
