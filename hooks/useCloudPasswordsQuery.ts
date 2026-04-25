import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { getAllPassword } from "../api/api";
import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";
import { isOffline } from "../utils/network";
import { AsyncStorage } from "../utils/userScopedStorage";
import { saveCloudPasswords, getCloudPasswordsCache } from "../utils/passwordUtils";
import { sortItemsNewestFirst } from "../utils/util";
import { syncPendingQueues } from "../utils/syncService";
import { getItem as getUserItem } from "../utils/userScopedStorage";

export function useCloudPasswordsQuery(enabled: boolean = true) {
  const { userId } = useContext(AuthContext);

  return useQuery({
    queryKey: [userId, QUERY_KEYS.PASSWORDS.ROOT, QUERY_KEYS.PASSWORDS.CLOUD],
    queryFn: async () => {
      const offline = await isOffline();

      if (offline) {
        const cached = await getCloudPasswordsCache();
        return sortItemsNewestFirst(cached);
      }

      // 1. Sync pending queues first (as in original passwordService.ts)
      try {
        await syncPendingQueues();
      } catch (e) {
        console.error("Error syncing pending queues:", e);
      }

      // 2. Fetch from backend
      try {
        const resp = await getAllPassword();
        if (resp && resp.ok && Array.isArray(resp.data)) {
          // 3. Save to cache (includes normalization)
          await saveCloudPasswords(resp.data);
          const cached = await getCloudPasswordsCache();
          return sortItemsNewestFirst(cached);
        }
      } catch (e) {
        console.error("Error fetching cloud passwords:", e);
      }

      // 4. Fallback to cache
      const cached = await getCloudPasswordsCache();
      return sortItemsNewestFirst(cached);
    },
    enabled,
  });
}
