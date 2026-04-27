import * as cheerio from "cheerio";
import { readAphorismSources } from "./aphorismSourcesStore.js";

function buildId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
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

function cleanQuoteText(text) {
  let cleaned = normalizeText(text);

  // обрезаем служебный мусор, который часто идет после цитаты
  const trashMarkers = [
    "Цитата на английском",
    "Скопировать",
    "Поделиться",
    "Сообщить об ошибке",
    "комментар",
    "ироничные цитаты",
    "смешные цитаты",
    "саркастичные цитаты",
    "красивые цитаты",
    "мотивирующие цитаты"
  ];

  for (const marker of trashMarkers) {
    const index = cleaned.toLowerCase().indexOf(marker.toLowerCase());
    if (index > 0) {
      cleaned = cleaned.slice(0, index).trim();
    }
  }

  cleaned = cleaned
    .replace(/\s+—\s+/g, " — ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

function looksLikeTrash(text, sourceLabel) {
  const t = normalizeText(text).toLowerCase();
  const source = normalizeText(sourceLabel).toLowerCase();

  if (!t) return true;
  if (t.length < 12) return true;
  if (t.length > 350) return true;

  // это не афоризм, а мусорные элементы страницы
  const exactTrash = [
    "цитата на английском",
    "скопировать",
    "поделиться",
    "сообщить об ошибке"
  ];

  if (exactTrash.includes(t)) return true;

  // отсекаем элементы, которые равны названию персонажа/источника
  if (source && t === source) return true;

  // отсекаем короткие теги и одиночные слова
  if (!/[.!?…—,:;]/.test(text) && text.split(" ").length < 4) return true;

  return false;
}

function splitDialogs(text) {
  const cleaned = normalizeText(text);

  // диалог из двух реплик оставляем как есть
  if (cleaned.includes("—") && cleaned.length <= 220) {
    return [cleaned];
  }

  return [cleaned];
}

function extractFromCitaty(html, source) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  // Основная идея:
  // берем только крупные карточки цитат/материалов,
  // вырезаем из них служебные куски и оставляем только сам текст цитаты.
  const candidates = [
    ".views-row",
    ".node-quote",
    "article",
    ".quote",
    ".citat"
  ];

  const nodes = $(candidates.join(", "));

  nodes.each((_, el) => {
    const $node = $(el).clone();

    // удаляем очевидный мусор внутри карточки
    $node.find("script, style, noscript").remove();
    $node.find(".comment-count, .comments, .links, .share, .social-likes").remove();
    $node.find("a[href*='copy'], a[href*='report'], a[href*='share']").remove();
    $node.find(".field-name-taxonomy-vocabulary, .tags, .field-name-field-tags").remove();

    let text = cleanQuoteText($node.text());

    if (looksLikeTrash(text, source.label)) return;

    const parts = splitDialogs(text);

    for (const part of parts) {
      const finalText = cleanQuoteText(part);

      if (looksLikeTrash(finalText, source.label)) continue;

      const key = finalText.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        id: buildId(),
        type: "aphorism",
        title: finalText,
        url: source.url,
        source: source.label,
        language: source.language || "ru",
        created_at: new Date().toISOString()
      });
    }
  });

  return results.slice(0, Number(source.limit || 30));
}

export async function loadAphorisms() {
  const sources = await readAphorismSources();
  const enabledSources = sources.filter((item) => item.enabled);

  const allItems = [];

  for (const source of enabledSources) {
    try {
      console.log("loadAphorisms: loading", source.url);
      const html = await fetchHtml(source.url);
      const items = extractFromCitaty(html, source);
      allItems.push(...items);
      console.log("loadAphorisms: loaded", source.url, items.length);
    } catch (error) {
      console.error("loadAphorisms source error:", source.url, error.message);
    }
  }

  return allItems;
}