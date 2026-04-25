import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

import { SIZES, COLORS, icons } from "../constants";
import { CardType } from "../utils/cardUtils";

interface WalletCardProps {
  cardHolderName: string;
  cardNumber: string;
  cardType?: string;
  expiryDate?: string;
  cvv?: string;
}

/**
 * WalletCard component displays a credit/debit card with holder name, card number, expiry date and CVV
 */
const WalletCard: React.FC<WalletCardProps> = ({
  cardHolderName = "John Doe",
  cardNumber = "4111 1111 1111 1111",
  cardType = CardType.VISA,
  expiryDate = "12/29",
  cvv = "123",
}) => {
  // Ensure sample defaults are shown even if parent passes empty strings
  const displayHolderName = cardHolderName && cardHolderName.trim() ? cardHolderName : "John Doe";
  const displayCardNumber = cardNumber && cardNumber.trim() ? cardNumber : "4111 1111 1111 1111";
  const displayExpiryDate = expiryDate && expiryDate.trim() ? expiryDate : "12/29";
  const displayCvv = cvv && cvv.trim() ? cvv : "123";
  const displayCardType = cardType && String(cardType).trim() ? cardType : CardType.VISA;

  /**
   * Returns the appropriate card logo based on card type
   * @param cardType - The detected card type
   * @returns The card logo image source
   */
  const getCardLogo = (cardType?: string) => {
    if (!cardType) return icons.creditCard; // Default card icon

    switch (cardType) {
      case CardType.MASTERCARD:
        return icons.masterCardLogo;
      case CardType.VISA:
        return icons.visaCard;
      case CardType.AMEX:
        return icons.amexCard;
      case CardType.DISCOVER:
        return icons.discoverCard;
      case CardType.DINERS:
        return icons.dinersClubCard;
      case CardType.JCB:
        return icons.jcbCard;
      default:
        return icons.creditCard; // Default to generic credit card icon
    }
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.topCardContainer}>
        <View style={styles.topCardLeftContainer}>
          <Text style={styles.cardHolderName}>{displayHolderName}</Text>
          <Text style={styles.cardNumber}>{displayCardNumber}</Text>
        </View>
        <View style={styles.topCardRightContainer}>
          {/* Display only card logo based on detected card type */}
          <Image
            source={getCardLogo(displayCardType)}
            resizeMode="contain"
            style={styles.cardLogo}
          />
        </View>
      </View>
      <View style={styles.bottomCardContainer}>
        <View style={styles.cardInfoItem}>
          <Text style={styles.cardInfoValue}>{displayExpiryDate}</Text>
        </View>
        <View style={styles.cardInfoItem}>
          <Text style={styles.cardInfoValue}>{displayCvv}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: SIZES.width - 32,
    borderRadius: 32,
    marginTop: 16,
    height: 170,
    backgroundColor: COLORS.primary,
    padding: 16,
  },
  topCardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  topCardLeftContainer: {
    marginTop: 6,
  },
  topCardRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  cardHolderName: {
    fontSize: 22,
    color: COLORS.white,
    fontFamily: "bold",
  },
  cardNumber: {
    fontSize: 20,
    color: COLORS.white,
    fontFamily: "semiBold",
  },
  cardLogo: {
    height: 52,
    width: 52,
  },
  bottomCardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  cardInfoItem: {
    alignItems: "center",
  },
  cardInfoLabel: {
    fontSize: 14,
    color: COLORS.white,
    fontFamily: "medium",
    opacity: 0.8,
  },
  cardInfoValue: {
    fontSize: 18,
    color: COLORS.white,
    fontFamily: "bold",
    marginTop: 4,
  },
});

export default WalletCard;
