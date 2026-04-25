import CryptoJS from "crypto-js";

import { Password } from "./types/passwordTypes";

// TODO secretKey should be mail address
const secretKey = "your-secret-key";

// Fields to decrypt
const fieldsToDecrypt = [
  "password",
  "name",
  "userName",
  "url",
  "sorting",
  "sortingPin",
  "description",
];

export const decryptDataList = (dataList: Password[]): Password[] => {
  return dataList.map((item) => {
    Object.entries(item).forEach(([key, value]) => {
      if (fieldsToDecrypt.includes(key)) {
        try {
          item[key] = decrypt(value as string | null);
        } catch (error) {
          console.log("error decrypting field", key, error);
        }
      }
    });
    return item;
  });
};

const decrypt = (value: string | null): any => {
  if (value) {
    const bytes = CryptoJS.AES.decrypt(value, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  return null;
};

export const getFirstLetter = (value: string): string => {
  if (value && value.length > 0) {
    return value.charAt(0).toLowerCase();
  }
  return "";
};

export const removeLocalPasswordUnSyncPass = (
  syncPassword: Password[],
  localPassword: Password[],
) => {
  return localPassword.filter((item) => {
    if (!item.sync) {
      return true;
    }

    return syncPassword.some((syncItem) => syncItem.id === item.id);
  });
};
