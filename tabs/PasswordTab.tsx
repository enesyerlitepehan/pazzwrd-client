import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";

import EmptyState from "../components/ui/EmptyState";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES } from "../constants";

import { useTheme } from "../theme/ThemeProvider";

import { useNavigation } from "@react-navigation/native";
import { BottomTabNavProp } from "../navigation/types";

import { Password } from "../utils/types/passwordTypes";

import { useTranslation } from "react-i18next";
import { usePasswordTabSecrets } from "./password-tab/usePasswordTabSecrets";
import { usePasswordTabActions } from "./password-tab/usePasswordTabActions";
import PasswordRow from "./password-tab/PasswordRow";
import { getPasswordRowKey } from "./password-tab/identity";

interface PasswordTabProps {
  data?: Password[] | null;
  hideCreateCta?: boolean;
  onDelete?: (id: string | number) => void;
  source?: "cloud" | "local" | "trash";
}

const ICON_SIZE = 20;
const HIDDEN_ICON_SIZE = 22;
const ICON_SPACING = 12;

const PasswordTab = ({ data, hideCreateCta, onDelete, source }: PasswordTabProps) => {
  const { t } = useTranslation("common");

  const [orders, setOrders] = useState<any[]>([]);
  const { dark, colors } = useTheme();
  const navigation = useNavigation<BottomTabNavProp<"Password">>();

  const {
    hiddenUsernames,
    hiddenPasswords,
    decryptedUsernames,
    decryptedPasswords,
    toggleUsernameVisibility,
    togglePasswordVisibility,
    handleCopyUsername,
    handleCopyPassword,
  } = usePasswordTabSecrets();

  const {
    modalVisible,
    modalResult,
    modalMsgKey,
    modalMsg,
    modalTitle,
    modalConfirmMode,
    handleLongPress,
    handleDeleteConfirm,
    closeModal,
  } = usePasswordTabActions({
    orders,
    setOrders,
    onDelete,
  });

  const handleRowPress = useCallback(
    (password: Password) => {
      navigation.navigate("PasswordDetail", {
        passwordData: password,
        readOnly: Boolean(password?.deletedAt),
      });
    },
    [navigation],
  );

  useEffect(() => {
    if (data) {
      setOrders(data);
    }
  }, [data]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const itemId = getPasswordRowKey(item as Password);
      return (
        <PasswordRow
          item={item as Password}
          isHiddenUsername={hiddenUsernames[itemId] ?? true}
          isHiddenPassword={hiddenPasswords[itemId] ?? true}
          decryptedUsername={decryptedUsernames[itemId]}
          decryptedPassword={decryptedPasswords[itemId]}
          toggleUsernameVisibility={toggleUsernameVisibility}
          togglePasswordVisibility={togglePasswordVisibility}
          handleCopyUsername={handleCopyUsername}
          handleCopyPassword={handleCopyPassword}
          handleLongPress={handleLongPress}
          onPress={handleRowPress}
        />
      );
    },
    [
      hiddenUsernames,
      hiddenPasswords,
      decryptedUsernames,
      decryptedPasswords,
      toggleUsernameVisibility,
      togglePasswordVisibility,
      handleCopyUsername,
      handleCopyPassword,
      handleLongPress,
      handleRowPress,
    ],
  );

  const keyExtractor = useCallback((item: any) => getPasswordRowKey(item as Password), []);

  // Main render logic wrapped in a container to ensure Modals stay mounted during state transitions
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundSecondary,
          flex: 1, // Ensure it fills the screen
          marginVertical: 0, // Reset margin as it's now a root container for the tab
        },
      ]}
    >
      <LoadingModal
        visible={modalVisible}
        message={modalMsg}
        messageKey={modalMsgKey}
        titleKey={modalTitle}
        messageParams={{ item: t("items.password") }}
        showSpinner={!modalResult && !modalConfirmMode}
        resultMode={modalResult}
        confirmMode={modalConfirmMode}
        opKind={modalConfirmMode ? "delete" : undefined}
        itemType="password"
        showActionButton={modalResult}
        onAction={modalConfirmMode ? handleDeleteConfirm : closeModal}
        onCancel={closeModal}
      />

      {!data ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.text }}>{t("passwords.loading")}</Text>
        </View>
      ) : data.length === 0 ? (
        <EmptyState
          message={t("passwords.empty")}
          ctaLabel={!hideCreateCta ? t("passwords.createCta") : undefined}
          onPress={
            !hideCreateCta
              ? () =>
                  navigation.navigate("Cart", {
                    initialTab: "passwords",
                    initialSyncType: source === "cloud" ? "cloud" : "local",
                  })
              : undefined
          }
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.tertiaryWhite,
    marginVertical: 22,
  },
  cardContainer: {
    width: SIZES.width - 32,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.greyscale900,
  },
  statusContainer: {
    width: 54,
    height: 24,
    borderRadius: 6,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    color: COLORS.primary,
    fontFamily: "medium",
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
  address: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginVertical: 6,
  },
  serviceTitle: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
  },
  serviceText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: "medium",
    marginTop: 6,
  },
  cancelBtn: {
    width: (SIZES.width - 32) / 2 - 16,
    height: 36,
    borderRadius: 24,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderColor: COLORS.primary,
    borderWidth: 1.4,
    marginBottom: 12,
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.primary,
  },
  receiptBtn: {
    width: (SIZES.width - 32) / 2 - 16,
    height: 36,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderColor: COLORS.primary,
    borderWidth: 1.4,
    marginBottom: 12,
  },
  receiptBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.white,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  remindMeText: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginVertical: 4,
  },
  switch: {
    marginLeft: 8,
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], // Adjust the size of the switch
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
  },
  cancelButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 32,
  },
  removeButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.primary,
    borderRadius: 32,
  },
  bottomTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
    color: "red",
    textAlign: "center",
  },
  bottomSubtitle: {
    fontSize: 22,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginVertical: 12,
  },
  selectedCancelContainer: {
    marginVertical: 24,
    paddingHorizontal: 36,
    width: "100%",
  },
  cancelTitle: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    textAlign: "center",
  },
  cancelSubtitle: {
    fontSize: 14,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    textAlign: "center",
    marginVertical: 8,
    marginTop: 16,
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
  duration: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    textAlign: "center",
  },
  priceItemContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  reviewContainer: {
    position: "absolute",
    top: 6,
    right: 16,
    width: 46,
    height: 20,
    borderRadius: 16,
    backgroundColor: COLORS.transparentWhite2,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  rating: {
    fontSize: 12,
    fontFamily: "semiBold",
    color: COLORS.primary,
    marginLeft: 4,
  },
});

export default PasswordTab;
