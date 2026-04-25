import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export const launchImagePicker = async (): Promise<string | undefined> => {
  await checkMediaPermissions();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
};

const checkMediaPermissions = async (): Promise<void> => {
  if (Platform.OS !== "web") {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      return Promise.reject("We need permission to access your photos");
    }
  }

  return Promise.resolve();
};
