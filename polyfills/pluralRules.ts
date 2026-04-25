// Minimal Intl.PluralRules polyfill for environments (e.g., Hermes) lacking it.
// Covers basic cardinal plural rules for 'en', 'tr', and 'fr'. Falls back to 'other' where uncertain.
// This is intentionally tiny and only implements what i18next needs: select(number).

(function () {
  if (typeof globalThis === "undefined") return;
  const g: any = globalThis as any;
  if (typeof g.Intl !== "object") {
    g.Intl = {} as any;
  }
  if (typeof (g.Intl as any).PluralRules === "function") {
    // Environment already supports PluralRules; do nothing.
    return;
  }

  type Locale = "en" | "tr" | "fr" | string;

  function normalizeLocale(locale?: string): Locale {
    if (!locale) return "en";
    const base = locale.toLowerCase().split("-")[0];
    if (base === "en" || base === "tr" || base === "fr") return base as Locale;
    return base;
  }

  function ruleEn(n: number): "one" | "other" {
    // English: one if integer part is 1 and no fraction; else other.
    return n === 1 ? "one" : "other";
  }

  function ruleTr(_n: number): "other" {
    // Turkish: only other
    return "other";
  }

  function ruleFr(n: number): "one" | "other" {
    // French (simplified): one if 0 or 1; otherwise other.
    return n === 0 || n === 1 ? "one" : "other";
  }

  class PluralRulesPolyfill {
    locale: Locale;
    type: "cardinal" | "ordinal";

    constructor(locale?: string | string[], options?: { type?: "cardinal" | "ordinal" }) {
      const loc = Array.isArray(locale) ? locale[0] : locale;
      this.locale = normalizeLocale(loc);
      this.type = options?.type === "ordinal" ? "ordinal" : "cardinal";
    }

    resolvedOptions() {
      return { locale: this.locale, type: this.type, pluralCategories: ["one", "other"] } as const;
    }

    select(n: number): "zero" | "one" | "two" | "few" | "many" | "other" {
      if (this.type === "ordinal") {
        // Not used by our app; keep simple
        return "other";
      }
      const loc = this.locale;
      switch (loc) {
        case "en":
          return ruleEn(n);
        case "tr":
          return ruleTr(n);
        case "fr":
          return ruleFr(n);
        default:
          // Generic: English-like
          return ruleEn(n);
      }
    }
  }

  (g.Intl as any).PluralRules = PluralRulesPolyfill as any;
})();
