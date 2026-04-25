import { useNavigation } from "expo-router";
import React, { useContext, useMemo, useState, useCallback } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiUpdateUserPassword } from "../api/api";
import Button from "../components/Button";
import ButtonFilled from "../components/ButtonFilled";
import Header from "../components/Header";
import InputWithTooltip from "../components/InputWithTooltip";
import { useToast } from "../components/ToastProvider";
import { COLORS, SIZES } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";

const UpdatePassword: React.FC = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const authCtx = useContext(AuthContext);

  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [hide, setHide] = useState({
    current: true,
    next: true,
    confirm: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      !isLoading &&
      values.currentPassword.length >= 1 &&
      values.newPassword.length >= 1 &&
      values.confirmPassword.length >= 1
    );
  }, [isLoading, values]);

  const onInputChanged = useCallback((id: string, text: string) => {
    setValues((prev) => ({ ...prev, [id]: text }));
  }, []);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleUpdate = useCallback(async () => {
    if (values.newPassword !== values.confirmPassword) {
      toast.show("New password and confirm password do not match");
      return;
    }
    if (values.newPassword.length < 6) {
      toast.show("New password must be at least 6 characters");
      return;
    }
    try {
      setIsLoading(true);
      const res = await apiUpdateUserPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (
        res.status === 200 &&
        (res.code === "PASSWORD_UPDATED" || res.message === "Password updated successfully")
      ) {
        toast.show("Password updated successfully");
        navigation.goBack();
      } else if (res.status === 401) {
        toast.show(res.message || "Current password is not correct");
      } else if (res.status === 403) {
        toast.show("Validation error: please check your inputs");
      } else if (res.status === 404) {
        toast.show("User not found");
      } else {
        toast.show(res?.message || "Update failed. Please try again");
      }
    } catch (e) {
      toast.show("Unexpected error. Please try again");
    } finally {
      setIsLoading(false);
    }
  }, [authCtx.accessToken, navigation, toast, values]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Update Password" />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.center, { paddingBottom: 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <InputWithTooltip
            id="currentPassword"
            onInputChanged={onInputChanged}
            placeholder="Current password"
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            tooltipInfo="Enter your current account password"
            secureTextEntry={hide.current}
            showVisibilityToggle
            onToggleVisibility={() => setHide((p) => ({ ...p, current: !p.current }))}
            value={values.currentPassword}
          />

          <InputWithTooltip
            id="newPassword"
            onInputChanged={onInputChanged}
            placeholder="New password"
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            tooltipInfo="Enter the new password for your account"
            secureTextEntry={hide.next}
            showVisibilityToggle
            onToggleVisibility={() => setHide((p) => ({ ...p, next: !p.next }))}
            value={values.newPassword}
          />

          <InputWithTooltip
            id="confirmPassword"
            onInputChanged={onInputChanged}
            placeholder="Confirm new password"
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            tooltipInfo="Re-enter the new password"
            secureTextEntry={hide.confirm}
            showVisibilityToggle
            onToggleVisibility={() => setHide((p) => ({ ...p, confirm: !p.confirm }))}
            value={values.confirmPassword}
          />
        </ScrollView>
      </View>

      <View style={styles.bottomContainer}>
        <Button
          title="Cancel"
          style={{
            width: (SIZES.width - 32) / 2 - 8,
            borderRadius: 32,
            backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
            borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
          }}
          textColor={dark ? COLORS.white : COLORS.black}
          onPress={handleCancel}
        />
        <ButtonFilled
          title="Update"
          style={styles.updateButton}
          onPress={handleUpdate}
          isLoading={isLoading}
          disabled={!canSubmit}
        />
      </View>
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
  center: {
    flex: 1,
    justifyContent: "center",
    marginBottom: 144,
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
  updateButton: {
    width: (SIZES.width - 32) / 2 - 8,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});

export default UpdatePassword;
