/**
 * Canadian postal code helpers — shared by background, popup, and content scripts.
 * Format: A1A or A1A1A1 (FSA = first 3 characters; tax jurisdiction follows first letter).
 */
'use strict';

const Postal = {
  FLEX: /^[A-Z]\d[A-Z](\d[A-Z]\d)?$/,
  FULL: /^[A-Z]\d[A-Z]\d[A-Z]\d$/,
  SCRAPE_PATTERN: /\b([A-Z]\d[A-Z])\s?(\d[A-Z]\d)\b/i,

  clean(raw) {
    return String(raw || '').toUpperCase().trim().replace(/\s+/g, '');
  },

  /** @returns {string|null} normalized code or null */
  validate(raw) {
    const c = Postal.clean(raw);
    return Postal.FLEX.test(c) ? c : null;
  },

  /** @returns {string|null} full 6-character code only */
  scrapeFromText(text) {
    const m = text.match(Postal.SCRAPE_PATTERN);
    if (!m) return null;
    const merged = (m[1] + m[2]).toUpperCase();
    return Postal.FULL.test(merged) ? merged : null;
  },

  display(clean) {
    return clean.length === 6 ? `${clean.slice(0, 3)} ${clean.slice(3)}` : clean;
  }
};
