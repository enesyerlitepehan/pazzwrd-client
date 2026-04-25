import { validate } from "validate.js";

import i18n from "../i18n";

// NOTE: All validator messages must be sourced from i18n. Do not hardcode English strings here.

interface Constraints {
  [key: string]: {
    presence?: { allowEmpty: boolean; message?: string };
    format?: { pattern: RegExp; message: string; flags?: string };
    email?: boolean | { message: string };
    length?: { minimum: number; message: string };
    numericality?: { message: string };
  };
}

export const validateString = (
  id: string,
  value: string,
  required: boolean = true,
): string | undefined => {
  if (!required && (value === undefined || value === null || value === "")) {
    return undefined;
  }

  const constraints: Constraints = {
    [id]: {
      presence: {
        allowEmpty: false,
        message: i18n.t("errors.required"),
      },
    },
  };

  const validationResult = validate({ [id]: value }, constraints);
  return validationResult && validationResult[id]?.[0];
};

export const validateEmail = (id: string, value: string): string | undefined => {
  const constraints: Constraints = {
    [id]: {
      presence: {
        allowEmpty: false,
        message: i18n.t("errors.required"),
      },
    },
  };

  if (value !== "") {
    constraints[id].email = { message: i18n.t("errors.invalidEmail") };
  }

  const validationResult = validate({ [id]: value }, constraints);
  return validationResult && validationResult[id]?.[0];
};

export const validatePassword = (id: string, value: string): string | undefined => {
  const constraints: Constraints = {
    [id]: {
      presence: {
        allowEmpty: false,
        message: i18n.t("errors.required"),
      },
    },
  };

  if (value !== "") {
    constraints[id].length = {
      minimum: 6,
      message: i18n.t("errors.minLength", { count: 6 }),
    };
  }

  const validationResult = validate({ [id]: value }, constraints);
  return validationResult && validationResult[id]?.[0];
};

export const validateMasterPassword = (id: string, value: string): string | undefined => {
  const constraints: Constraints = {
    [id]: {
      presence: {
        allowEmpty: false,
        message: i18n.t("errors.required"),
      },
    },
  };

  if (value !== "") {
    constraints[id].length = {
      minimum: 6,
      message: i18n.t("errors.minLength", { count: 6 }),
    };
  }

  const validationResult = validate({ [id]: value }, constraints);
  return validationResult && validationResult[id]?.[0];
};

export const validateNumber = (id: string, value: string): string | undefined => {
  const constraints: Constraints = {
    [id]: {
      presence: {
        allowEmpty: false,
        message: i18n.t("errors.required"),
      },
      numericality: {
        message: i18n.t("errors.valueMustBeNumber"),
      },
    },
  };

  const validationResult = validate({ [id]: value }, constraints);
  return validationResult && validationResult[id]?.[0];
};

export const validateCreditCardNumber = (
  id: string,
  value: string,
  required: boolean = false,
): string | undefined => {
  // Remove any non-digit characters for validation
  const digitsOnly = (value || "").replace(/\D/g, "");

  // Check if we have more than 16 digits
  if (digitsOnly.length > 16) {
    return i18n.t("errors.creditCardDigits", { count: 16 });
  }

  if (required && digitsOnly === "") {
    return i18n.t("errors.required");
  }

  return undefined;
};

export const validateCVV = (
  id: string,
  value: string,
  required: boolean = false,
): string | undefined => {
  if (!required && (value === undefined || value === null || value === "")) {
    return undefined;
  }

  const constraints: Constraints = {
    [id]: {
      presence: {
        allowEmpty: false,
        message: i18n.t("errors.required"),
      },
      format: {
        pattern: /^[0-9]{3,4}$/,
        message: i18n.t("errors.invalidCVV"),
      },
    },
  };

  const validationResult = validate({ [id]: value }, constraints);
  return validationResult && validationResult[id]?.[0];
};

export const validateExpiryDate = (
  id: string,
  value: string,
  required: boolean = false,
): string | undefined => {
  if (!required && (value === undefined || value === null || value === "")) {
    return undefined;
  }

  const constraints: Constraints = {
    [id]: {
      presence: {
        allowEmpty: false,
        message: i18n.t("errors.required"),
      },
      format: {
        pattern: /^(0[1-9]|1[0-2])\/?([0-9]{2})$/,
        message: i18n.t("errors.invalidExpiry"),
      },
    },
  };

  const validationResult = validate({ [id]: value }, constraints);
  return validationResult && validationResult[id]?.[0];
};
