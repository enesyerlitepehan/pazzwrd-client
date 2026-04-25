import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { EmailStatus } from "../../types/security";
import { AsyncStorage } from "../../utils/userScopedStorage";
import { images } from "../../constants";

export function useHomeHeaderState(userData: any, setEmailStatus: (status: EmailStatus) => void) {
  const [fullName, setFullName] = useState<string>("");
  const [now, setNow] = useState<Date>(new Date());
  const [headerAvatar, setHeaderAvatar] = useState<any>(null);

  useEffect(() => {
    if (userData) {
      const name = userData.fullName || userData.userName || "";
      setFullName(name);
      const activated = userData.activate;
      if (typeof activated === "boolean") {
        setEmailStatus(activated ? "VERIFIED" : "UNVERIFIED");
      }
    }
  }, [userData, setEmailStatus]);

  const loadHeaderAvatar = useCallback(async () => {
    try {
      const AVATAR_URI_KEY = "avatarUri";
      const AVATAR_DEFAULT_INDEX_KEY = "avatarDefaultIndex";
      const savedUri = await AsyncStorage.getItem(AVATAR_URI_KEY);
      if (savedUri) {
        setHeaderAvatar({ uri: savedUri });
        return;
      }
      const idxStr = await AsyncStorage.getItem(AVATAR_DEFAULT_INDEX_KEY);
      const defaultAvatars = [
        images.user1,
        images.user2,
        images.user3,
        images.user4,
        images.user5,
        images.user6,
        images.user7,
        images.user8,
        images.user9,
        images.user10,
      ];
      const idx = idxStr != null ? Number(idxStr) : NaN;
      if (!Number.isNaN(idx) && defaultAvatars[idx]) {
        setHeaderAvatar(defaultAvatars[idx]);
      } else {
        setHeaderAvatar(images.user1);
      }
    } catch {
      setHeaderAvatar(images.user1);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      loadHeaderAvatar();

      const interval = setInterval(() => {
        setNow(new Date());
      }, 60 * 1000);

      return () => {
        clearInterval(interval);
      };
    }, [loadHeaderAvatar]),
  );

  useEffect(() => {
    loadHeaderAvatar();
  }, [loadHeaderAvatar]);

  return { fullName, now, headerAvatar };
}
