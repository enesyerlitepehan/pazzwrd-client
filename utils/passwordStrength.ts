// Utility to compute password strength score and improvement suggestions
// Returns a 0-100 score, a coarse category, and localized (or key-based) suggestions

export type StrengthCategory = "NO_PASSWORD" | "WEAK" | "MEDIUM" | "STRONG";

export type Suggestion = {
  key: string; // i18n key (consumer can map to t(key))
  message: string; // already translated if t was provided, otherwise English fallback
  weight?: number; // relative priority for UI ordering (higher -> more important)
};

export type StrengthBreakdown = {
  length: number;
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  onlyOneClass: boolean;
  longestRepeatRun: number;
  hasSequence: boolean;
  commonHit: string | null;
};

export type StrengthResult = {
  score: number; // 0..100
  category: StrengthCategory;
  suggestions: Suggestion[];
  breakdown: StrengthBreakdown;
};

export type StrengthOptions = {
  // Optional translator; if provided, suggestion messages are localized via t(key)
  t?: (key: string, options?: Record<string, any>) => string;
  // Recommended minimum length threshold (default 12)
  minLength?: number;
};

const COMMON_PASSWORDS_MINIMAL = new Set<string>([
  "123456",
  "123456789",
  "qwerty",
  "password",
  "12345",
  "12345678",
  "111111",
  "123123",
  "abc123",
  "1234",
  "qwertyuiop",
  "letmein",
  "iloveyou",
  "admin",
  "welcome",
]);

const SEQUENCES = [
  "abcdefghijklmnopqrstuvwxyz",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "0123456789",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
];

function isEmptyPassword(pw?: string | null): boolean {
  return !pw || !String(pw).trim();
}

function longestRepeatRun(pw: string): number {
  let maxRun = 1;
  let cur = 1;
  for (let i = 1; i < pw.length; i++) {
    if (pw[i] === pw[i - 1]) {
      cur++;
      if (cur > maxRun) maxRun = cur;
    } else {
      cur = 1;
    }
  }
  return maxRun;
}

function containsSequence(pw: string, minLen = 4): boolean {
  if (pw.length < minLen) return false;
  const lowers = pw.toLowerCase();
  for (const base of SEQUENCES) {
    for (let i = 0; i <= base.length - minLen; i++) {
      const sub = base.slice(i, i + minLen);
      if (lowers.includes(sub)) return true;
    }
    // also check reversed sequences
    const rev = base.split("").reverse().join("");
    for (let i = 0; i <= rev.length - minLen; i++) {
      const sub = rev.slice(i, i + minLen);
      if (lowers.includes(sub)) return true;
    }
  }
  return false;
}

function isCommonPassword(pw: string): string | null {
  const s = pw.toLowerCase();
  if (COMMON_PASSWORDS_MINIMAL.has(s)) return s;
  return null;
}

function translate(
  t: StrengthOptions["t"],
  key: string,
  fallback: string,
  options?: Record<string, any>,
): string {
  try {
    if (typeof t === "function") return String(t(key, options));
  } catch {}
  return fallback;
}

export function computePasswordStrength(
  input: string | null | undefined,
  opts?: StrengthOptions,
): StrengthResult {
  const t = opts?.t;
  const minLen = Math.max(4, opts?.minLength ?? 12);

  if (isEmptyPassword(input)) {
    return {
      score: 0,
      category: "NO_PASSWORD",
      suggestions: [
        {
          key: "password.strength.suggestions.providePassword",
          message: translate(
            t,
            "password.strength.suggestions.providePassword",
            "Please enter a password.",
          ),
          weight: 100,
        },
      ],
      breakdown: {
        length: 0,
        hasLower: false,
        hasUpper: false,
        hasDigit: false,
        hasSymbol: false,
        onlyOneClass: true,
        longestRepeatRun: 0,
        hasSequence: false,
        commonHit: null,
      },
    };
  }

  const pw = String(input);
  const length = pw.length;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^a-zA-Z0-9\s]/.test(pw);
  const onlyOneClass = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length === 1;
  const repeatRun = longestRepeatRun(pw);
  const hasSeq = containsSequence(pw);
  const common = isCommonPassword(pw);

  // Base scoring model
  let score = 0;

  // Length contribution (max ~40)
  if (length >= 20) score += 40;
  else if (length >= 16) score += 36;
  else if (length >= 12) score += 30;
  else if (length >= 8) score += 20;
  else if (length >= 6) score += 10;
  else score += 0;

  // Variety contribution (max 24)
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
  score += classes * 6; // 0..24

  // Bonuses (max +12)
  if (hasLower && hasUpper) score += 6;
  if (hasDigit && hasSymbol) score += 6;

  // Long bonuses (max +20)
  if (length >= 20) score += 10;
  if (length >= 24) score += 10;

  // Penalties
  if (onlyOneClass) score -= 10;
  if (repeatRun >= 3) score -= Math.min(10, (repeatRun - 2) * 2);
  if (hasSeq) score -= 10;
  if (common) score -= 30;

  // Clamp to [0, 100]
  score = Math.max(0, Math.min(100, score));

  // Category mapping (aligned with existing UI buckets)
  let category: StrengthCategory = "WEAK";
  if (score >= 70) category = "STRONG";
  else if (score >= 40) category = "MEDIUM";

  // Suggestions
  const suggestions: Suggestion[] = [];
  if (length < minLen) {
    suggestions.push({
      key: "password.strength.suggestions.increaseLength",
      message: translate(
        t,
        "password.strength.suggestions.increaseLength",
        "Use at least {{n}} characters.",
        { n: minLen },
      ),
      weight: 90,
    });
  }
  if (!(hasLower && hasUpper)) {
    suggestions.push({
      key: "password.strength.suggestions.mixedCase",
      message: translate(
        t,
        "password.strength.suggestions.mixedCase",
        "Mix uppercase and lowercase letters.",
      ),
      weight: 70,
    });
  }
  if (!hasDigit) {
    suggestions.push({
      key: "password.strength.suggestions.addNumbers",
      message: translate(t, "password.strength.suggestions.addNumbers", "Add numbers."),
      weight: 60,
    });
  }
  if (!hasSymbol) {
    suggestions.push({
      key: "password.strength.suggestions.addSymbols",
      message: translate(
        t,
        "password.strength.suggestions.addSymbols",
        "Add symbols (e.g., ! @ #).",
      ),
      weight: 60,
    });
  }
  if (onlyOneClass) {
    suggestions.push({
      key: "password.strength.suggestions.useMoreVariety",
      message: translate(
        t,
        "password.strength.suggestions.useMoreVariety",
        "Use a mix of letters, numbers, and symbols.",
      ),
      weight: 80,
    });
  }
  if (hasSeq) {
    suggestions.push({
      key: "password.strength.suggestions.avoidSequences",
      message: translate(
        t,
        "password.strength.suggestions.avoidSequences",
        "Avoid common sequences like 1234 or abcd.",
      ),
      weight: 50,
    });
  }
  if (repeatRun >= 3) {
    suggestions.push({
      key: "password.strength.suggestions.avoidRepetition",
      message: translate(
        t,
        "password.strength.suggestions.avoidRepetition",
        "Avoid repeating the same character many times.",
      ),
      weight: 50,
    });
  }
  if (common) {
    suggestions.push({
      key: "password.strength.suggestions.avoidCommon",
      message: translate(
        t,
        "password.strength.suggestions.avoidCommon",
        "Avoid commonly used passwords.",
      ),
      weight: 95,
    });
  }
  if (length >= minLen && classes <= 2) {
    suggestions.push({
      key: "password.strength.suggestions.usePassphrase",
      message: translate(
        t,
        "password.strength.suggestions.usePassphrase",
        "Consider a longer passphrase with several unrelated words.",
      ),
      weight: 40,
    });
  }

  // Sort by weight desc for nicer UI ordering
  suggestions.sort((a, b) => (b.weight || 0) - (a.weight || 0));

  const breakdown: StrengthBreakdown = {
    length,
    hasLower,
    hasUpper,
    hasDigit,
    hasSymbol,
    onlyOneClass,
    longestRepeatRun: repeatRun,
    hasSequence: hasSeq,
    commonHit: common,
  };

  return { score, category, suggestions, breakdown };
}
