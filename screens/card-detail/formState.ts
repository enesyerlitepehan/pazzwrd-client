import { formatCardNumber } from "../../utils/cardUtils";

export interface CardFormValues {
  cardHolderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  nickname: string;
  cardType: string;
  bankName: string;
  cardPassword: string;
}

export interface CardFormState {
  inputValues: CardFormValues;
  inputValidities: {
    [key in keyof CardFormValues]: string | boolean | undefined;
  };
  formIsValid: boolean;
}

export const initialCardFormValues: CardFormValues = {
  cardHolderName: "",
  cardNumber: "",
  expiryDate: "",
  cvv: "",
  nickname: "",
  cardType: "",
  bankName: "",
  cardPassword: "",
};

export const initialCardFormState: CardFormState = {
  inputValues: initialCardFormValues,
  inputValidities: {
    cardHolderName: undefined,
    cardNumber: undefined,
    expiryDate: undefined,
    cvv: undefined,
    nickname: undefined,
    cardType: undefined,
    bankName: false,
    cardPassword: undefined,
  },
  formIsValid: false,
};

/**
 * Builds initial form values from card metadata (public fields)
 */
export function buildInitialCardFormValues(cardData: any): CardFormValues {
  const metadata = (cardData.metadataPublic || {}) as any;
  return {
    ...initialCardFormValues,
    cardType: typeof metadata.cardType === "string" ? metadata.cardType : "",
    bankName: typeof metadata.bankName === "string" ? metadata.bankName : "",
  };
}

/**
 * Builds form values from decrypted card data, preserving fields that shouldn't be overwritten
 */
export function buildDecryptedCardFormValues(
  decrypted: any,
  currentValues: CardFormValues,
): CardFormValues {
  const holder = typeof decrypted.cardHolderName === "string" ? decrypted.cardHolderName : "";
  const numberRaw = typeof decrypted.cardNumber === "string" ? decrypted.cardNumber : "";
  const number = numberRaw ? formatCardNumber(numberRaw) : "";
  const expiry = typeof decrypted.expiryDate === "string" ? decrypted.expiryDate : "";
  const cvv = typeof decrypted.cvv === "string" ? decrypted.cvv : "";
  const type = typeof decrypted.cardType === "string" ? decrypted.cardType : "";
  const cardPassword = typeof decrypted.cardPassword === "string" ? decrypted.cardPassword : "";

  return {
    cardHolderName: holder,
    cardNumber: number,
    expiryDate: expiry,
    cvv: cvv,
    nickname: currentValues.nickname || "",
    cardType: type,
    cardPassword,
    // Do not override bankName here; keep whatever was set from metadataPublic
    bankName: currentValues.bankName,
  };
}
