import { useQuery } from "@tanstack/react-query";
import { useContext } from "react";

import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";
import { fetchPasswords } from "../utils/passwordService";
import { sortItemsNewestFirst } from "../utils/util";
import { useCloudPasswordsQuery } from "./useCloudPasswordsQuery";

export function usePasswordsQuery(source: "cloud" | "local" | "trash", enabled: boolean = true) {
  const { userId } = useContext(AuthContext);

  // We delegate cloud to useCloudPasswordsQuery for its more complex logic
  const cloudQuery = useCloudPasswordsQuery(source === "cloud" && enabled);

  const nonCloudQuery = useQuery({
    queryKey: [userId, QUERY_KEYS.PASSWORDS.ROOT, source],
    queryFn: async () => {
      const resp = await fetchPasswords(source);
      const data = resp.ok ? resp.data || [] : [];
      return sortItemsNewestFirst(data);
    },
    enabled: source !== "cloud" && enabled,
  });

  return source === "cloud" ? cloudQuery : nonCloudQuery;
}
