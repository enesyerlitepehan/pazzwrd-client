import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useContext, useEffect, useState } from "react";

import { AuthContext } from "../store/auth-context";
import { useCloudCardsQuery } from "./useCloudCardsQuery";
import { useCloudPasswordsQuery } from "./useCloudPasswordsQuery";
import { getTimeUntilDeletionParts, msUntilDeletion, type TimeParts } from "../utils/trashUtils";
import { AsyncStorage } from "../utils/userScopedStorage";

type RecentItem = { title: string; when: string; id: string | number } | null;

export type HomeCounts = {
  passwords: { cloud: number; local: number; trash: number };
  cards: { cloud: number; local: number; trash: number };
};

export type HomeRecent = {
  password: { added: RecentItem; updated: RecentItem; deleted: RecentItem };
  card: { added: RecentItem; updated: RecentItem; deleted: RecentItem };
};

export type HomeTrash = {
  passwords: { parts: TimeParts; expired: boolean } | null;
  cards: { parts: TimeParts; expired: boolean } | null;
};

export type StrengthStats = { weak: number; medium: number; strong: number };

function safeDate(v: any): Date | null {
  try {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function pickLatestBy(list: any[], field: string): any | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const withDate = list
    .map((it) => {
      const raw = it?.[field] ?? it?.metadataPublic?.[field];
      const d = safeDate(raw);
      return d ? { it, ts: d.getTime() } : null;
    })
    .filter(Boolean) as { it: any; ts: number }[];
  if (withDate.length === 0) return null;
  withDate.sort((a, b) => b.ts - a.ts);
  return withDate[0].it;
}

function formatWhen(iso?: string | Date | null): string {
  const d = safeDate(iso);
  if (!d) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

async function readList(key: string, field: "passwords" | "cards"): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed[field]) ? parsed[field] : [];
    return arr as any[];
  } catch {
    return [];
  }
}

export function useHomeMetrics() {
  const auth = useContext(AuthContext);
  const [counts, setCounts] = useState<HomeCounts>({
    passwords: { cloud: 0, local: 0, trash: 0 },
    cards: { cloud: 0, local: 0, trash: 0 },
  });
  const [recent, setRecent] = useState<HomeRecent>({
    password: { added: null, updated: null, deleted: null },
    card: { added: null, updated: null, deleted: null },
  });
  const [trash, setTrash] = useState<HomeTrash>({ passwords: null, cards: null });
  const [strength, setStrength] = useState<StrengthStats>({ weak: 0, medium: 0, strong: 0 });

  const {
    data: pwCloud,
    isLoading: pwLoading,
    refetch: refetchPasswords,
  } = useCloudPasswordsQuery(auth.isAuthenticated);
  const {
    data: cardCloud,
    isLoading: cardLoading,
    refetch: refetchCards,
  } = useCloudCardsQuery(auth.isAuthenticated);

  const readCache = useCallback(async () => {
    // Passwords
    const pwLocal = await readList("localPasswords", "passwords");
    const pwTrash = await readList("trashPasswords", "passwords");

    // Cards
    const cardLocal = await readList("localCards", "cards");
    const cardTrash = await readList("trashCards", "cards");

    // Counts
    setCounts({
      passwords: {
        cloud: (pwCloud || []).length,
        local: (pwLocal || []).length,
        trash: (pwTrash || []).length,
      },
      cards: {
        cloud: (cardCloud || []).length,
        local: (cardLocal || []).length,
        trash: (cardTrash || []).length,
      },
    });

    // Strength distribution across cloud+local passwords
    const allPw = [...(pwCloud || []), ...(pwLocal || [])];
    let weak = 0,
      medium = 0,
      strong = 0;
    for (const it of allPw) {
      const score = Number(it?.metadataPublic?.strength?.score);
      if (!Number.isFinite(score)) continue;
      if (score >= 70) strong++;
      else if (score >= 40) medium++;
      else weak++;
    }
    setStrength({ weak, medium, strong });

    // Recents
    const pwAdded = pickLatestBy([...(pwCloud || []), ...(pwLocal || [])], "createdAt");
    const pwUpdated = pickLatestBy([...(pwCloud || []), ...(pwLocal || [])], "updatedAt");
    const pwDeleted = pickLatestBy(pwTrash || [], "deletedAt");

    const cardAdded = pickLatestBy([...(cardCloud || []), ...(cardLocal || [])], "createdAt");
    const cardUpdated = pickLatestBy([...(cardCloud || []), ...(cardLocal || [])], "updatedAt");
    const cardDeleted = pickLatestBy(cardTrash || [], "deletedAt");

    const mapItem = (it: any, field: string): RecentItem => {
      if (!it) return null;
      const whenRaw = it?.[field] ?? it?.metadataPublic?.[field] ?? null;
      return {
        id: it.id,
        title: it?.metadataPublic?.name || "",
        when: formatWhen(whenRaw),
      };
    };

    setRecent({
      password: {
        added: mapItem(pwAdded, "createdAt"),
        updated: mapItem(pwUpdated, "updatedAt"),
        deleted: mapItem(pwDeleted, "deletedAt"),
      },
      card: {
        added: mapItem(cardAdded, "createdAt"),
        updated: mapItem(cardUpdated, "updatedAt"),
        deleted: mapItem(cardDeleted, "deletedAt"),
      },
    });

    // Trash next deletion time (closest item)
    const findNext = (items: any[]): { parts: TimeParts; expired: boolean } | null => {
      if (!Array.isArray(items) || items.length === 0) return null;
      let bestMs: number | null = null;
      let bestDeletedAt: any = null;
      for (const it of items) {
        const ms = msUntilDeletion(it?.deletedAt);
        if (ms === null) continue;
        if (ms <= 0) continue; // already expired; UI will purge elsewhere
        if (bestMs === null || ms < bestMs) {
          bestMs = ms;
          bestDeletedAt = it?.deletedAt;
        }
      }
      if (bestMs === null) return null;
      return getTimeUntilDeletionParts(bestDeletedAt);
    };

    setTrash({
      passwords: findNext(pwTrash || []),
      cards: findNext(cardTrash || []),
    });
  }, [pwCloud, cardCloud]);

  const refresh = useCallback(async () => {
    try {
      await Promise.allSettled([refetchPasswords(), refetchCards()]);
    } catch {}
  }, [refetchPasswords, refetchCards]);

  useEffect(() => {
    readCache();
  }, [readCache]);

  useFocusEffect(
    useCallback(() => {
      readCache();
      refresh();
      return () => {};
    }, [readCache, refresh]),
  );

  return { counts, recent, trash, loading: pwLoading || cardLoading, refresh, strength };
}
