import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { apiGetPendingReceivedShares } from "../../api/api";

export function usePendingSharesState() {
  const [hasPendingShares, setHasPendingShares] = useState<boolean>(false);
  const [pendingSharesCount, setPendingSharesCount] = useState<number>(0);
  const [pendingSharesError, setPendingSharesError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const resp = await apiGetPendingReceivedShares();
          console.log("Pending received shares:", resp.data);
          const { ok: success, data } = resp;
          const body = data as any;
          const shares: any[] = Array.isArray(body?.shares) ? body.shares : [];
          if (!cancelled && success && Array.isArray(shares)) {
            const any = shares.length > 0;
            setHasPendingShares(any);
            setPendingSharesCount(shares.length || 0);
            setPendingSharesError(null);
            console.log(`Pending received shares: ${shares.length} item(s)`);
          } else if (!cancelled) {
            const errText = `[${resp.status || "ERR"}] ${resp.code || "ERROR"}: ${
              resp.message || "Failed to fetch pending received shares"
            }`;
            setHasPendingShares(false);
            setPendingSharesCount(0);
            setPendingSharesError(errText);
            console.warn("Pending shares error:", errText);
          }
        } catch (e: any) {
          if (!cancelled) {
            setHasPendingShares(false);
            setPendingSharesCount(0);
            setPendingSharesError(String(e?.message || e));
            console.error("Error fetching pending received shares:", e?.message || e);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return { hasPendingShares, pendingSharesCount, pendingSharesError };
}
