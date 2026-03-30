const NEWS_BLACKLIST = [
  "politics",
  "political",
  "government",
  "election",
  "elections",
  "president",
  "prime minister",
  "parliament",
  "senate",
  "minister",
  "mp",
  "congress",
  "campaign",
  "vote",
  "voting",
  "lawmakers",
  "coalition",
  "opposition",
  "sanctions",
  "diplomatic",
  "foreign policy",
  "kremlin",
  "white house",
  "downing street",
  "nato",
  "eu summit",
  "war",
  "ceasefire",
  "military aid",
];

const FACTS_BLACKLIST = [
  "president",
  "king",
  "prime minister",
  "government",
  "empire",
  "war",
  "battle",
  "revolution",
  "election",
  "treaty",
  "parliament",
];

export function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function includesBlacklistedTerm(text, blacklist) {
  return blacklist.some((term) => text.includes(term));
}

export function isAllowedNewsTitle(title = "") {
  const normalized = normalizeText(title);
  if (!normalized) return false;
  return !includesBlacklistedTerm(normalized, NEWS_BLACKLIST);
}

export function isAllowedFactTitle(title = "") {
  const normalized = normalizeText(title);
  if (!normalized) return false;
  return !includesBlacklistedTerm(normalized, FACTS_BLACKLIST);
}

function buildItemKey(item) {
  return `${normalizeText(item.title)}__${normalizeText(item.source)}`;
}

export function dedupeItems(items = []) {
  const map = new Map();

  for (const item of items) {
    if (!item || !item.title || !item.source) continue;

    const key = buildItemKey(item);

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

export function sanitizeNewsItems(items = []) {
  const prepared = items
    .filter(Boolean)
    .map((item) => ({
      ...item,
      title: String(item.title || "").trim(),
      url: String(item.url || "").trim(),
      source: String(item.source || "").trim(),
      language: String(item.language || "en").trim(),
    }))
    .filter((item) => item.title && item.url && item.source)
    .filter((item) => isAllowedNewsTitle(item.title));

  return dedupeItems(prepared);
}

export function sanitizeFactItems(items = []) {
  const prepared = items
    .filter(Boolean)
    .map((item) => ({
      ...item,
      title: String(item.title || "").trim(),
      url: String(item.url || "").trim(),
      source: String(item.source || "").trim(),
      language: String(item.language || "en").trim(),
    }))
    .filter((item) => item.title && item.url && item.source)
    .filter((item) => isAllowedFactTitle(item.title));

  return dedupeItems(prepared);
}