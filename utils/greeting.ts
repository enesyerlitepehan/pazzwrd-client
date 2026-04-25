// Utility to generate a local-time-based greeting message
// Usage: import { getGreeting } from "../utils/greeting";
// getGreeting(); // e.g., "Good afternoon 👋"

import i18n from "../i18n";

export type GreetingKey =
  | "greeting.goodMorning"
  | "greeting.goodAfternoon"
  | "greeting.goodEvening"
  | "greeting.goodNight";

/**
 * Returns a localized greeting message based on the provided date's local time.
 * Default is the current local time.
 *
 * Ranges (inclusive start, exclusive end):
 * - 05:00 - 12:00 -> Good morning
 * - 12:00 - 17:00 -> Good afternoon
 * - 17:00 - 22:00 -> Good evening
 * - 22:00 - 05:00 -> Good night
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  let key: GreetingKey;
  if (hour >= 5 && hour < 12) {
    key = "greeting.goodMorning";
  } else if (hour >= 12 && hour < 17) {
    key = "greeting.goodAfternoon";
  } else if (hour >= 17 && hour < 22) {
    key = "greeting.goodEvening";
  } else {
    key = "greeting.goodNight";
  }

  const base = i18n.t(key);
  return `${base} 👋`;
}
