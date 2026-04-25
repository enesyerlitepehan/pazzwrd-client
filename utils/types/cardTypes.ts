export interface CardData {
  id?: string | number;
  cardNumber: string;
  cardHolderName: string;
  expiryDate: string;
  cvv: string;
  cardType: string;
  bankName?: string;
  nickName?: string;
  sync?: boolean;
  sorting?: number;
  sortingPin?: boolean;
  description?: string;
  additionalFields?: any;
  tags?: string[];
  deletedAt?: Date | string;
  pendingSync?: boolean;
  pendingOp?: "create" | "update" | "delete";
}

export interface Card {
  id?: number | string;
  itemId?: string;
  version?: number;
  ciphertext?: { nonce: string; ct: string };
  IKWrappedByDEK?: { nonce: string; ct: string };
  metadataPublic?: {
    bankName?: string;
    cardType?: string;
    cardNumberLast4?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    sorting?: number;
    sortingPin?: boolean;
  };
  sync?: boolean;
  deletedAt?: Date | string;
  pendingSync?: boolean;
  pendingOp?: "create" | "update" | "delete";
  [key: string]: any;
}

import { ApiResult } from "../../api/core";

export type CardResponse = ApiResult<Card[]>;

export type SingleCardResponse = ApiResult<Card>;

export interface LocalCardData {
  cards: Card[];
  lastUpdated: string;
}
