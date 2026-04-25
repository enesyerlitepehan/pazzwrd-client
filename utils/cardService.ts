import {
  getCard,
  updateCard as apiUpdateCard,
  createCard as apiCreateCard,
  getAllCards as apiGetAllCards,
  _removeCard,
} from "../api/api";

import { saveCloudCards, getCloudCardsCache, syncCloudCardsFromBackend } from "./cardUtils";
import { isOffline } from "./network";
import { enqueueCardOp, syncPendingQueues as syncPendingQueuesService } from "./syncService";
import { CardData, CardResponse } from "./types/cardTypes";
import { AsyncStorage } from "./userScopedStorage";
import { sortItemsNewestFirst } from "./util";

async function saveLocalCards(cards: CardData[]) {
  try {
    const payload = { cards, lastUpdated: new Date().toISOString() };
    await AsyncStorage.setItem("localCards", JSON.stringify(payload));
  } catch (e) {
    console.error("Error saving local cards to AsyncStorage:", e);
  }
}

async function handleAddCardLocal(cardData: CardData): Promise<CardResponse> {
  const storedLocalCards = await AsyncStorage.getItem("localCards");
  let existingCards: CardData[] = [];
  if (storedLocalCards) {
    try {
      const localCardData = JSON.parse(storedLocalCards);
      existingCards = Array.isArray(localCardData.cards) ? localCardData.cards : [];
    } catch {
      existingCards = [];
    }
  }
  if (!cardData.id) cardData.id = Date.now();
  // Ensure local items have timestamps for sorting consistency
  if (!(cardData as any).createdAt) (cardData as any).createdAt = new Date().toISOString();
  if (!(cardData as any).updatedAt) (cardData as any).updatedAt = new Date().toISOString();

  existingCards.push(cardData);
  await saveLocalCards(existingCards);
  return {
    ok: true,
    success: true,
    status: 201,
    data: [cardData],
    message: "Card created successfully in local storage",
    code: "CREATED",
    meta: null,
  };
}

async function handleAddCardCloudOffline(cardData: CardData): Promise<CardResponse> {
  const tempId = cardData.id ?? Date.now();
  const localItem: CardData = {
    ...cardData,
    id: tempId,
    pendingSync: true,
    pendingOp: "create",
  } as any;
  const cache = await getCloudCardsCache();
  const idx = cache.findIndex((c) => c.id === tempId);
  if (idx >= 0) cache[idx] = localItem;
  else cache.push(localItem);
  await saveCloudCards(cache);
  await enqueueCardOp({
    op: "create",
    tempId: String(tempId),
    data: cardData,
    timestamp: new Date().toISOString(),
  } as any);
  return {
    ok: true,
    success: true,
    status: 201,
    data: [localItem],
    message: "Card created offline (queued)",
    code: "CREATED",
    meta: null,
  };
}

async function handleAddCardCloudOnline(cardData: CardData): Promise<CardResponse> {
  try {
    const response = (await apiCreateCard(cardData)) as any;
    if (response && response.ok) {
      await syncCloudCardsFromBackend();
      return response;
    }
    // If quota exceeded or cloud-not-ready, do NOT fallback to offline (it will just fail again or is expected)
    if (
      response &&
      (response.code === "QUOTA_EXCEEDED" ||
        response.code === "FEATURE_DISABLED" ||
        response.code === "EMAIL_NOT_VERIFIED" ||
        response.code === "MP_NOT_CONFIGURED")
    ) {
      return response;
    }
  } catch (e) {
    // ignore; fallback to offline queue
  }
  return handleAddCardCloudOffline(cardData);
}

export async function createCard(cardData: CardData): Promise<CardResponse> {
  try {
    const toCloud = cardData.sync !== false;
    if (toCloud) {
      if (await isOffline()) {
        return await handleAddCardCloudOffline(cardData);
      }
      return await handleAddCardCloudOnline(cardData);
    }

    // Local-only card
    return await handleAddCardLocal(cardData);
  } catch (error) {
    return {
      ok: false,
      success: false,
      status: 500,
      data: null,
      message: "Create card failed",
      code: "ERROR",
      isNetworkError: false,
    };
  }
}

// ---- Update helpers ----
async function handleUpdateCardCloudOffline(
  id: number | string,
  updatePayload: Partial<CardData>,
): Promise<CardResponse> {
  const cache = await getCloudCardsCache();
  const idx = cache.findIndex((c) => c.id == id);
  if (idx >= 0) {
    cache[idx] = {
      ...cache[idx],
      ...updatePayload,
      pendingSync: true,
      pendingOp: "update",
    } as CardData;
    await saveCloudCards(cache);
  }
  if (typeof id === "number") {
    await enqueueCardOp({
      op: "update",
      id,
      data: updatePayload,
      timestamp: new Date().toISOString(),
    } as any);
  }
  return {
    ok: true,
    success: true,
    status: 200,
    data: null,
    message: "Card update queued offline",
    code: "OK",
    meta: null,
  };
}

async function handleUpdateCardCloudOnline(
  id: number | string,
  updatePayload: Partial<CardData>,
): Promise<CardResponse> {
  try {
    const response = (await apiUpdateCard(id as any, updatePayload)) as any;
    if (response && response.ok) {
      await syncCloudCardsFromBackend();
    }
    if (response) {
      return response;
    }
  } catch (e) {
    // fall through to offline on transport/runtime failures only
  }
  return handleUpdateCardCloudOffline(id, updatePayload);
}

async function handleUpdateCardLocal(
  id: number | string,
  updatePayload: Partial<CardData>,
): Promise<CardResponse> {
  const storedLocalCards = await AsyncStorage.getItem("localCards");
  if (storedLocalCards) {
    try {
      const localCardData = JSON.parse(storedLocalCards);
      const source: CardData[] = Array.isArray(localCardData.cards) ? localCardData.cards : [];
      const updated = source.map((c: CardData) => {
        if (c.id != id) return c;
        const next = { ...c, ...updatePayload } as any;
        next.updatedAt = new Date().toISOString();
        return next;
      });
      await saveLocalCards(updated);
    } catch {}
  }
  return {
    ok: true,
    success: true,
    status: 200,
    data: null,
    message: "Card updated locally",
    code: "OK",
    meta: null,
  };
}

export async function updateCard(
  id: number | string,
  cardData: Partial<CardData>,
): Promise<CardResponse> {
  try {
    const updatePayload = { ...cardData } as Partial<CardData>;
    const isCloud = cardData.sync !== false;
    if (isCloud) {
      if (await isOffline()) {
        return handleUpdateCardCloudOffline(id, updatePayload);
      }
      return handleUpdateCardCloudOnline(id, updatePayload);
    }
    return handleUpdateCardLocal(id, updatePayload);
  } catch (error) {
    return {
      ok: false,
      success: false,
      status: 500,
      data: null,
      message: "Update card failed",
      code: "ERROR",
      isNetworkError: false,
    };
  }
}

export async function getAllCards(): Promise<CardResponse> {
  try {
    const response = (await apiGetAllCards()) as any;
    return response;
  } catch (error) {
    return {
      ok: false,
      success: false,
      status: 500,
      data: null,
      message: "Get all cards failed",
      code: "ERROR",
      isNetworkError: false,
    };
  }
}

// ---- Fetch helpers ----
async function fetchCloudCards(): Promise<CardResponse> {
  const offline = await isOffline();
  if (offline) {
    try {
      const items = await getCloudCardsCache();
      return {
        ok: true,
        success: true,
        status: 200,
        data: sortItemsNewestFirst(items),
        message: "OK",
        code: "OK",
        meta: null,
      };
    } catch {}
    return {
      ok: true,
      success: true,
      status: 200,
      data: [],
      message: "OK",
      code: "OK",
      meta: null,
    };
  }
  try {
    await syncPendingQueuesService();
  } catch {}
  try {
    const cloudResponse = await apiGetAllCards();
    if (cloudResponse && cloudResponse.ok && Array.isArray(cloudResponse.data)) {
      await saveCloudCards(cloudResponse.data);
    }
  } catch {}
  // Return normalized cache
  try {
    const items = await getCloudCardsCache();
    return {
      ok: true,
      success: true,
      status: 200,
      data: sortItemsNewestFirst(items),
      message: "OK",
      code: "OK",
      errors: null,
      meta: null,
    };
  } catch {}
  return {
    ok: true,
    success: true,
    status: 200,
    data: [],
    message: "OK",
    code: "OK",
    meta: null,
  };
}

async function fetchLocalCards(): Promise<CardResponse> {
  try {
    const storedLocalCards = await AsyncStorage.getItem("localCards");
    if (storedLocalCards) {
      const parsed = JSON.parse(storedLocalCards);
      const items = Array.isArray(parsed.cards) ? parsed.cards : [];
      return {
        ok: true,
        success: true,
        status: 200,
        data: sortItemsNewestFirst(items),
        message: "OK",
        code: "OK",
        meta: null,
      };
    }
  } catch {}
  return {
    ok: true,
    success: true,
    status: 200,
    data: [],
    message: "OK",
    code: "OK",
    meta: null,
  };
}

async function fetchTrashCards(): Promise<CardResponse> {
  try {
    const storedTrashCards = await AsyncStorage.getItem("trashCards");
    if (storedTrashCards) {
      const parsed = JSON.parse(storedTrashCards);
      const items = Array.isArray(parsed.cards) ? parsed.cards : [];
      return {
        ok: true,
        success: true,
        status: 200,
        data: sortItemsNewestFirst(items),
        message: "OK",
        code: "OK",
        meta: null,
      };
    }
  } catch {}
  return {
    ok: true,
    success: true,
    status: 200,
    data: [],
    message: "OK",
    code: "OK",
    meta: null,
  };
}

export async function fetchCards(
  source: "cloud" | "local" | "trash" | string = "local",
): Promise<CardResponse> {
  switch (source) {
    case "cloud":
      return fetchCloudCards();
    case "local":
      return fetchLocalCards();
    case "trash":
      return fetchTrashCards();
    default:
      return {
        ok: true,
        success: true,
        status: 200,
        data: [],
        message: "OK",
        code: "OK",
        errors: null,
        meta: null,
      };
  }
}

// ---- Remove helpers ----
async function addCardToTrash(card: CardData, skipTrash: boolean): Promise<void> {
  if (skipTrash) return;
  try {
    const TRASH_LIMIT = 5;
    const storedTrashCards = await AsyncStorage.getItem("trashCards");
    let trashCards: CardData[] = [];
    if (storedTrashCards) {
      const trashCardData = JSON.parse(storedTrashCards);
      trashCards = Array.isArray(trashCardData.cards) ? trashCardData.cards : [];
    }
    const cardWithDeletedAt: CardData = {
      ...card,
      deletedAt: (card as any).deletedAt ?? new Date().toISOString(),
    };
    trashCards.push(cardWithDeletedAt);

    // Enforce trash limit: keep most recent TRASH_LIMIT items (remove oldest)
    if (trashCards.length > TRASH_LIMIT) {
      trashCards.sort((a: any, b: any) => {
        const ta = new Date(a.deletedAt || a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.deletedAt || b.updatedAt || b.createdAt || 0).getTime();
        return ta - tb; // oldest first
      });
      while (trashCards.length > TRASH_LIMIT) {
        trashCards.shift();
      }
    }
    await AsyncStorage.setItem(
      "trashCards",
      JSON.stringify({ cards: trashCards, lastUpdated: new Date().toISOString() }),
    );
  } catch (e) {
    console.error("Error adding card to trash:", e);
  }
}

async function removeCardFromTrash(id: number | string): Promise<CardResponse> {
  try {
    const storedTrashCards = await AsyncStorage.getItem("trashCards");
    if (storedTrashCards) {
      const trashCardData = JSON.parse(storedTrashCards);
      const filtered = (Array.isArray(trashCardData.cards) ? trashCardData.cards : []).filter(
        (c: CardData) => c.id !== id,
      );
      await AsyncStorage.setItem(
        "trashCards",
        JSON.stringify({ cards: filtered, lastUpdated: new Date().toISOString() }),
      );
      return {
        ok: true,
        success: true,
        status: 200,
        data: filtered,
        message: "OK",
        code: "OK",
        errors: null,
        meta: null,
      };
    }
    return {
      ok: true,
      success: true,
      status: 200,
      data: [],
      message: "OK",
      code: "OK",
      meta: null,
    };
  } catch (e) {
    return {
      ok: false,
      success: false,
      status: 500,
      data: null,
      message: "Remove from trash failed",
      code: "ERROR",
      isNetworkError: false,
    };
  }
}

async function handleRemoveCardLocal(
  id: number | string,
  skipTrash: boolean,
): Promise<CardResponse> {
  try {
    const storedLocalCards = await AsyncStorage.getItem("localCards");
    if (storedLocalCards) {
      const localCardData = JSON.parse(storedLocalCards);
      const cards: CardData[] = Array.isArray(localCardData.cards) ? localCardData.cards : [];
      const cardToTrash = cards.find((c) => c.id == id);
      if (cardToTrash) {
        await addCardToTrash(cardToTrash, skipTrash);
        const updated = cards.filter((c) => c.id != id);
        await saveLocalCards(updated);
        return {
          ok: true,
          success: true,
          status: 200,
          data: [],
          message: "OK",
          code: "OK",
          errors: null,
          meta: null,
        };
      }
    }
  } catch (e) {}
  return {
    ok: true,
    success: true,
    status: 200,
    data: [],
    message: "OK",
    code: "OK",
    meta: null,
  };
}

async function handleRemoveCardCloudOffline(
  id: number | string,
  skipTrash: boolean,
): Promise<CardResponse> {
  try {
    const cache = await getCloudCardsCache();
    const cardToTrash = cache.find((c) => c.id == id);
    if (cardToTrash) {
      await addCardToTrash(cardToTrash, skipTrash);
      const filtered = cache.filter((c) => c.id != id);
      await saveCloudCards(filtered);
      if (typeof id === "number") {
        await enqueueCardOp({
          op: "delete",
          id: id as number,
          timestamp: new Date().toISOString(),
        } as any);
      }
      return {
        ok: true,
        success: true,
        status: 200,
        data: null,
        message: "Card delete queued offline",
        code: "OK",
        errors: null,
        meta: null,
      };
    }
  } catch {}
  return {
    ok: true,
    success: true,
    status: 200,
    data: [],
    message: "OK",
    code: "OK",
    meta: null,
  };
}

async function handleRemoveCardCloudOnline(
  id: number | string,
  skipTrash: boolean,
): Promise<CardResponse> {
  try {
    const parsedId =
      typeof id === "number" ? id : Number.isFinite(Number(id)) ? Number(id) : (id as any);
    let cardToTrash: CardData | null = null;
    try {
      const cardResponse = await getCard(parsedId as number);
      if (cardResponse && cardResponse.ok) {
        cardToTrash = cardResponse.data as any;
      }
    } catch {}
    if (cardToTrash) {
      await addCardToTrash(cardToTrash, skipTrash);
    }
    const deleteResponse = await _removeCard(parsedId as number);
    if (deleteResponse && deleteResponse.ok) {
      await syncCloudCardsFromBackend();
      return { ...deleteResponse, data: [] } as CardResponse;
    }
    return deleteResponse as CardResponse;
  } catch (error) {
    // Fallback to offline cache/queue approach
    return handleRemoveCardCloudOffline(id, skipTrash);
  }
}

export async function removeCard(
  id: number | string,
  isLocal: boolean = false,
  fromTrash: boolean = false,
  skipTrash: boolean = false,
): Promise<CardResponse> {
  if (fromTrash) return removeCardFromTrash(id);
  if (isLocal) return handleRemoveCardLocal(id, skipTrash);
  if (await isOffline()) return handleRemoveCardCloudOffline(id, skipTrash);
  return handleRemoveCardCloudOnline(id, skipTrash);
}

export async function fetchCardsSimple() {
  // kept for potential future extensions
  return fetchCards("cloud");
}
