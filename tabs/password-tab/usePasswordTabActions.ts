import { useState, useContext, useCallback } from "react";
import { apiRemoveReceivedShareAccess } from "../../api/api";
import { AuthContext } from "../../store/auth-context";
import { AuthContextType } from "../../utils/types";
import { Password } from "../../utils/types/passwordTypes";
import { useTranslation } from "react-i18next";
import { getPasswordRowKey } from "./identity";

interface UsePasswordTabActionsProps {
  orders: any[];
  setOrders: (data: any[]) => void;
  onDelete?: (id: string | number) => void;
}

export const usePasswordTabActions = ({
  orders,
  setOrders,
  onDelete,
}: UsePasswordTabActionsProps) => {
  const { t } = useTranslation("common");
  const authContext = useContext(AuthContext) as AuthContextType;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalResult, setModalResult] = useState(false);
  const [modalMsgKey, setModalMsgKey] = useState<string | undefined>(undefined);
  const [modalMsg, setModalMsg] = useState<string | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  const [modalConfirmMode, setModalConfirmMode] = useState(false);

  const [selectedPassword, setSelectedPassword] = useState<Password | null>(null);
  const [isSharedSelected, setIsSharedSelected] = useState<boolean>(false);

  const handleLongPress = useCallback((password: Password) => {
    console.log(
      "Long press detected on password item:",
      password?.metadataPublic?.name || "(no name)",
    );

    const isShared = Boolean(
      (password as any)?.isShared || (password as any)?.shareId || (password as any)?.shared,
    );

    setSelectedPassword(password);
    setIsSharedSelected(isShared);

    const fromTrash = Boolean(password?.deletedAt);
    setModalMsgKey(
      isShared
        ? "This will remove your access to the shared password."
        : fromTrash
          ? "delete.confirmPermanent"
          : "delete.confirm",
    );
    setModalConfirmMode(true);
    setModalResult(false);
    setModalVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (selectedPassword) {
      console.log(
        "Delete confirmed for password:",
        selectedPassword?.metadataPublic?.name || "(no name)",
      );

      const isShared = Boolean(
        (selectedPassword as any)?.isShared ||
        (selectedPassword as any)?.shareId ||
        (selectedPassword as any)?.shared,
      );

      setModalConfirmMode(false);
      setModalMsgKey("common.deleting");

      if (isShared) {
        try {
          const shareId = (selectedPassword as any)?.shareId || selectedPassword.id;
          if (!shareId) {
            console.warn("Shared password removal: missing shareId");
          } else {
            const resp = await apiRemoveReceivedShareAccess(shareId);
            const status = resp?.status;
            // Treat 200 as success and proceed to remove from list; server returns standardized envelope
            if (status === 200) {
              setModalMsgKey("alerts.passwordDeleted");
              setModalResult(true);

              if (orders) {
                const updatedData = orders.filter(
                  (password) => getPasswordRowKey(password) !== getPasswordRowKey(selectedPassword),
                );
                setOrders(updatedData);
              }
              if (onDelete) {
                onDelete(selectedPassword.id);
              }
            } else {
              setModalTitle("Info");
              setModalMsg(resp?.message || "Your access removal request has been processed.");
              setModalResult(true);
              if (orders) {
                const updatedData = orders.filter(
                  (password) => getPasswordRowKey(password) !== getPasswordRowKey(selectedPassword),
                );
                setOrders(updatedData);
              }
              if (onDelete) {
                onDelete(selectedPassword.id);
              }
            }
          }
        } catch (e) {
          console.error("Failed to remove received share access:", e);
          setModalTitle("Error");
          setModalMsg("Failed to remove access to the shared password. Please try again.");
          setModalResult(true);
        } finally {
          setSelectedPassword(null);
          setIsSharedSelected(false);
        }
        return;
      }

      try {
        const isLocal = !selectedPassword.sync;
        const fromTrash = Boolean(selectedPassword.deletedAt);

        const response = await authContext.removePassword(selectedPassword.id, isLocal, fromTrash);
        console.log("removePassword response:", response);

        if (response && response.ok) {
          setModalMsgKey(fromTrash ? "alerts.passwordDeleted" : "alerts.passwordMovedToTrash");
          setModalResult(true);
        } else {
          setModalVisible(false);
        }

        if (orders) {
          const updatedData = orders.filter(
            (password) => getPasswordRowKey(password) !== getPasswordRowKey(selectedPassword),
          );
          setOrders(updatedData);
        }

        if (onDelete) {
          onDelete(selectedPassword.id);
        }

        console.log("Password removed successfully");
      } catch (error) {
        console.error("Error removing password:", error);
        setModalVisible(false);
      }
    }

    setSelectedPassword(null);
    setIsSharedSelected(false);
  }, [selectedPassword, orders, setOrders, onDelete, authContext]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setModalResult(false);
    setModalConfirmMode(false);
    setModalMsg(undefined);
    setModalTitle(undefined);
    setModalMsgKey(undefined);
    setSelectedPassword(null);
    setIsSharedSelected(false);
  }, []);

  return {
    modalVisible,
    modalResult,
    modalMsgKey,
    modalMsg,
    modalTitle,
    modalConfirmMode,
    handleLongPress,
    handleDeleteConfirm,
    closeModal,
  };
};
