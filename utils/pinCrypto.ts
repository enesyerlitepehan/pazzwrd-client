import * as Crypto from "expo-crypto";
import { toB64Url } from "./util";

export interface PinMaterial {
  hash: string;
  salt: string;
}

/**
 * Generates a random salt and hashes the PIN with it.
 * @param pin 4-digit PIN string
 * @returns {PinMaterial} hash and salt
 */
export async function hashPin(pin: string): Promise<PinMaterial> {
  const saltBytes = Crypto.getRandomBytes(16);
  const salt = toB64Url(saltBytes);
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin + salt);
  return { hash, salt };
}

/**
 * Verifies if the entered PIN matches the stored hash and salt.
 * @param enteredPin PIN string entered by the user
 * @param material Stored hash and salt
 * @returns {boolean} true if it matches
 */
export async function verifyPinWithMaterial(
  enteredPin: string,
  material: PinMaterial,
): Promise<boolean> {
  const computedHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    enteredPin + material.salt,
  );
  return computedHash === material.hash;
}
