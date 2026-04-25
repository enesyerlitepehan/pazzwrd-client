import { NavigationProp, RouteProp, useRoute } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import * as React from "react";
import { useCallback, useContext, useEffect, useReducer, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePasswordDetailSharing } from "./password-detail/usePasswordDetailSharing";
import Header from "../components/Header";
import PasswordDetailForm from "../components/PasswordDetailForm";
import PasswordGeneratorSheet, {
  PasswordGeneratorSheetRef,
} from "../components/PasswordGeneratorSheet";
import RBSheetShare, { RBSheetShareRef } from "../components/RBSheetShare";
import RBSheetUnshare, { RBSheetUnshareRef } from "../components/RBSheetUnshare";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES, icons } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useEntitlements } from "../store/entitlements-context";
import { useTheme } from "../theme/ThemeProvider";
import { useCopyToClipboard } from "../utils/copy";
import { reducer } from "../utils/reducers/formReducers";
import { getTimeUntilDeletionParts, formatTimeRemaining } from "../utils/trashUtils";
import type {
  Password,
  InputPassword,
  EncryptedPasswordPayload,
} from "../utils/types/passwordTypes";
import { toastBus } from "../utils/toastBus";
import { RootStackNavigationProp, RootStackRouteProp } from "../navigation/types";
import {
  DecryptedPasswordPayload,
  PasswordFormValues,
  buildFormValues,
  initialState,
} from "./password-detail/formState";
import { usePasswordDetailFormLifecycle } from "./password-detail/usePasswordDetailFormLifecycle";
import { usePasswordDetailHydration } from "./password-detail/usePasswordDetailHydration";
import { usePasswordDetailActions } from "./password-detail/usePasswordDetailActions";

const PasswordDetail = () => {
  const navigation = useNavigation<RootStackNavigationProp<"PasswordDetail">>();
  const authCtx = useContext(AuthContext);
  const route = useRoute<RootStackRouteProp<"PasswordDetail">>();
  const { colors } = useTheme();
  const readOnlyRoute = Boolean(route.params?.readOnly);
  const [syncType, setSyncType] = useState<"local" | "cloud">("cloud");
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult, setModalResult] = useState(false);
  const [modalScore, setModalScore] = useState<number | null>(null);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalConfirmMode, setModalConfirmMode] = useState(false);
  const [modalActionLabel, setModalActionLabel] = useState<string | undefined>(undefined);
  const [modalCancelLabel, setModalCancelLabel] = useState<string | undefined>(undefined);
  const [modalConfirmLabel, setModalConfirmLabel] = useState<string | undefined>(undefined);
  const [modalOnAction, setModalOnAction] = useState<(() => void) | undefined>(undefined);
  const [modalOnCancel, setModalOnCancel] = useState<(() => void) | undefined>(undefined);
  const [modalShowActionButton, setModalShowActionButton] = useState(false);

  const resetModal = useCallback(() => {
    setModalVisible(false);
    setModalResult(false);
    setModalScore(null);
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

  const { t } = useTranslation("common");

  const onConfirmUnsaved = useCallback(
    (onProceed: () => void) => {
      setModalTitle(t("unsaved.title"));
      setModalMsg(t("unsaved.message"));
      setModalConfirmMode(true);
      setModalCancelLabel(t("unsaved.no"));
      setModalConfirmLabel(t("unsaved.yes"));
      setModalOnAction(() => () => {
        onProceed();
        resetModal();
      });
      setModalOnCancel(() => resetModal);
      setModalVisible(true);
    },
    [t, resetModal],
  );
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const { updatePassword, addNewPassword, removePassword, getDEK, sharePassword } =
    useContext(AuthContext);
  const passwordData = route.params?.passwordData as Password | undefined;
  const isSharedView = Boolean((passwordData as any)?.isShared);
  const canShareCurrentPassword = !isSharedView && Boolean(passwordData?.sync);
  const readOnly = readOnlyRoute || isSharedView;
  const copy = useCopyToClipboard();

  const [sharedOwnerMail, setSharedOwnerMail] = useState<string | null>(null);
  const unshareSheetRef = useRef<RBSheetUnshareRef>(null);
  const shareSheetRef = useRef<RBSheetShareRef>(null);
  const genRef = useRef<PasswordGeneratorSheetRef>(null);

  const [formState, dispatchFormState] = useReducer(reducer, initialState);

  const {
    updatedValues,
    setUpdatedValues,
    initialValuesRef,
    hasUserEditedRef,
    ignoreNextRef,
    isDirty,
    inputChangedHandler,
    dispatchInitialFormState,
  } = usePasswordDetailFormLifecycle({
    passwordData,
    syncType,
    setSyncType,
    readOnly,
    dispatchFormState,
    onConfirmUnsaved,
  });

  usePasswordDetailHydration({
    passwordData,
    getDEK,
    hasUserEditedRef,
    setUpdatedValues,
    initialValuesRef,
    dispatchInitialFormState,
    setSharedOwnerMail,
    setIsLoading,
    setModalVisible,
    setModalMsg,
  });

  const {
    canCreatePasswordCloud,
    canCreatePasswordCloudAuto,
    canSharePassword,
    canSharePasswordAuto,
    refreshEntitlements,
  } = useEntitlements();

  const renderShareStatus = () => {
    if (!canShareCurrentPassword) return null;
    const statusText = (s: string) => {
      const key = `password.shareStatus.${String(s || "").toUpperCase()}`;
      const translated = t(key);
      return translated && translated !== key ? translated : s;
    };
    if (shareStatusLoading) {
      return (
        <View style={styles.shareStatusContainer}>
          <Text style={styles.shareStatusTitle}>{t("password.shareStatusLoading")}</Text>
        </View>
      );
    }
    if (!shareStatuses || shareStatuses.length === 0) return null;

    const Container: any = readOnly ? View : TouchableOpacity;
    const containerProps: any = readOnly ? {} : { onPress: openUnshareSheet, activeOpacity: 0.7 };

    return (
      <Container style={styles.shareStatusContainer} {...containerProps}>
        <Text style={styles.shareStatusTitle}>{t("password.sharedWith")}</Text>
        {shareStatuses.map((r, idx) => (
          <Text key={`${r.recipient}-${idx}`} style={styles.shareStatusRow}>
            {r.recipient} — {statusText(r.status)}
          </Text>
        ))}
      </Container>
    );
  };

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

  const {
    shareStatuses,
    shareStatusLoading,
    handleShareWithEmail,
    openUnshareSheet,
    handleRemoveRecipients,
  } = usePasswordDetailSharing({
    passwordData,
    canShareCurrentPassword,
    isSharedView,
    getDEK,
    canSharePasswordAuto,
    refreshEntitlements,
    t,
    showAlert,
    shareSheetRef,
    unshareSheetRef,
    setIsLoading,
    setModalVisible,
    setModalMsg,
    resetModal,
  });

  const { handleUpdatePassword, handleSyncTypeChange } = usePasswordDetailActions({
    passwordData,
    updatedValues,
    syncType,
    setSyncType,
    readOnly,
    getDEK,
    addNewPassword,
    updatePassword,
    removePassword,
    setIsLoading,
    setModalVisible,
    setModalResult,
    setModalScore,
    setModalMsg,
    setModalTitle,
    setModalConfirmMode,
    setModalCancelLabel,
    setModalConfirmLabel,
    setModalOnAction,
    setModalOnCancel,
    resetModal,
    showAlert,
    dispatchFormState,
    ignoreNextRef,
  });

  const renderPasswordDetail = () => {
    // Use the updatedValues state that tracks changes instead of static mappedInputValues
    const formInputValues = {
      name: updatedValues.name,
      userName: updatedValues.userName,
      password: updatedValues.password,
      url: updatedValues.url,
      notes: updatedValues.notes,
      tags: updatedValues.tags || "",
      expireDate: (updatedValues as any).expireDate,
      lastUpdated: updatedValues.updatedAt,
    };

    // Build info message for trash (read-only) view
    const infoMessage = (() => {
      if (!readOnly || !passwordData?.deletedAt) return undefined;
      const { parts } = getTimeUntilDeletionParts(passwordData.deletedAt);
      const timeStr = formatTimeRemaining(t, parts);
      return t("trash.info.password", { time: timeStr });
    })();

    const handleCopyUserName = () => {
      copy(formInputValues.userName || "", "username");
    };

    const handleCopyPassword = () => {
      copy(formInputValues.password || "", "password");
    };

    const handleCopyUrl = () => {
      copy(formInputValues.url || "", "url");
    };

    const openGenerator = () => {
      genRef.current?.open();
    };

    return (
      <PasswordDetailForm
        inputValues={formInputValues}
        inputValidities={formState.inputValidities}
        inputChangedHandler={inputChangedHandler}
        syncType={syncType}
        setSyncType={(next) => handleSyncTypeChange(next as any, inputChangedHandler)}
        scrollable={false}
        onSave={isSharedView ? undefined : handleUpdatePassword}
        isLoading={isLoading}
        buttonTitle={readOnly ? t("common.restore") : t("common.update")}
        readOnly={readOnly}
        hidePrimaryButton={isSharedView}
        sharedOwnerMail={isSharedView ? sharedOwnerMail : null}
        infoMessage={infoMessage}
        showPasswordPlusIcon={!readOnly}
        onPasswordPlusPress={openGenerator}
        showPasswordVisibilityIcon={true}
        onTogglePasswordVisibility={() => setIsPasswordHidden((prev) => !prev)}
        isPasswordHidden={isPasswordHidden}
        onCopyUserName={handleCopyUserName}
        onCopyPassword={handleCopyPassword}
        onCopyUrl={handleCopyUrl}
      />
    );
  };

  const handleModalAction = useCallback(() => {
    resetModal();
    ignoreNextRef.current = true;
    navigation.goBack();
  }, [navigation, resetModal]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {(passwordData as any)?.pendingOp ? (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>{t("password.pendingCloudUpdate")}</Text>
          </View>
        ) : null}
        <Header
          title={t("password.editPassword")}
          rightIcon={canShareCurrentPassword ? icons.shareOutline : undefined}
          onRightPress={async () => {
            if (!canShareCurrentPassword) return;
            const gate = await canSharePasswordAuto();
            if (!gate.allowed) {
              setModalTitle(t("password.shareTitle"));
              setModalMsg(gate.reason || t("alerts.shareNotAllowed"));
              setModalConfirmMode(true);
              setModalCancelLabel(t("common.cancel"));
              setModalConfirmLabel(t("upgrade.upgrade"));
              setModalOnAction(() => () => {
                resetModal();
                navigation.navigate("SettingsUpgrade");
              });
              setModalOnCancel(() => resetModal);
              setModalVisible(true);
              return;
            }
            try {
              shareSheetRef.current?.open();
            } catch {}
            try {
              const _ = sharePassword?.();
            } catch {}
          }}
        />
        {renderShareStatus()}
        {renderPasswordDetail()}
        <RBSheetShare ref={shareSheetRef} onShare={handleShareWithEmail} />
        <RBSheetUnshare ref={unshareSheetRef} onRemove={handleRemoveRecipients} />
        <PasswordGeneratorSheet
          ref={genRef}
          onConfirm={(pwd) => inputChangedHandler("password", pwd)}
        />
      </View>
      <LoadingModal
        visible={modalVisible}
        message={modalMsg}
        titleKey={modalTitle}
        showSpinner={isLoading && !modalResult && !modalConfirmMode}
        resultMode={modalResult}
        confirmMode={modalConfirmMode}
        opKind={
          modalResult && !modalConfirmMode && !modalTitle
            ? readOnly
              ? "create"
              : "update"
            : undefined
        }
        score={modalScore ?? undefined}
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
  shareStatusContainer: {
    backgroundColor: "#F1F5FF",
    borderWidth: 1,
    borderColor: "#D6E0FF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  shareStatusTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.greyscale900,
    marginBottom: 4,
  },
  shareStatusRow: {
    fontSize: 13,
    color: COLORS.grayscale700,
    marginBottom: 2,
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
  reviewHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  reviewHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  starIcon: {
    width: 16,
    height: 16,
  },
  starTitle: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.black2,
  },
  seeAll: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.primary,
  },
  // Styles for rating buttons
  ratingButtonContainer: {
    paddingVertical: 10,
    marginVertical: 12,
  },
  ratingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.4,
    borderColor: COLORS.primary,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  selectedRatingButton: {
    backgroundColor: COLORS.primary,
  },
  ratingButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    marginLeft: 10,
  },
  selectedRatingButtonText: {
    color: COLORS.white,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "bold",
    color: COLORS.primary,
    textAlign: "center",
    marginVertical: 12,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: "regular",
    color: COLORS.black,
    textAlign: "center",
    marginVertical: 12,
    marginHorizontal: 16,
  },
  modalContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSubContainer: {
    height: 622,
    width: SIZES.width * 0.86,
    backgroundColor: COLORS.white,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  backgroundIllustration: {
    height: 150,
    width: 150,
    marginVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalIllustration: {
    height: 150,
    width: 150,
  },
  modalInput: {
    width: "100%",
    height: 52,
    backgroundColor: COLORS.tansparentPrimary,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderColor: COLORS.primary,
    borderWidth: 1,
    marginVertical: 12,
  },
  editPencilIcon: {
    width: 42,
    height: 42,
    tintColor: COLORS.white,
    zIndex: 99999,
    position: "absolute",
    top: 54,
    left: 60,
  },
});

export default PasswordDetail;
