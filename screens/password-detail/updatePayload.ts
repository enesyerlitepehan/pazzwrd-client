import { InputPassword, Password } from "../../utils/types/passwordTypes";
import { DecryptedPasswordPayload, PasswordFormValues } from "./formState";

export const parseTags = (tags?: string): string[] => {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

export const buildPlainDetails = (
  values: PasswordFormValues,
  passwordData: Password,
  targetIsCloud: boolean,
): InputPassword => {
  return {
    name: (values.name || "").trim(),
    userName: values.userName,
    password: values.password,
    url: values.url,
    description: values.notes,
    expireDate: values.expireDate || undefined,
    tags: parseTags(values.tags),
    sorting: passwordData.metadataPublic?.sorting,
    sortingPin: passwordData.metadataPublic?.sortingPin,
    avatar_id: passwordData.metadataPublic?.avatar_id,
    additionalFields: (passwordData as any)?.additionalFields ?? undefined,
    sync: targetIsCloud,
  };
};

export const buildMetadataPublic = (
  values: PasswordFormValues,
  passwordData: Password,
  strengthScore: number,
): Record<string, any> => {
  const existingMetadata = passwordData.metadataPublic || {};
  const nowISO = new Date().toISOString();
  return {
    ...existingMetadata,
    name: (values.name || "").trim(),
    tags: parseTags(values.tags),
    createdAt: existingMetadata.createdAt ?? nowISO,
    updatedAt: nowISO,
    strength: { score: strengthScore },
  };
};

export const buildPrivatePayload = (
  values: PasswordFormValues,
  passwordData: Password,
): DecryptedPasswordPayload => {
  return {
    password: values.password,
    userName: values.userName,
    url: values.url,
    description: values.notes,
    additionalFields: (passwordData as any)?.additionalFields ?? undefined,
    expireDate: values.expireDate || undefined,
  };
};
