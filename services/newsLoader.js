import Parser from "rss-parser";
import { sanitizeNewsItems } from "./contentFilter.js";

const parser = new Parser();

// только тематические RSS
const RSS_FEEDS = [
  {
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    source: "BBC Technology",
  },
  {
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    source: "BBC Science",
  },
  {
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    source: "NYTimes Tech",
  },
];

function mapItem(item, source) {
  return {
    id: `${Date.now()}_${Math.random()}`,
    type: "news",
    title: item.title || "",
    url: item.link || "",
    source,
    language: "en",
    created_at: new Date().toISOString(),
  };
}

export async function loadNews() {
  const allItems = [];

  console.log("loadNews: started");

  for (const feed of RSS_FEEDS) {
    try {
      console.log("loadNews: loading", feed.url);

      const parsed = await parser.parseURL(feed.url);

      console.log("loadNews: loaded", feed.url);

      const items = (parsed.items || []).map((item) =>
        mapItem(item, feed.source)
      );

      allItems.push(...items);
    } catch (e) {
      console.error("RSS load error:", feed.url, e.message);
    }
  }

  const cleaned = sanitizeNewsItems(allItems);

  console.log("loadNews: cleaned =", cleaned.length);

  return cleaned;
}