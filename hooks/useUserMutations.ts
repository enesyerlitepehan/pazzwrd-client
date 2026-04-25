import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";

import { updateUser } from "../api/api";
import { QUERY_KEYS } from "../constants/queryKeys";
import { AuthContext } from "../store/auth-context";

export function useUserMutations() {
  const queryClient = useQueryClient();
  const { userId } = useContext(AuthContext);

  const updateMutation = useMutation({
    mutationFn: async (userDetail: {
      userName?: string;
      password?: string;
      mail?: string;
      expireDate?: Date | string;
      fullName?: string;
      nickname?: string;
      dateOfBirth?: Date | string;
    }) => {
      const resp = await updateUser(userDetail);
      return resp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userId, QUERY_KEYS.USER] });
    },
  });

  return {
    updateUser: updateMutation,
  };
}
