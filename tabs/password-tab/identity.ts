import { Password } from "../../utils/types/passwordTypes";

export function getPasswordRowKey(item: Password | null | undefined): string {
  const shareId = (item as any)?.shareId;
  const isShared = Boolean((item as any)?.isShared || shareId || (item as any)?.shared);

  if (isShared) {
    return `shared:${String(shareId ?? item?.id ?? item?.itemId ?? "")}`;
  }

  return `owned:${String(item?.id ?? item?.itemId ?? "")}`;
}
