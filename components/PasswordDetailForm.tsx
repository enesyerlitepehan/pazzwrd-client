import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";

import { COLORS, SIZES } from "../constants";
import { computePasswordStrength } from "../utils/passwordStrength";
import { useTheme } from "../theme/ThemeProvider";

import ButtonFilled from "./ButtonFilled";
import InputWithTooltip from "./InputWithTooltip";
import RBSheetExpireDate, { RBSheetExpireDateRef } from "./RBSheetExpireDate";
import SegmentedControl from "./SegmentedControl";
import SharedByNotice from "./SharedByNotice";

interface PasswordDetailFormProps {
  // Form state and handlers
  inputValues: {
    name?: string;
    userName?: string;
    password?: string;
    url?: string;
    notes?: string;
    tags?: string;
    expireDate?: string;
    lastUpdated?: string;
  };
  inputValidities?: {
    [key: string]: string | boolean | undefined;
  };
  inputChangedHandler: (inputId: string, inputValue: string) => void;

  // UI options
  // dark prop removed, use useTheme() internally

  // Sync options
  syncType: "local" | "cloud";
  setSyncType: (type: "local" | "cloud") => void;

  // Password visibility
  isPasswordHidden?: boolean;

  // Scroll options
  scrollable?: boolean;

  // Last updated field visibility
  showLastUpdated?: boolean;

  // Action button (Save/Update/Restore)
  onSave?: () => void; // Preferred new prop
  isLoading?: boolean;
  buttonTitle?: string; // Optional title, can be localized or key

  // Backward compatibility (deprecated)
  onUpdate?: () => void;
  showUpdateButton?: boolean;

  // Password generator plus icon
  showPasswordPlusIcon?: boolean;
  onPasswordPlusPress?: () => void;

  // Password visibility toggle icon
  showPasswordVisibilityIcon?: boolean;
  onTogglePasswordVisibility?: () => void;

  // Read-only mode
  readOnly?: boolean;
  // Hide the primary action button (e.g., for shared read-only views)
  hidePrimaryButton?: boolean;
  // If provided, shows a banner indicating who shared the password (recipient view only)
  sharedOwnerMail?: string | null;

  // Info message (e.g., trash auto-delete notice)
  infoMessage?: string;

  // Copy handlers
  onCopyUserName?: () => void;
  onCopyPassword?: () => void;
  onCopyUrl?: () => void;
}

const PasswordDetailForm: React.FC<PasswordDetailFormProps> = ({
  inputValues,
  inputValidities,
  inputChangedHandler,
  syncType,
  setSyncType,
  isPasswordHidden = true,
  scrollable = true,
  showLastUpdated = true,
  onSave,
  isLoading = false,
  buttonTitle,
  // backward compatible props
  onUpdate,
  showUpdateButton = false,
  showPasswordPlusIcon = false,
  onPasswordPlusPress,
  showPasswordVisibilityIcon = false,
  onTogglePasswordVisibility,
  readOnly = false,
  hidePrimaryButton = false,
  infoMessage,
  onCopyUserName,
  onCopyPassword,
  onCopyUrl,
  sharedOwnerMail,
}) => {
  const { colors, dark } = useTheme();
  const { t } = useTranslation("common");
  const refRBSheet = useRef<RBSheetExpireDateRef>(null);
  const segAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Animate segment fills and weak pulse
  const score = computePasswordStrength(inputValues.password || "", {
    t,
  }).score;
  const level = score >= 70 ? 3 : score >= 40 ? 2 : score > 0 ? 1 : 0;

  React.useEffect(() => {
    segAnim.forEach((av, idx) => {
      const target = idx < level ? 1 : 0;
      Animated.timing(av, {
        toValue: target,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    // Weak pulse (level===1)
    if (level === 1) {
      // start loop if not running
      if (!pulseLoopRef.current) {
        pulseLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 0.6,
              duration: 420,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 420,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        );
        pulseLoopRef.current.start();
      }
    } else {
      // stop loop when not weak
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
      pulseAnim.setValue(1);
    }
  }, [level, segAnim, pulseAnim]);

  const renderExpireDateSheet = () => (
    <RBSheetExpireDate
      ref={refRBSheet}
      dark={dark}
      onApply={(date) => {
        inputChangedHandler("expireDate", date);
      }}
    />
  );

  const renderContent = () => (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {sharedOwnerMail ? <SharedByNotice email={sharedOwnerMail} /> : null}
        {infoMessage ? (
          <View
            style={{
              backgroundColor: COLORS.secondary + "22",
              borderColor: COLORS.secondary,
              borderWidth: StyleSheet.hairlineWidth,
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.text }}>
              {t("common.information")}: {infoMessage}
            </Text>
          </View>
        ) : null}
        <SegmentedControl
          id="syncType"
          options={["local", "cloud"]}
          selectedOption={syncType}
          onSelectionChanged={(id, option) => {
            setSyncType(option as "local" | "cloud");
            inputChangedHandler(id, option);
          }}
          labelMap={{ local: t("sync.local"), cloud: t("sync.cloud") }}
          tooltipInfo={t("password.tooltips.sync")}
          disabled={readOnly}
        />
        <InputWithTooltip
          id="name"
          onInputChanged={inputChangedHandler}
          placeholder={t("password.name")}
          errorText={
            inputValidities && typeof inputValidities["name"] === "string"
              ? inputValidities["name"]
              : undefined
          }
          placeholderTextColor={colors.inputPlaceholder}
          tooltipInfo={t("password.tooltips.name")}
          value={inputValues.name}
          editable={!readOnly}
          showDoneButton={!readOnly}
        />
        <InputWithTooltip
          id="userName"
          onInputChanged={inputChangedHandler}
          placeholder={t("password.username")}
          placeholderTextColor={colors.inputPlaceholder}
          tooltipInfo={t("password.tooltips.username")}
          value={inputValues.userName}
          editable={!readOnly}
          showCopyIcon={Boolean(onCopyUserName)}
          onCopyPress={onCopyUserName}
          showDoneButton={!readOnly}
        />
        <InputWithTooltip
          id="password"
          onInputChanged={inputChangedHandler}
          placeholder={t("password.password")}
          placeholderTextColor={colors.inputPlaceholder}
          tooltipInfo={t("password.tooltips.password")}
          secureTextEntry={isPasswordHidden}
          value={inputValues.password}
          showVisibilityToggle={showPasswordVisibilityIcon}
          onToggleVisibility={onTogglePasswordVisibility}
          showPlusIcon={showPasswordPlusIcon && !readOnly}
          onPlusPress={onPasswordPlusPress}
          editable={!readOnly}
          showCopyIcon={Boolean(onCopyPassword)}
          onCopyPress={onCopyPassword}
          showDoneButton={!readOnly}
        />
        {/* Password strength preview (UI-only): compact bar right under the input */}
        {!readOnly && (
          <View style={styles.strengthCompact}>
            {(() => {
              const activeColor = level >= 3 ? "#2ecc71" : level === 2 ? "#f1c40f" : "#e74c3c";
              const baseColor = colors.surfaceAlternative;
              return (
                <View style={styles.strengthSegmentsRow}>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <View
                      key={`seg-${idx}`}
                      style={[
                        styles.strengthSegment,
                        idx < 2 ? { marginRight: 4 } : null,
                        { backgroundColor: baseColor },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.strengthSegmentFill,
                          {
                            backgroundColor: activeColor,
                            opacity: level === 1 ? pulseAnim : 1,
                            transform: [{ scaleX: segAnim[idx] }],
                          },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}
        <InputWithTooltip
          id="url"
          onInputChanged={inputChangedHandler}
          placeholder={t("password.url")}
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType="url"
          tooltipInfo={t("password.tooltips.url")}
          value={inputValues.url}
          editable={!readOnly}
          showCopyIcon={Boolean(onCopyUrl)}
          onCopyPress={onCopyUrl}
          showDoneButton={!readOnly}
        />
        <InputWithTooltip
          id="notes"
          onInputChanged={inputChangedHandler}
          placeholder={t("password.notes")}
          placeholderTextColor={colors.inputPlaceholder}
          tooltipInfo={t("password.tooltips.notes")}
          value={inputValues.notes}
          editable={!readOnly}
          showDoneButton={!readOnly}
        />
        {/* TEMP: hide tags field in v1
        {readOnly && (
          <InputWithTooltip
            id="tags"
            onInputChanged={inputChangedHandler}
            placeholder={t("password.tags")}
            placeholderTextColor={colors.inputPlaceholder}
            tooltipInfo={t("password.tooltips.tags")}
            value={inputValues.tags}
            editable={!readOnly}
          />
        )}
        */}
        {/* TEMP: hide expire date field in v1
        {readOnly && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              console.log("readOnly: ", readOnly);
              if (!readOnly) {
                refRBSheet.current?.open();
              }
            }}
          >
            <InputWithTooltip
              id="expireDate"
              onInputChanged={inputChangedHandler}
              placeholder={t("password.expireDate")}
              placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
              tooltipInfo={t("password.tooltips.expireDate")}
              value={inputValues.expireDate}
              editable={false}
            />
          </TouchableOpacity>
        )}
        */}
        {showLastUpdated && (
          <InputWithTooltip
            id="lastUpdated"
            onInputChanged={inputChangedHandler}
            placeholder={t("password.lastUpdated")}
            placeholderTextColor={colors.inputPlaceholder}
            tooltipInfo={t("password.tooltips.lastUpdated")}
            value={inputValues.lastUpdated}
            editable={false}
          />
        )}
      </ScrollView>
      {renderExpireDateSheet()}
    </View>
  );

  const renderMainActionButton = () => {
    if (hidePrimaryButton) return null;

    const title = isLoading
      ? t("common.saving")
      : readOnly
        ? "Restore"
        : (() => {
            if (!buttonTitle) return t("common.save");
            const normalized = buttonTitle.trim().toLowerCase();
            if (normalized === "update") return t("common.update");
            if (normalized === "save") return t("common.save");
            return buttonTitle;
          })();

    const handlePress = () => {
      if (onSave) return onSave();
      if (onUpdate) return onUpdate();
    };

    if (!onSave && !onUpdate && !showUpdateButton) return null;

    return (
      <View style={styles.bottomContainer}>
        <ButtonFilled
          title={title}
          style={styles.updateButton}
          onPress={handlePress}
          disabled={isLoading}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {renderContent()}
      {renderMainActionButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomContainer: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  updateButton: {
    width: SIZES.width - 32,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  strengthCompact: {
    marginTop: -4, // visually attach to input container
    marginBottom: 12,
  },
  strengthSegmentsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  strengthSegment: {
    flex: 1,
    height: 6,
    borderRadius: 4,
  },
  strengthSegmentFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    // start collapsed and scale on X
    transform: [{ scaleX: 0 }],
    borderRadius: 4,
  },
});

export default PasswordDetailForm;
