/**
 * Returns the Unicode flag emoji for a given ISO 3166-1 alpha-2 country code.
 * No external library; uses regional indicator symbols (e.g. EC -> 🇪🇨).
 * @param {string} countryCode - Two-letter ISO code (e.g. "EC", "MX")
 * @returns {string} Flag emoji or empty string if invalid
 */
export function getFlagEmoji(countryCode) {
  if (!countryCode || typeof countryCode !== "string" || countryCode.length !== 2) {
    return "";
  }
  const code = countryCode.toUpperCase();
  const codePoints = code.split("").map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
