import { NavigationProp, RouteProp, useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useContext, useReducer, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCardDetailLifecycle } from "./card-detail/useCardDetailLifecycle";
import { initialCardFormState } from "./card-detail/formState";
import CardDetailForm from "../components/CardDetailForm";
import Header from "../components/Header";
import LoadingModal from "../components/ui/LoadingModal";
import WalletCard from "../components/WalletCard";
import { COLORS, SIZES, icons } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useEntitlements } from "../store/entitlements-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateInput } from "../utils/actions/formActions";
import { formatCardNumber, detectCardType, CardType } from "../utils/cardUtils";
import { reducer } from "../utils/reducers/formReducers";
import { getTimeUntilDeletionParts, formatTimeRemaining } from "../utils/trashUtils";
import { useCardDetailActions } from "./card-detail/useCardDetailActions";
import { RootStackNavigationProp, RootStackRouteProp } from "../navigation/types";

// No longer using test mode as we'll use real data
const isTestMode = false;

const CardDetail = () => {
  const navigation = useNavigation<RootStackNavigationProp<"CardDetail">>();
  const route = useRoute<RootStackRouteProp<"CardDetail">>();
  const { colors } = useTheme();
  const readOnly = Boolean(route.params?.readOnly);
  const { createCard, removeCard, updateCard, getDEK } = useContext(AuthContext);
  const [formState, dispatchFormState] = useReducer(reducer, initialCardFormState);
  const [isLoading, setIsLoading] = useState(false);
  const { canCreateCardCloudAuto } = useEntitlements();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult, setModalResult] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalConfirmMode, setModalConfirmMode] = useState(false);
  const [modalActionLabel, setModalActionLabel] = useState<string | undefined>(undefined);
  const [modalCancelLabel, setModalCancelLabel] = useState<string | undefined>(undefined);
  const [modalConfirmLabel, setModalConfirmLabel] = useState<string | undefined>(undefined);
  const [modalOnAction, setModalOnAction] = useState<(() => void) | undefined>(undefined);
  const [modalOnCancel, setModalOnCancel] = useState<(() => void) | undefined>(undefined);
  const [modalShowActionButton, setModalShowActionButton] = useState(false);
  const { t } = useTranslation("common");

  const resetModal = useCallback(() => {
    setModalVisible(false);
    setModalResult(false);
    setModalMsg(undefined);
    setModalTitle(undefined);
    setModalConfirmMode(false);
    setModalActionLabel(undefined);
    setModalCancelLabel(undefined);
    setModalConfirmLabel(undefined);
    setModalOnAction(undefined);
    setModalOnCancel(undefined);
    setModalShowActionButton(false);
  }, []);

  const showUpgradeConfirm = useCallback(
    (reason?: string) => {
      setModalTitle(t("alerts.information"));
      setModalMsg(reason || t("alerts.cloudNotAllowed"));
      setModalConfirmMode(true);
      setModalCancelLabel(t("common.cancel"));
      setModalConfirmLabel(t("upgrade.upgrade"));
      setModalOnAction(() => () => {
        resetModal();
        navigation.navigate("SettingsUpgrade");
      });
      setModalOnCancel(() => resetModal);
      setModalVisible(true);
    },
    [t, resetModal, navigation],
  );

  const {
    cardId,
    syncType,
    setSyncType,
    initialValuesRef,
    hasUserEditedRef,
    ignoreNextRef,
    isDirty,
    handleSyncTypeChange: hookHandleSyncTypeChange,
  } = useCardDetailLifecycle({
    formState: formState as any,
    dispatchFormState,
    navigation,
    route,
    getDEK,
    readOnly,
    onBeforeRemove: (e) => onBeforeRemoveRef.current?.(e),
    onCloudNotAllowed: showUpgradeConfirm,
  });

  const onBeforeRemoveRef = useRef<any>(null);

  const handleModalAction = useCallback(() => {
    resetModal();
    ignoreNextRef.current = true;
    navigation.goBack();
  }, [navigation, resetModal, ignoreNextRef]);

  const onBeforeRemove = useCallback(
    (e: any) => {
      e.preventDefault();
      setModalTitle(t("unsaved.title"));
      setModalMsg(t("unsaved.message"));
      setModalConfirmMode(true);
      setModalCancelLabel(t("unsaved.no"));
      setModalConfirmLabel(t("unsaved.yes"));
      setModalOnAction(() => () => {
        ignoreNextRef.current = true;
        // @ts-ignore
        navigation.dispatch(e.data.action);
        resetModal();
      });
      setModalOnCancel(() => resetModal);
      setModalVisible(true);
    },
    [navigation, resetModal, t, ignoreNextRef],
  );
  onBeforeRemoveRef.current = onBeforeRemove;

  const showAlert = useCallback(
    (title: string, message: string) => {
      setModalTitle(title);
      setModalMsg(message);
      setModalResult(true);
      setModalShowActionButton(true);
      setModalOnAction(() => resetModal);
      setModalVisible(true);
    },
    [resetModal],
  );

  const inputChangedHandler = useCallback(
    (inputId: string, inputValue: string) => {
      hasUserEditedRef.current = true;
      if (inputId === "cardNumber") {
        const formattedValue = formatCardNumber(inputValue);
        const result = validateInput(inputId, formattedValue);

        // Detect card type from the card number
        const detectedCardType = detectCardType(formattedValue);

        // Update card number input
        dispatchFormState({
          inputId,
          validationResult: result,
          inputValue: formattedValue,
        });

        // Also update the card type automatically
        if (detectedCardType !== CardType.UNKNOWN) {
          dispatchFormState({
            inputId: "cardType",
            validationResult: undefined,
            inputValue: detectedCardType,
          });
        }
      } else {
        const result = validateInput(inputId, inputValue);
        dispatchFormState({
          inputId,
          validationResult: result,
          inputValue,
        });
      }
    },
    [dispatchFormState],
  );

  /**
   * Render header
   */
  const renderHeader = () => {
    return <Header title="Edit Cards" rightIcon={icons.shareOutline} />;
  };

  // Handle sync type change
  const handleSyncTypeChange = async (id: string, option: string) => {
    await hookHandleSyncTypeChange(id, option);
  };

  // Handle save/update button press
  const { handleUpdateCard } = useCardDetailActions({
    cardData: route.params?.cardData,
    cardId,
    formState,
    syncType,
    setSyncType,
    readOnly,
    getDEK,
    createCard,
    updateCard,
    removeCard,
    setIsLoading,
    setModalVisible,
    setModalResult,
    setModalMsg,
    setModalTitle,
    setModalConfirmMode,
    setModalCancelLabel,
    setModalConfirmLabel,
    setModalOnAction,
    setModalOnCancel,
    resetModal,
    showAlert,
    showUpgradeConfirm,
    inputChangedHandler,
  });

  // Format card number for display
  let displayCardNumber = "•••• •••• •••• ••••";
  if (formState.inputValues.cardNumber) {
    displayCardNumber = formState.inputValues.cardNumber;
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {route.params?.cardData?.pendingOp ? (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>Your changes did not updated yet at cloud.</Text>
          </View>
        ) : null}
        {renderHeader()}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 100 }} // Add padding to ensure content is not hidden by the bottom button
        >
          <WalletCard
            cardHolderName={formState.inputValues.cardHolderName}
            cardNumber={displayCardNumber}
            cardType={formState.inputValues.cardType}
            expiryDate={formState.inputValues.expiryDate}
            cvv={formState.inputValues.cvv}
          />

          {(() => {
            const infoMessage = (() => {
              const deletedAt = route.params?.cardData?.deletedAt;
              if (!readOnly || !deletedAt) return undefined;
              const { parts } = getTimeUntilDeletionParts(deletedAt);
              const timeStr = formatTimeRemaining(t, parts);
              return t("trash.info.card", { time: timeStr });
            })();
            return (
              <CardDetailForm
                formState={formState}
                onInputChanged={inputChangedHandler}
                syncType={syncType}
                onSyncTypeChanged={handleSyncTypeChange}
                onSave={handleUpdateCard}
                isLoading={isLoading}
                buttonTitle="Update"
                readOnly={readOnly}
                infoMessage={infoMessage}
              />
            );
          })()}
        </ScrollView>
      </View>
      <LoadingModal
        visible={modalVisible}
        message={modalMsg}
        titleKey={modalTitle}
        showSpinner={isLoading && !modalResult && !modalConfirmMode}
        resultMode={modalResult}
        confirmMode={modalConfirmMode}
        itemType="card"
        opKind={modalResult && !modalConfirmMode && !modalTitle ? "update" : undefined}
        showActionButton={modalResult || modalConfirmMode || modalShowActionButton}
        onAction={modalOnAction || handleModalAction}
        onCancel={modalOnCancel || (() => setModalVisible(false))}
        actionLabel={modalActionLabel}
        cancelLabel={modalCancelLabel}
        confirmLabel={modalConfirmLabel}
      />
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
  pendingBanner: {
    backgroundColor: "#FFEDED",
    borderBottomWidth: 1,
    borderBottomColor: "#E0B3B3",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pendingText: {
    color: "#8A1C1C",
  },
  headerContainer: {
    flexDirection: "row",
    width: SIZES.width - 32,
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "bold",
    color: COLORS.black,
    marginLeft: 16,
  },
  shareIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black,
  },
  cardContainer: {
    width: SIZES.width - 32,
    borderRadius: 32,
    marginTop: 16,
    height: 212,
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
  cardType: {
    fontSize: 26,
    color: COLORS.white,
    fontFamily: "extraBoldItalic",
  },
  cardLogo: {
    height: 52,
    width: 52,
    marginLeft: 6,
  },
  balanceText: {
    fontSize: 18,
    color: COLORS.white,
    fontFamily: "medium",
  },
  bottomCardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
  },
  amountNumber: {
    fontSize: 42,
    color: COLORS.white,
    fontFamily: "bold",
  },
  topupBtn: {
    width: 132,
    height: 42,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  arrowDown: {
    width: 16,
    height: 16,
    tintColor: COLORS.black,
  },
  topupBtnText: {
    fontSize: 16,
    color: COLORS.black,
    fontFamily: "semiBold",
    marginLeft: 12,
  },
  inputBtn: {
    borderWidth: 1,
    borderRadius: 12,
    borderColor: COLORS.greyscale500,
    height: 50,
    paddingLeft: 8,
    fontSize: 18,
    justifyContent: "space-between",
    marginTop: 4,
    backgroundColor: COLORS.greyscale500,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  inputContainer: {
    flexDirection: "row",
    borderColor: COLORS.greyscale500,
    borderWidth: 0.4,
    borderRadius: 6,
    height: 52,
    width: SIZES.width - 32,
    alignItems: "center",
    marginVertical: 16,
    backgroundColor: COLORS.greyscale500,
  },
  selectFlagContainer: {
    width: 90,
    height: 50,
    marginHorizontal: 5,
    flexDirection: "row",
  },
  downIcon: {
    width: 10,
    height: 10,
    tintColor: "#111",
  },
  flagIcon: {
    width: 30,
    height: 30,
  },
  input: {
    flex: 1,
    marginVertical: 10,
    height: 40,
    fontSize: 14,
    color: "#111",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 32,
    right: 16,
    left: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    width: SIZES.width - 32,
    alignItems: "center",
  },
  continueButton: {
    width: SIZES.width - 32,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});

export default CardDetail;
