import {
  validateString,
  validateEmail,
  validatePassword,
  validateNumber,
  validateCreditCardNumber,
  validateExpiryDate,
  validateCVV,
  validateMasterPassword,
} from "../ValidationConstraints";

export const validateInput = (inputId: string, inputValue: string): string | undefined => {
  if (
    inputId === "fullName" ||
    inputId === "firstName" ||
    inputId === "lastName" ||
    inputId === "location" ||
    inputId === "phoneNumber" ||
    inputId === "bio" ||
    inputId === "address" ||
    inputId === "street" ||
    inputId === "postalCode" ||
    inputId === "appartment" ||
    inputId === "destination" ||
    inputId === "ageRange" ||
    inputId === "description" ||
    inputId === "about" ||
    inputId === "creditCardHolderName" ||
    inputId === "addressLine1" ||
    inputId === "addressLine2" ||
    inputId === "bankName" ||
    inputId === "name"
  ) {
    return validateString(inputId, inputValue);
  } else if (inputId === "cardHolderName" || inputId === "cardType" || inputId === "nickname") {
    return validateString(inputId, inputValue, false);
  } else if (inputId === "email" || inputId === "currentEmail" || inputId === "newEmail") {
    return validateEmail(inputId, inputValue);
  } else if (
    inputId === "password" ||
    inputId === "confirmPassword" ||
    inputId === "currentPassword" ||
    inputId === "newPassword" ||
    inputId === "confirmNewPassword"
  ) {
    return validatePassword(inputId, inputValue);
  } else if (inputId === "resetToken") {
    return validateString(inputId, inputValue);
  } else if (inputId === "places") {
    return validateNumber(inputId, inputValue);
  } else if (inputId === "creditCardNumber" || inputId === "cardNumber") {
    return validateCreditCardNumber(inputId, inputValue);
  } else if (inputId === "creditCardExpiryDate" || inputId === "expiryDate") {
    return validateExpiryDate(inputId, inputValue);
  } else if (inputId === "cvv" || inputId === "securityCode") {
    return validateCVV(inputId, inputValue);
  } else if (inputId === "masterPassword" || inputId === "confirmMasterPassword") {
    return validateMasterPassword(inputId, inputValue);
  }
};
