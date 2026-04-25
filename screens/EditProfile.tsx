import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import React, { useCallback, useEffect, useReducer, useState, useContext } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { getFormatedDate } from "react-native-modern-datepicker";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonFilled from "../components/ButtonFilled";
import DatePickerModal from "../components/DatePickerModal";
import Header from "../components/Header";
import InputWithTooltip from "../components/InputWithTooltip";
import LoadingModal from "../components/ui/LoadingModal";
import { COLORS, SIZES, FONTS, icons } from "../constants";
import { AuthContext } from "../store/auth-context";
import { useTheme } from "../theme/ThemeProvider";
import { validateInput } from "../utils/actions/formActions";
import { launchImagePicker } from "../utils/ImagePickerHelper";
import { reducer } from "../utils/reducers/formReducers";

const initialState = {
  inputValues: {
    fullName: "",
    email: "",
    nickname: "",
  },
  inputValidities: {
    fullName: false,
    email: false,
    nickname: false,
  },
  formIsValid: false,
};

const EditProfile = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { dark } = useTheme();
  const authCtx = useContext(AuthContext);

  const [formState, dispatchFormState] = useReducer(reducer, initialState);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [image, setImage] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalResult, setModalResult] = useState(false);
  const [modalOnAction, setModalOnAction] = useState<(() => void) | undefined>(undefined);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const showAlert = (
    title: string,
    message: string,
    result: boolean = true,
    onAction?: () => void,
  ) => {
    setModalTitle(title);
    setModalMsg(message);
    setModalResult(result);
    setModalOnAction(() => onAction);
    setModalVisible(true);
  };

  const inputChangedHandler = useCallback((inputId: string, inputValue: string) => {
    const result = validateInput(inputId, inputValue);
    dispatchFormState({
      inputId,
      validationResult: result,
      inputValue,
    });
  }, []);

  // Fetch user on mount
  useEffect(() => {
    async function loadUser() {
      setIsLoadingProfile(true);
      try {
        const res = await authCtx.getUser();
        if (res && res.ok && res.data) {
          const user = res.data;
          if (user.fullName) inputChangedHandler("fullName", user.fullName);
          if (user.nickname) inputChangedHandler("nickname", user.nickname);
          if (user.mail) inputChangedHandler("email", user.mail);
          if (user.dateOfBirth) {
            const d = new Date(user.dateOfBirth);
            const formatted = getFormatedDate(d, "YYYY/MM/DD");
            setDateOfBirth(formatted);
          }
        }
      } catch (e) {
        showAlert("Error", "Failed to load user information");
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadUser();
  }, [authCtx, inputChangedHandler]);

  const pickImage = async () => {
    try {
      const tempUri = await launchImagePicker();
      if (!tempUri) return;
      setImage({ uri: tempUri });
    } catch (error) {}
  };

  const handleOnPressDOB = () => {
    setOpenDatePicker(true);
  };

  const onUpdate = async () => {
    try {
      const payload: any = {
        fullName: formState.inputValues.fullName,
        nickname: formState.inputValues.nickname,
      };
      if (dateOfBirth) payload.dateOfBirth = dateOfBirth;

      const res = await authCtx.updateUser(payload);
      if (res?.ok) {
        showAlert("Success", "Profile updated successfully", true, () => navigation.goBack());
      } else {
        showAlert("Update failed", res?.message || "Please try again");
      }
    } catch (e) {
      showAlert("Error", "Failed to update profile");
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
      <View style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
        <Header title="Edit Profile" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View style={{ alignItems: "center", marginVertical: 12 }}>
            <View style={styles.avatarContainer}>
              <Image
                source={image === null ? icons.userDefault2 : image}
                resizeMode="cover"
                style={styles.avatar}
              />
              <TouchableOpacity onPress={pickImage} style={styles.pickImage}>
                <MaterialCommunityIcons name="pencil-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
          <View>
            <InputWithTooltip
              id="fullName"
              onInputChanged={inputChangedHandler}
              errorText={formState.inputValidities["fullName"] as any}
              placeholder="Full Name"
              placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
              value={formState.inputValues.fullName}
            />
            <InputWithTooltip
              id="nickname"
              onInputChanged={inputChangedHandler}
              errorText={formState.inputValidities["nickname"] as any}
              placeholder="Nickname"
              placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
              value={formState.inputValues.nickname}
            />
            <InputWithTooltip
              id="email"
              onInputChanged={inputChangedHandler}
              errorText={formState.inputValidities["email"] as any}
              placeholder="Email"
              placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
              keyboardType="email-address"
              editable={false}
              value={formState.inputValues.email}
            />
            <View style={{ width: SIZES.width - 32 }}>
              <TouchableOpacity
                style={[
                  styles.inputBtn,
                  {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                    borderColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                  },
                ]}
                onPress={handleOnPressDOB}
              >
                <Text style={{ ...FONTS.body4, color: COLORS.grayscale400 }}>
                  {dateOfBirth || "Date of Birth"}
                </Text>
                <Feather name="calendar" size={24} color={COLORS.grayscale400} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
      <DatePickerModal
        open={openDatePicker}
        startDate={getFormatedDate(new Date(), "YYYY/MM/DD")}
        selectedDate={dateOfBirth}
        onClose={() => setOpenDatePicker(false)}
        onChangeStartDate={(date) => setDateOfBirth(date)}
      />
      <View style={styles.bottomContainer}>
        <ButtonFilled title="Update" style={styles.continueButton} onPress={onUpdate} />
      </View>
      <LoadingModal
        visible={isLoadingProfile || modalVisible}
        message={isLoadingProfile ? undefined : modalMsg}
        messageKey={isLoadingProfile ? "loading.default" : undefined}
        titleKey={isLoadingProfile ? undefined : modalTitle}
        resultMode={isLoadingProfile ? false : modalResult}
        showActionButton={isLoadingProfile ? false : modalResult}
        onAction={() => {
          setModalVisible(false);
          if (modalOnAction) modalOnAction();
        }}
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
    padding: 16,
    backgroundColor: COLORS.white,
  },
  avatarContainer: {
    marginVertical: 12,
    alignItems: "center",
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  avatar: {
    height: 130,
    width: 130,
    borderRadius: 65,
  },
  pickImage: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 0,
    right: 0,
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

export default EditProfile;
