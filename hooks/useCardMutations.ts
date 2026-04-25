import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";

import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";
import { createCard, updateCard, removeCard } from "../utils/cardService";
import { CardData } from "../utils/types/cardTypes";

export function useCardMutations() {
  const queryClient = useQueryClient();
  const { userId } = useContext(AuthContext);

  const addMutation = useMutation({
    mutationFn: async ({ cardData }: { cardData: CardData }) => {
      return await createCard(cardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.CARDS.ROOT] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, cardData }: { id: number; cardData: Partial<CardData> }) => {
      return await updateCard(id, cardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.CARDS.ROOT] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      id,
      isLocal,
      fromTrash,
      skipTrash,
    }: {
      id: number | string;
      isLocal?: boolean;
      fromTrash?: boolean;
      skipTrash?: boolean;
    }) => {
      return await removeCard(id, isLocal, fromTrash, skipTrash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.CARDS.ROOT] });
    },
  });

  return {
    addCard: addMutation,
    updateCard: updateMutation,
    deleteCard: deleteMutation,
  };
}
