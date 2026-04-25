import { Card } from "../../utils/types/cardTypes";
import { CardFormValues } from "./formState";
import { generateIK, encryptItemWithIK, wrapIKWithDEK, toB64Url } from "../../utils/util";

export const normalizeCardNumber = (s: string) => (s || "").replace(/\s/g, "");

export const buildMetadataPublic = (
  values: CardFormValues,
  cardData: Card,
): Record<string, any> => {
  const existingMetadata = cardData.metadataPublic || {};
  const nowISO = new Date().toISOString();
  const cardNumberWithoutSpaces = normalizeCardNumber(values.cardNumber || "");

  return {
    ...existingMetadata,
    bankName: values.bankName,
    cardType: values.cardType,
    createdAt: existingMetadata.createdAt ?? nowISO,
    updatedAt: nowISO,
    cardNumberLast4: cardNumberWithoutSpaces.slice(-4),
  };
};

export const buildPrivatePayload = (values: CardFormValues) => {
  return {
    cardNumber: normalizeCardNumber(values.cardNumber || ""),
    cardHolderName: values.cardHolderName,
    expiryDate: values.expiryDate,
    cvv: values.cvv,
    cardType: values.cardType,
    cardPassword: values.cardPassword,
  };
};

export const buildCardCreatePayload = async (
  values: CardFormValues,
  cardData: Card,
  targetIsCloud: boolean,
  localDEK: Uint8Array,
  itemId: string,
): Promise<any> => {
  const version = 1;
  const metadataPublic = buildMetadataPublic(values, cardData);
  const privatePayload = buildPrivatePayload(values);

  const itemKey = generateIK();
  const enc = await encryptItemWithIK(itemKey, privatePayload, {
    itemId,
    version,
  });
  const wrapped = await wrapIKWithDEK(itemKey, localDEK);
  itemKey.fill(0);

  return {
    ciphertext: { nonce: toB64Url(enc.nonce), ct: toB64Url(enc.ct) },
    version,
    itemId,
    IKWrappedByDEK: {
      nonce: toB64Url(wrapped.nonce),
      ct: toB64Url(wrapped.ct),
    },
    metadataPublic,
    sync: targetIsCloud,
  };
};

export const buildCardUpdatePayload = async (
  values: CardFormValues,
  cardData: Card,
  targetIsCloud: boolean,
  localDEK: Uint8Array,
  itemId: string,
  nextVersion: number,
): Promise<any> => {
  const metadataPublic = buildMetadataPublic(values, cardData);
  const privatePayload = buildPrivatePayload(values);

  const itemKey = generateIK();
  const enc = await encryptItemWithIK(itemKey, privatePayload, {
    itemId,
    version: nextVersion,
  });
  const wrapped = await wrapIKWithDEK(itemKey, localDEK);
  itemKey.fill(0);

  return {
    ciphertext: { nonce: toB64Url(enc.nonce), ct: toB64Url(enc.ct) },
    version: nextVersion,
    itemId,
    IKWrappedByDEK: {
      nonce: toB64Url(wrapped.nonce),
      ct: toB64Url(wrapped.ct),
    },
    metadataPublic,
    sync: targetIsCloud,
  };
};

export const buildCardRestorePayload = (cardData: Card): any => {
  const nowISO = new Date().toISOString();
  const mp = {
    ...(cardData.metadataPublic || {}),
    updatedAt: nowISO,
  } as Record<string, any>;

  return {
    ciphertext: cardData.ciphertext,
    metadataPublic: mp,
    IKWrappedByDEK: cardData.IKWrappedByDEK,
    itemId: cardData.itemId,
    version: cardData.version,
    sync: Boolean(cardData.sync),
  };
};
