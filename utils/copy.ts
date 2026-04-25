import * as Clipboard from "expo-clipboard";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "../components/ToastProvider";

export type CopyWhatKey = "cardNumber" | "cardHolderName" | "username" | "password" | "url";

const CLEAR_DELAY_MS = 10_000; // 60 seconds

/**
 * Hook returning a function to copy text to clipboard, show a localized toast,
 * and automatically clear the clipboard after 60 seconds.
 * The clipboard will only be cleared if it still contains the same value that
 * was copied by this hook, to avoid wiping newer clipboard content.
 *
 * Usage:
 *   const copy = useCopyToClipboard();
 *   copy(item.cardNumber, "cardNumber");
 */
export function useCopyToClipboard() {
  const { show } = useToast();
  const { t } = useTranslation("common");

  // Keep track of the last copied value and the pending clear timer
  const lastCopiedRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastCopiedRef.current = null;
    };
  }, []);

  return async (text: string | null | undefined, what: CopyWhatKey) => {
    const trimmedText = text?.trim() ?? "";
    if (trimmedText.length === 0) {
      const whatLabel = t(`copy.what.${what}`);
      const msg = t("copy.empty", { what: whatLabel });
      show(String(msg), 2500);
      return;
    }

    try {
      await Clipboard.setStringAsync(trimmedText);
      lastCopiedRef.current = trimmedText;

      // Show toast
      const whatLabel = t(`copy.what.${what}`);
      const msg = t("copy.copied", { what: whatLabel });
      show(String(msg), 2500);

      // Reset any previous timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Schedule clipboard clear
      timerRef.current = setTimeout(async () => {
        try {
          const current = await Clipboard.getStringAsync();
          if (current === lastCopiedRef.current) {
            await Clipboard.setStringAsync("");
            lastCopiedRef.current = null;
          }
        } catch {
          // ignore errors
        }
      }, CLEAR_DELAY_MS);
    } catch (e) {
      // Fail silently
    }
  };
}
