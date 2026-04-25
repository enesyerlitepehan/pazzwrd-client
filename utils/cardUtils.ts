import { getAllCards as apiGetAllCards } from "../api/api";

import { CardData } from "./types/cardTypes";
import { AsyncStorage } from "./userScopedStorage";

// Save cloud cards (latest synced from server) to AsyncStorage for offline use
function normalizeCardShape(p: any): any {
  if (!p) return {};
  // Already normalized (camelCase, new encrypted schema)
  if (p.itemId || p.metadataPublic || p.IKWrappedByDEK) {
    const normalized = { ...p };
    normalized.metadataPublic = normalized.metadataPublic || {};

    // Backfill root timestamps from metadataPublic if missing
    if (!normalized.createdAt) {
      normalized.createdAt = normalized.metadataPublic.createdAt;
    }
    if (!normalized.updatedAt) {
      normalized.updatedAt = normalized.metadataPublic.updatedAt;
    }

    return normalized;
  }
  const metadataPublic = { ...(p.metadata_public || {}) } as Record<string, any>;
  if ("name" in metadataPublic) {
    delete metadataPublic.name;
  }
  if (!metadataPublic.createdAt) {
    metadataPublic.createdAt = p.created_at ?? p.createdAt;
  }
  metadataPublic.updatedAt = metadataPublic.updatedAt || p.updated_at || p.updatedAt;

  const normalized: any = {
    id: p.id ?? p.item_id,
    itemId: p.item_id ?? undefined,
    version: p.version ?? undefined,
    ciphertext: p.ciphertext,
    IKWrappedByDEK: p.IK_wrapped_by_DEK,
    metadataPublic,
    sync: typeof p.sync === "boolean" ? p.sync : true,
    createdAt: p.createdAt ?? p.created_at,
    updatedAt: p.updatedAt ?? p.updated_at,
    deletedAt: p.deletedAt ?? p.deleted_at,
  };
  // TODO(local-cards): Local cards saved without metadataPublic/createdAt/updatedAt
  // may lead to missing "recent" entries on Home. Ensure local creation/update
  // sets these timestamps in cardService.
  return normalized;
}

export async function saveCloudCards(cards: any[]) {
  try {
    const normalized = (cards || []).map((c: any) => normalizeCardShape(c));
    const payload = {
      cards: normalized,
      lastUpdated: new Date().toISOString(),
    };
    await AsyncStorage.setItem("cloudCards", JSON.stringify(payload));
  } catch (error) {
    console.error("Error saving cloud cards to AsyncStorage:", error);
  }
}

export async function getCloudCardsCache(): Promise<CardData[]> {
  try {
    const raw = await AsyncStorage.getItem("cloudCards");
    if (!raw) return [] as any;
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed.cards) ? parsed.cards : [];
    // Ensure normalized on read as well, in case legacy cache exists
    return (items || []).map((c: any) => normalizeCardShape(c)) as any;
  } catch {
    return [] as any;
  }
}

export async function syncCloudCardsFromBackend() {
  try {
    const resp = await apiGetAllCards();
    if (resp && resp.ok && Array.isArray(resp.data)) {
      await saveCloudCards(resp.data);
    }
  } catch (e) {
    console.error("Error syncing cloud cards:", e);
  }
}

// ---- Card formatting/type helpers (exported for UI/tests compatibility) ----
export enum CardType {
  VISA = "VISA",
  MASTERCARD = "MASTERCARD",
  AMEX = "AMEX",
  DISCOVER = "DISCOVER",
  DINERS = "DINERS",
  JCB = "JCB",
  UNKNOWN = "UNKNOWN",
}

export function detectCardType(cardNumber: string): CardType {
  const num = (cardNumber || "").replace(/\D/g, "");
  if (!num) return CardType.UNKNOWN;
  if (/^4\d{12}(\d{3})?$/.test(num)) return CardType.VISA;
  if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(num))
    return CardType.MASTERCARD;
  if (/^3[47]\d{13}$/.test(num)) return CardType.AMEX;
  if (/^(6011\d{12}|65\d{14}|622(12[6-9]|1[3-9]\d|[2-8]\d{2}|9([01]\d|2[0-5]))\d{10})$/.test(num))
    return CardType.DISCOVER;
  if (/^(30[0-5]\d{11}|36\d{12}|3[89]\d{12})$/.test(num)) return CardType.DINERS;
  if (/^35(2[89]|[3-8]\d)\d{12}$/.test(num)) return CardType.JCB;
  return CardType.UNKNOWN;
}

export function formatCardNumber(input: string): string {
  const digits = (input || "").replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}
