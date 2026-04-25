import "../polyfills/pluralRules";
import * as SecureStore from "expo-secure-store";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import frCommon from "../locales/fr/common.json";
import trCommon from "../locales/tr/common.json";
import esCommon from "../locales/es/common.json";
import ptBRCommon from "../locales/pt-BR/common.json";
import deCommon from "../locales/de/common.json";
import arCommon from "../locales/ar/common.json";
import itCommon from "../locales/it/common.json";
import hiCommon from "../locales/hi/common.json";
import idCommon from "../locales/id/common.json";
import jaCommon from "../locales/ja/common.json";
import koCommon from "../locales/ko/common.json";
import nlCommon from "../locales/nl/common.json";

export type AppLanguage =
  | "en"
  | "tr"
  | "fr"
  | "es"
  | "pt-BR"
  | "de"
  | "ar"
  | "it"
  | "hi"
  | "id"
  | "ja"
  | "ko"
  | "nl";

const resources = {
  en: { common: enCommon },
  tr: { common: trCommon },
  fr: { common: frCommon },
  es: { common: esCommon },
  "pt-BR": { common: ptBRCommon },
  de: { common: deCommon },
  ar: { common: arCommon },
  it: { common: itCommon },
  hi: { common: hiCommon },
  id: { common: idCommon },
  ja: { common: jaCommon },
  ko: { common: koCommon },
  nl: { common: nlCommon },
} as const;

// i18next expects resources grouped by namespace; our JSON files are already namespaced
// as they are the content of the 'common' namespace.
i18n
  .use(initReactI18next)
  .init({
    resources,
    ns: ["common"],
    defaultNS: "common",
    fallbackLng: "en",
    compatibilityJSON: "v4",
    interpolation: { escapeValue: false },
    returnNull: false,
  })
  .catch(() => {});

const LANGUAGE_KEY = "app_language";
const LEGACY_LANGUAGE_KEY = "@app_language";
const SUPPORTED_LANGUAGES: AppLanguage[] = [
  "en",
  "tr",
  "fr",
  "es",
  "pt-BR",
  "de",
  "ar",
  "it",
  "hi",
  "id",
  "ja",
  "ko",
  "nl",
];

function isValidLanguage(lang: string | null | undefined): lang is AppLanguage {
  return !!lang && SUPPORTED_LANGUAGES.includes(lang as AppLanguage);
}

export async function getAppLanguage(): Promise<AppLanguage> {
  // 1. Saved app language
  try {
    const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
    if (isValidLanguage(stored)) return stored;
  } catch {}

  // 2. Legacy key migration
  try {
    const legacy = await SecureStore.getItemAsync(LEGACY_LANGUAGE_KEY);
    if (isValidLanguage(legacy)) {
      try {
        await SecureStore.setItemAsync(LANGUAGE_KEY, legacy);
        await SecureStore.deleteItemAsync(LEGACY_LANGUAGE_KEY);
      } catch {}
      return legacy;
    }
  } catch {}

  // 3. Detect device language
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const { languageCode, languageTag } = locales[0];
      const code = languageCode?.toLowerCase();
      const tag = languageTag;

      if (isValidLanguage(tag)) return tag;
      if (isValidLanguage(code)) return code;

      // Special handling for Portuguese -> pt-BR
      if (code === "pt") return "pt-BR";
    }
  } catch {}

  // 4. English fallback
  return "en";
}

export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  try {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
    try {
      await SecureStore.deleteItemAsync(LEGACY_LANGUAGE_KEY);
    } catch {}
  } catch {}
  await i18n.changeLanguage(lang);
}

/**
 * Persists the currently active i18n language if no saved app language exists.
 * This is intended to be called after a successful login to make the initial
 * (possibly device-based) language choice persistent.
 */
export async function persistActiveLanguage(): Promise<void> {
  try {
    const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
    if (!isValidLanguage(stored)) {
      const current = i18n.language;
      if (isValidLanguage(current)) {
        await SecureStore.setItemAsync(LANGUAGE_KEY, current);
        try {
          await SecureStore.deleteItemAsync(LEGACY_LANGUAGE_KEY);
        } catch {}
      }
    }
  } catch {}
}

// Initialize language from storage on startup
(async () => {
  const lang = await getAppLanguage();
  if (i18n.language !== lang) {
    await i18n.changeLanguage(lang);
  }
})();

export default i18n;
