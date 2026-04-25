export const QUERY_KEYS = {
  USER: "user",
  ENTITLEMENTS: "entitlements",
  PLANS: "plans",
  PASSWORDS: {
    ROOT: "passwords",
    CLOUD: "cloud",
    LOCAL: "local",
    TRASH: "trash",
  },
  CARDS: {
    ROOT: "cards",
    CLOUD: "cloud",
    LOCAL: "local",
    TRASH: "trash",
  },
  SHARES: {
    ROOT: "shares",
    RECEIVED: "received",
  },
} as const;
