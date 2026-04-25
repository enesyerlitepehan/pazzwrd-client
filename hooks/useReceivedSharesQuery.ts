import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { apiGetReceivedShares } from "../api/api";
import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";

export function useReceivedSharesQuery(enabled: boolean = true) {
  const { userId } = useContext(AuthContext);

  return useQuery({
    queryKey: [userId, QUERY_KEYS.SHARES.ROOT, QUERY_KEYS.SHARES.RECEIVED],
    queryFn: async () => {
      const resp = await apiGetReceivedShares();
      if (resp && resp.ok && resp.data) {
        const data = resp.data as any;
        return Array.isArray(data?.shares) ? data.shares : [];
      }
      return [];
    },
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  });
}
