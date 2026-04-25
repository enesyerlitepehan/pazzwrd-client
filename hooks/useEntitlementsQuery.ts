import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { apiGetEntitlements } from "../api/api";
import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";
import { isOffline } from "../utils/network";
import { getItem as getUserItem, AsyncStorage } from "../utils/userScopedStorage";
import { EntitlementsData } from "../store/entitlements-context";

const STORAGE_KEY = "entitlements";

export function useEntitlementsQuery(enabled: boolean = true) {
  const { userId } = useContext(AuthContext);

  return useQuery({
    queryKey: [userId, QUERY_KEYS.ENTITLEMENTS],
    queryFn: async () => {
      // 1. Check offline status
      const offline = await isOffline();

      // 2. If offline, try to get from AsyncStorage
      if (offline) {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          return JSON.parse(cached) as EntitlementsData;
        }
        return null;
      }

      // 3. If online, fetch from API
      const resp = await apiGetEntitlements();
      if (resp && resp.ok && resp.data) {
        // 4. Update AsyncStorage cache
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(resp.data));
        return resp.data as EntitlementsData;
      }

      // 5. Fallback to cache if API fails
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached) as EntitlementsData;
      }

      return null;
    },
    enabled,
  });
}
