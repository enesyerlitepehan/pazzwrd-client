import { images } from "../../constants";

export const MASKED_VALUE = "••••••••";

export const getAvatarSource = (avatarId: string | undefined) => {
  if (!avatarId) return images.passwordIcon;
  const key = `avatar_avatars_128_${avatarId.replace(/\//g, "_")}`;
  return (images as any)[key] || images.passwordIcon;
};
