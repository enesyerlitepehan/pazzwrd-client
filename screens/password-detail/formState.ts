import { Password } from "../../utils/types/passwordTypes";

export type DecryptedPasswordPayload = {
  password?: string;
  userName?: string;
  url?: string;
  description?: string;
  additionalFields?: unknown;
  expireDate?: string | Date;
};

export type PasswordFormValues = {
  name: string;
  userName: string;
  password: string;
  url: string;
  notes: string;
  tags: string;
  expireDate: string;
  sync: boolean;
  updatedAt: string;
};

export type FormState = {
  inputValues: {
    name: string;
    userName: string;
    password: string;
    url: string;
    notes: string;
    tags: string;
    expireDate: string;
    lastUpdated: string;
  };
  inputValidities: {
    name: string | boolean | undefined;
    userName: string | boolean | undefined;
    password: string | boolean | undefined;
    url: string | boolean | undefined;
    notes: string | boolean | undefined;
    tags: string | boolean | undefined;
    expireDate: string | boolean | undefined;
  };
  formIsValid: boolean;
};

export const normalizeDateInput = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.includes("T") ? trimmed.split("T")[0] : trimmed;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }
  const date = new Date(value as any);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

export const normalizeDateTime = (value: unknown): string => {
  if (!value) return "";
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }

  const pad = (num: number) => num.toString().padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${yyyy}-${mm}-${dd} ${hh}-${min}-${ss}`;
};

export const stringifyTags = (tags: unknown): string => {
  if (Array.isArray(tags)) {
    return tags
      .filter((tag): tag is string => typeof tag === "string" && tag.trim() !== "")
      .map((tag) => tag.trim())
      .join(", ");
  }
  return typeof tags === "string" ? tags : "";
};

export const buildFormValues = (
  data?: Password | null,
  decrypted?: DecryptedPasswordPayload | null,
): PasswordFormValues => {
  const metadata = data?.metadataPublic ?? {};
  const privateData = decrypted ?? {};
  const root = (data as Record<string, unknown>) || {};

  const resolveString = (value: unknown): string => (typeof value === "string" ? value : "");

  const resolveField = (key: keyof DecryptedPasswordPayload | string): string => {
    const decryptedValue = (privateData as Record<string, unknown>)[key];
    if (typeof decryptedValue === "string") return decryptedValue;
    const rootValue = root[key];
    return typeof rootValue === "string" ? (rootValue as string) : "";
  };

  const expireRaw =
    privateData.expireDate ??
    (root.expireDate as unknown) ??
    (metadata as Record<string, unknown>).expireDate;

  return {
    name: resolveString((metadata as Record<string, unknown>).name) || resolveField("name"),
    userName: resolveField("userName"),
    password: resolveField("password"),
    url: resolveField("url"),
    notes: resolveString(privateData.description) || resolveString(root.description),
    tags: stringifyTags((metadata as Record<string, unknown>).tags),
    expireDate: normalizeDateInput(expireRaw),
    sync: Boolean(data?.sync),
    updatedAt: normalizeDateTime((metadata as Record<string, unknown>).updatedAt ?? root.updatedAt),
  };
};

export const initialState: FormState = {
  inputValues: {
    name: "",
    userName: "",
    password: "",
    url: "",
    notes: "",
    tags: "",
    expireDate: "",
    lastUpdated: "",
  },
  inputValidities: {
    name: undefined,
    userName: undefined,
    password: undefined,
    url: undefined,
    notes: undefined,
    tags: undefined,
    expireDate: undefined,
  },
  formIsValid: true,
};
