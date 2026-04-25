import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { getAllCards } from "../api/api";
import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";
import { isOffline } from "../utils/network";
import { getCloudCardsCache, saveCloudCards } from "../utils/cardUtils";
import { sortItemsNewestFirst } from "../utils/util";
import { syncPendingQueues } from "../utils/syncService";
import { getItem as getUserItem } from "../utils/userScopedStorage";

export function useCloudCardsQuery(enabled: boolean = true) {
  const { userId } = useContext(AuthContext);

  return useQuery({
    queryKey: [userId, QUERY_KEYS.CARDS.ROOT, QUERY_KEYS.CARDS.CLOUD],
    queryFn: async () => {
      const offline = await isOffline();

      if (offline) {
        const cached = await getCloudCardsCache();
        return sortItemsNewestFirst(cached);
      }

      // 1. Sync pending queues first
      try {
        await syncPendingQueues();
      } catch (e) {
        console.error("Error syncing pending queues:", e);
      }

      // 2. Fetch from backend
      try {
        const resp = await getAllCards();
        if (resp && resp.ok && Array.isArray(resp.data)) {
          // 3. Save to cache
          await saveCloudCards(resp.data);
          const cached = await getCloudCardsCache();
          return sortItemsNewestFirst(cached);
        }
      } catch (e) {
        console.error("Error fetching cloud cards:", e);
      }

      // 4. Fallback to cache
      const cached = await getCloudCardsCache();
      return sortItemsNewestFirst(cached);
    },
    enabled,
  });
}
