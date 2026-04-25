import type { QueryClient } from "@tanstack/react-query";

import { QUERY_KEYS } from "../constants/queryKeys";

type ShareDetailErrorLike = {
  status?: number | null;
  code?: string | null;
};

export function isReceivedShareGoneError(resp: ShareDetailErrorLike | null | undefined): boolean {
  const status = Number(resp?.status || 0);
  const code = String(resp?.code || "").toUpperCase();

  return (
    status === 403 ||
    status === 404 ||
    code === "FORBIDDEN" ||
    code === "NOT_FOUND" ||
    code === "ITEM_NOT_FOUND"
  );
}

export function removeReceivedShareFromCache(
  queryClient: QueryClient,
  userId: string | null | undefined,
  shareId: number | string | null | undefined,
) {
  if (!userId || shareId == null) return;

  const queryKey = [userId, QUERY_KEYS.SHARES.ROOT, QUERY_KEYS.SHARES.RECEIVED] as const;
  const normalizedShareId = String(shareId);

  queryClient.setQueryData(queryKey, (current: unknown) => {
    if (!Array.isArray(current)) return current;
    return current.filter((entry: any) => String(entry?.shareId) !== normalizedShareId);
  });

  queryClient.invalidateQueries({ queryKey });
}
