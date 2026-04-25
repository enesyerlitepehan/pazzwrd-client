type AvatarMeta = {
  id: string;
  path: string;
  title?: string;
  caption?: string;
  tags: string[];
};

type AvatarMatch = {
  avatar: AvatarMeta;
  score: number;
  matchedTokens: string[];
};

type MatchOptions = {
  randomness?: number; // 0..1 (0 = deterministic, 1 = uniform among candidates)
  topK?: number; // number of top candidates to consider
  minScore?: number; // if max score below this, fall back to random
  seed?: number; // optional deterministic seed
  multiTokenBonus?: number; // bonus multiplier per extra matched token
};

const avatarData = require("../assets/images/avatars_128/avatars.json");
const AVATARS: AvatarMeta[] = (avatarData?.items || []) as AvatarMeta[];

const QUERY_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "with",
  "on",
  "in",
  "to",
  "for",
  "from",
  "by",
  "at",
  "as",
  "my",
  "me",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "password",
  "login",
]);

const QUERY_SYNONYMS: Record<string, string[]> = {
  psn: ["playstation"],
  ps: ["playstation"],
  ps4: ["playstation"],
  ps5: ["playstation"],
  playstation: ["psn", "ps", "sony"],
  xboxlive: ["xbox", "xbox-live"],
  xbox: ["xbox-live"],
  gdrive: ["google-drive"],
  drive: ["google-drive"],
  icloud: ["icloud"],
  gcp: ["google-cloud"],
  aws: ["amazon-web-services", "amazon"],
  azure: ["microsoft-azure", "microsoft"],
  yt: ["youtube"],
  youtube: ["yt"],
  ig: ["instagram"],
  insta: ["instagram"],
  fb: ["facebook"],
  wa: ["whatsapp"],
  tg: ["telegram"],
  ms: ["microsoft"],
  ms365: ["microsoft-365", "office-365"],
  office365: ["microsoft-365", "office"],
  gws: ["google-workspace"],
  primevideo: ["amazon-prime-video", "prime-video", "amazon"],
  disneyplus: ["disney-plus", "disney"],
  hbomax: ["hbo-max", "hbo", "max"],
};

const normalizeToken = (value: string) => {
  const replaced = value.toLowerCase().replace(/\+/g, " plus ").replace(/&/g, " and ");
  const slug = replaced.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug;
};

const tokenizeQuery = (value: string) => {
  const raw = value
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean);
};

const expandQueryTokens = (tokens: string[]) => {
  const expanded = new Set<string>();
  const baseTokens: string[] = [];
  const bonusTokens = new Set<string>();

  for (const token of tokens) {
    if (QUERY_STOPWORDS.has(token)) continue;
    const normalized = normalizeToken(token);
    if (normalized) {
      expanded.add(normalized);
      bonusTokens.add(normalized);
      baseTokens.push(normalized);
    }

    const synonymList = QUERY_SYNONYMS[token] || QUERY_SYNONYMS[normalized];
    if (synonymList) {
      for (const syn of synonymList) {
        const n = normalizeToken(syn);
        if (n) {
          expanded.add(n);
          bonusTokens.add(n);
        }
      }
    }
  }

  const list = [...new Set(baseTokens)].filter(Boolean);
  const ngrams = new Set<string>();
  for (let i = 0; i < list.length; i++) {
    for (let n = 2; n <= 3; n++) {
      if (i + n <= list.length) {
        const gram = list.slice(i, i + n).join("-");
        ngrams.add(gram);
      }
    }
  }
  for (const gram of ngrams) expanded.add(gram);
  return {
    tokens: [...expanded],
    bonusTokens,
  };
};

const tokensFromId = (id: string) => {
  const raw = id.replace(/__/g, "_").replace(/\//g, "_");
  const parts = raw.split(/_+/).filter(Boolean);
  return parts.map(normalizeToken).filter(Boolean);
};

const buildTokenFrequency = () => {
  const freq: Record<string, number> = {};
  for (const avatar of AVATARS) {
    const tokenSet = new Set<string>(avatar.tags);
    for (const tok of tokensFromId(avatar.id)) tokenSet.add(tok);
    for (const tok of tokenSet) {
      if (!tok) continue;
      freq[tok] = (freq[tok] || 0) + 1;
    }
  }
  return freq;
};

const TOKEN_FREQ = buildTokenFrequency();
const TOTAL_AVATARS = AVATARS.length;

const tokenWeight = (token: string) => {
  const df = TOKEN_FREQ[token] || 0;
  if (df === 0) return 0;
  return Math.log(1 + TOTAL_AVATARS / df);
};

const createRng = (seed?: number) => {
  if (seed === undefined) return Math.random;
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const pickWeighted = (items: AvatarMatch[], randomness: number, rng: () => number) => {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  if (randomness <= 0) return items[0];

  const gamma = Math.max(0.05, 1 - randomness);
  const weights = items.map((item) => Math.pow(Math.max(item.score, 0.001), gamma));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
};

export const getAvatarMatches = (name: string, options: MatchOptions = {}) => {
  const expanded = expandQueryTokens(tokenizeQuery(name));
  const tokens = expanded.tokens;
  if (tokens.length === 0) return [];
  const tokenSet = new Set(tokens);
  const bonusTokens = expanded.bonusTokens;

  const matches: AvatarMatch[] = [];
  const multiTokenBonus = options.multiTokenBonus ?? 0.18;
  for (const avatar of AVATARS) {
    const matchTokens = new Set<string>(avatar.tags);
    for (const tok of tokensFromId(avatar.id)) matchTokens.add(tok);

    let score = 0;
    const matched: string[] = [];
    const bonusMatched = new Set<string>();
    for (const tok of tokenSet) {
      if (matchTokens.has(tok)) {
        const w = tokenWeight(tok);
        if (w > 0) {
          score += w;
          matched.push(tok);
          if (bonusTokens.has(tok)) bonusMatched.add(tok);
        }
      }
    }
    if (bonusMatched.size >= 2 && multiTokenBonus > 0) {
      const bonusFactor = 1 + multiTokenBonus * (bonusMatched.size - 1);
      score *= bonusFactor;
    }
    if (score > 0) {
      matches.push({ avatar, score, matchedTokens: matched });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
};

export const pickAvatarForName = (name: string, options: MatchOptions = {}) => {
  const randomness = options.randomness ?? 0.35;
  const topK = options.topK ?? 8;
  const minScore = options.minScore ?? 0;
  const rng = createRng(options.seed);

  const matches = getAvatarMatches(name, options);
  if (matches.length === 0) {
    const idx = Math.floor(rng() * Math.max(AVATARS.length, 1));
    return AVATARS[idx] || null;
  }

  const maxScore = matches[0].score;
  if (maxScore < minScore) {
    const idx = Math.floor(rng() * Math.max(AVATARS.length, 1));
    return AVATARS[idx] || null;
  }

  const candidates = matches.slice(0, Math.max(1, topK));
  const picked = pickWeighted(candidates, randomness, rng);
  return picked ? picked.avatar : null;
};

export type { AvatarMeta, AvatarMatch, MatchOptions };
