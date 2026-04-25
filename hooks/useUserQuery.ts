import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { getUser } from "../api/api";
import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";
import { isOffline } from "../utils/network";
import { AsyncStorage } from "../utils/userScopedStorage";

const STORAGE_KEY = "user_profile";

export function useUserQuery(enabled: boolean = true) {
  const { userId } = useContext(AuthContext);

  return useQuery({
    queryKey: [userId, QUERY_KEYS.USER],
    queryFn: async () => {
      const offline = await isOffline();

      if (offline) {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        return cached ? JSON.parse(cached) : null;
      }

      const resp = await getUser();
      if (resp && resp.ok && resp.data) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(resp.data));
        return resp.data;
      }

      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    },
    enabled,
  });
}
