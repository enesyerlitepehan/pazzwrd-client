// Minimal JWT decode (no verification). Works with base64url.
// Ambient declarations for environments without DOM typings
declare const atob: undefined | ((data: string) => string);
declare const Buffer: any;

export function decodeJwtPayload<T = any>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    if (typeof atob === "function") {
      try {
        const pad = b64.length % 4 === 2 ? "==" : b64.length % 4 === 3 ? "=" : "";
        const json = atob(b64 + pad);
        return JSON.parse(json) as T;
      } catch {
        // ignore and try fallback
      }
    }

    // Fallback for environments without atob
    const str = Buffer.from(b64, "base64").toString("utf-8");
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}
