import * as cheerio from "cheerio";
import { readFactSources } from "./factSourcesStore.js";

function buildId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 SmallTalkPilot/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return await response.text();
}

function cleanTitle(text) {
  return normalizeText(text)
    .replace(/\s*Читать\s*→?\s*$/i, "")
    .trim();
}

function looksBadTitle(text) {
  const t = normalizeText(text).toLowerCase();

  if (!t) return true;
  if (t.length < 20) return true;
  if (t.length > 180) return true;

  const blocked = [
    "полит",
    "войн",
    "убий",
    "смерт",
    "труп",
    "катастроф",
    "насил",
    "скандал",
    "развод",
    "маньяк",
    "гитлер",
    "сталин",
    "каннибал",
    "путин",
    "трамп",
    "криминал",
    "наркотик",
    "оружие",
    "секс",
    "религ"
  ];

  return blocked.some((word) => t.includes(word));
}

function isFactroomArticleUrl(href) {
  if (!href) return false;

  const blockedParts = [
    "/page/",
    "/random",
    "#",
    "mailto:",
    "javascript:"
  ];

  return !blockedParts.some((part) => href.includes(part));
}

function extractFactroomItems(html, source) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  $("a").each((_, el) => {
    const rawTitle = normalizeText($(el).text());
    const title = cleanTitle(rawTitle);
    const href = String($(el).attr("href") || "").trim();

    if (!isFactroomArticleUrl(href)) return;
    if (looksBadTitle(title)) return;

    let url = "";

    try {
      url = href.startsWith("http")
        ? href
        : new URL(href, source.url).toString();
    } catch {
      return;
    }

    if (!url.includes("factroom.ru")) return;

    const key = title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    results.push({
      id: buildId(),
      type: "factroomFact",
      title,
      source: source.label || "Factroom",
      url,
      language: source.language || "ru",
      created_at: new Date().toISOString()
    });
  });

  return results.slice(0, Number(source.limit || 20));
}

export async function loadFactroomFacts() {
  const sources = await readFactSources();
  const enabledSources = sources.filter((item) => item.enabled);

  const allItems = [];

  for (const source of enabledSources) {
    try {
      console.log("loadFactroomFacts: loading", source.url);

      const html = await fetchHtml(source.url);
      const items = extractFactroomItems(html, source);

      allItems.push(...items);

      console.log("loadFactroomFacts: loaded", source.url, items.length);
    } catch (error) {
      console.error("loadFactroomFacts source error:", source.url, error.message);
    }
  }

  return allItems;
}