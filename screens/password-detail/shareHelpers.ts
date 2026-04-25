/**
 * Validates if the given string is a valid email address.
 *
 * @param email - The email string to validate.
 * @returns True if valid, false otherwise.
 */
export const isValidEmail = (email: string): boolean => {
  const re = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  return re.test(String(email).toLowerCase());
};
