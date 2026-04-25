import { CONFIG } from "../utils/config";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const apiBaseUrl = trimTrailingSlash(CONFIG.apiURL);

export const PRIVACY_POLICY_URL = `${apiBaseUrl}/legal/privacy`;
export const SUPPORT_URL = `${apiBaseUrl}/legal/support`;
export const DELETE_ACCOUNT_URL = `${apiBaseUrl}/legal/delete-account`;
export const APPLE_STANDARD_EULA_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";
