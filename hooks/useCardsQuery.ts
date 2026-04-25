import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";
import { fetchCards } from "../utils/cardService";
import { sortItemsNewestFirst } from "../utils/util";
import { useCloudCardsQuery } from "./useCloudCardsQuery";

export function useCardsQuery(source: "cloud" | "local" | "trash", enabled: boolean = true) {
  const { userId } = useContext(AuthContext);
  const cloudQuery = useCloudCardsQuery(source === "cloud" && enabled);

  const nonCloudQuery = useQuery({
    queryKey: [userId, QUERY_KEYS.CARDS.ROOT, source],
    queryFn: async () => {
      const resp = await fetchCards(source);
      const data = resp.ok ? resp.data || [] : [];
      return sortItemsNewestFirst(data);
    },
    enabled: source !== "cloud" && enabled,
  });

  return source === "cloud" ? cloudQuery : nonCloudQuery;
}
