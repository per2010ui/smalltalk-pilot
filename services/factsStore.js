import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "facts.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, "[]", "utf-8");
  }
}

function normalizeText(value = "") {
  return String(value).toLowerCase().trim().replace(/\s+/g, " ");
}

function buildKey(item) {
  return `${normalizeText(item.title)}__${normalizeText(item.source)}`;
}

export async function readFacts() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveFacts(items) {
  await ensureFile();
  await fs.writeFile(FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
  return items;
}

export async function mergeFacts(items) {
  const existing = await readFacts();
  const map = new Map();

  for (const item of existing) {
    map.set(buildKey(item), item);
  }

  let added = 0;

  for (const item of items) {
    const key = buildKey(item);
    if (!map.has(key)) {
      map.set(key, item);
      added += 1;
    }
  }

  const merged = Array.from(map.values());
  await saveFacts(merged);

  return {
    added,
    total: merged.length,
    items: merged,
  };
}

export async function clearFacts() {
  await saveFacts([]);
  return [];
}