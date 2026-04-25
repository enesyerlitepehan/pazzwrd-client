import NetInfo from "@react-native-community/netinfo";
import { useEffect, Dispatch, SetStateAction } from "react";
import { AsyncStorage } from "../utils/userScopedStorage";
import { Connectivity } from "../types/security";

const STORAGE_KEYS = {
  connectivity: "security.connectivity",
};

export function useConnectivity(setConnectivity: Dispatch<SetStateAction<Connectivity>>) {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next: Connectivity = state.isConnected ? "ONLINE" : "OFFLINE";
      setConnectivity((prev) => {
        if (prev !== next) {
          AsyncStorage.setItem(STORAGE_KEYS.connectivity, next).catch(() => {});
        }
        return next;
      });
    });
    return unsubscribe;
  }, [setConnectivity]);
}
