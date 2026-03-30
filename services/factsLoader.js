import { sanitizeFactItems } from "./contentFilter.js";

const FACT_TYPES = ["births", "holidays", "events"];
const WIKIMEDIA_LANG = "en";

function getTodayParts() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return { month, day };
}

function buildFactUrl(pages = []) {
  const firstPage = Array.isArray(pages) ? pages[0] : null;
  const contentUrls = firstPage?.content_urls;
  const desktopUrl = contentUrls?.desktop?.page;
  const mobileUrl = contentUrls?.mobile?.page;

  return desktopUrl || mobileUrl || "";
}

function mapFactItem(item, type) {
  const year = item?.year ? `${item.year} — ` : "";
  const text = item?.text || "";
  const title = `${year}${text}`.trim();

  return {
    id: `${Date.now()}_${Math.random()}`,
    type: "fact",
    title,
    url: buildFactUrl(item?.pages),
    source: `Wikimedia ${type}`,
    language: WIKIMEDIA_LANG,
    created_at: new Date().toISOString(),
  };
}

async function loadFactsByType(type, month, day) {
  const url = `https://api.wikimedia.org/feed/v1/wikipedia/${WIKIMEDIA_LANG}/onthisday/${type}/${month}/${day}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "smalltalk-pilot/1.0",
      },
    });

    if (!response.ok) {
      console.error("Wikimedia load error:", type, response.status);
      return [];
    }

    const data = await response.json();
    const items = Array.isArray(data?.[type]) ? data[type] : [];

    return items.map((item) => mapFactItem(item, type));
  } catch (e) {
    console.error("Wikimedia fetch error:", type, e.message);
    return [];
  }
}

export async function loadFacts() {
  const { month, day } = getTodayParts();
  const allItems = [];

  for (const type of FACT_TYPES) {
    const items = await loadFactsByType(type, month, day);
    allItems.push(...items);
  }

  return sanitizeFactItems(allItems);
}