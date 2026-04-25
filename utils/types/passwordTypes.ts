export interface newPasswordRequestPayload {
  id?: number | string;
  itemId: string;
  version: number;
  ciphertext: { nonce: string; ct: string };
  IKWrappedByDEK: { nonce: string; ct: string };
  metadataPublic: {
    name?: string;
    tags?: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    sorting?: number;
    sortingPin?: number;
    strength?: { score?: number };
    avatar_id?: string;
  };
}

export interface NewPasswordBackendResponse {
  id: number | string;
  item_id: string;
  version: number;
  ciphertext: { nonce: string; ct: string };
  IK_wrapped_by_DEK: { nonce: string; ct: string };
  createdAt: Date | string;
  sync: boolean;
  metadata_public: {
    name?: string;
    tags?: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    sorting?: number;
    sortingPin?: number;
    strength?: { score?: number };
    avatar_id?: string;
  };
}

export interface NewPassword {
  id: number | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string;
  sync?: boolean;
  itemId?: string;
  version?: number;
  ciphertext?: { nonce: string; ct: string };
  IKWrappedByDEK?: { nonce: string; ct: string };
  metadataPublic?: {
    name?: string;
    tags?: string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    sorting?: number;
    sortingPin?: number;
    strength?: { score?: number };
    avatar_id?: string;
  };
}

export interface NewPasswordQueue extends NewPassword {
  sync: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string;
  pendingSync?: boolean;
  pendingOp?: "create" | "update" | "delete";
}

export interface InputPassword {
  id?: number | string;
  password?: string;
  name?: string;
  userName?: string;
  url?: string;
  sync?: boolean;
  sorting?: number;
  sortingPin?: number;
  description?: string;
  additionalFields?: null | string[];
  expireDate?: Date | string;
  tags?: string[];
  avatar_id?: string;
}

export type EncryptedPasswordPayload = newPasswordRequestPayload & {
  sync?: boolean;
};

export interface Password extends NewPassword {
  [key: string]: any;
}

export interface HandleFieldChange {
  password?: string;
  description?: string;
  url?: string;
  expireDate?: Date;
  sync: boolean;
}

import { ApiResult } from "../../api/core";

export type PasswordResponse = ApiResult<Password[]>;

export type updatePasswordResponse = ApiResult<Password>;

export interface LocalPasswordData {
  passwords: Password[];
  lastUpdated: string;
}
