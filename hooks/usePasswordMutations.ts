import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";

import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";
import { addNewPassword, updatePassword, removePassword } from "../utils/passwordService";

export function usePasswordMutations() {
  const queryClient = useQueryClient();
  const { userId } = useContext(AuthContext);

  const addMutation = useMutation({
    mutationFn: async ({
      password,
      toCloud,
      getDEK,
    }: {
      password: any;
      toCloud: boolean;
      getDEK: () => Promise<Uint8Array | null>;
    }) => {
      return await addNewPassword(password, getDEK, toCloud);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.PASSWORDS.ROOT] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, detail }: { id: number | string; detail: any }) => {
      return await updatePassword(id, detail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.PASSWORDS.ROOT] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      id,
      isLocal,
      fromTrash,
      skipTrash,
    }: {
      id?: number | string;
      isLocal?: boolean;
      fromTrash?: boolean;
      skipTrash?: boolean;
    }) => {
      return await removePassword(id, isLocal, fromTrash, skipTrash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.PASSWORDS.ROOT] });
    },
  });

  return {
    addPassword: addMutation,
    updatePassword: updateMutation,
    deletePassword: deleteMutation,
  };
}
