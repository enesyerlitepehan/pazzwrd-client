import { useState, useCallback } from "react";
import { AuthContextType } from "../../utils/types";

interface UseCardTabActionsProps {
  orders: any[];
  setOrders: (data: any[]) => void;
  onDelete?: (id: string | number) => void;
  authContext: AuthContextType;
}

export const useCardTabActions = ({
  orders,
  setOrders,
  onDelete,
  authContext,
}: UseCardTabActionsProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult, setModalResult] = useState(false);
  const [modalMsgKey, setModalMsgKey] = useState<string | undefined>(undefined);
  const [modalConfirmMode, setModalConfirmMode] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);

  const handleLongPress = useCallback((card: any) => {
    const cardIdentifier = card.bankName || card.nickName || card.cardType || "Unknown card";
    console.log("Long press detected on card item:", cardIdentifier);
    setSelectedCard(card);

    const fromTrash = Boolean(card?.deletedAt);
    setModalMsgKey(fromTrash ? "delete.confirmPermanent" : "delete.confirm");
    setModalConfirmMode(true);
    setModalResult(false);
    setModalVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (selectedCard) {
      const cardIdentifier =
        selectedCard?.bankName ||
        selectedCard?.nickName ||
        selectedCard?.cardType ||
        "Unknown card";
      console.log("Delete confirmed for card:", cardIdentifier);

      try {
        setModalConfirmMode(false);
        setModalMsgKey("common.deleting");

        const isLocal = !selectedCard.sync;
        const fromTrash = Boolean(selectedCard.deletedAt);

        const response = await authContext.removeCard(selectedCard.id, isLocal, fromTrash);

        if (response && response.ok) {
          setModalMsgKey(fromTrash ? "alerts.cardDeleted" : "alerts.cardMovedToTrash");
          setModalResult(true);
        } else {
          setModalVisible(false);
        }

        if (orders) {
          const updatedData = orders.filter((card) => card.id !== selectedCard.id);
          setOrders(updatedData);
        }

        if (onDelete) {
          onDelete(selectedCard.id);
        }

        console.log("Card moved to trash successfully");
      } catch (error) {
        console.error("Error moving card to trash:", error);
        setModalVisible(false);
      }
    }
    setSelectedCard(null);
  }, [selectedCard, orders, setOrders, onDelete, authContext]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalResult(false);
    setModalConfirmMode(false);
    setSelectedCard(null);
  }, []);

  return {
    modalVisible,
    modalResult,
    modalMsgKey,
    modalConfirmMode,
    handleLongPress,
    handleDeleteConfirm,
    closeModal,
  };
};
