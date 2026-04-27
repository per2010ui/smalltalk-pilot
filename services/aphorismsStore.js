import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "aphorisms.json");

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, "[]", "utf-8");
  }
}

function sanitizeItem(item = {}) {
  return {
    id: String(item.id || "").trim(),
    type: "aphorism",
    title: String(item.title || "").trim(),
    url: String(item.url || "").trim(),
    source: String(item.source || "").trim(),
    language: String(item.language || "ru").trim(),
    created_at: String(item.created_at || new Date().toISOString()).trim()
  };
}

function dedupe(items = []) {
  const map = new Map();

  for (const raw of items) {
    const item = sanitizeItem(raw);
    const key = `${item.title}__${item.source}`.toLowerCase().trim();

    if (!item.title || !item.source) continue;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

export async function readAphorisms() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");

  try {
    const parsed = JSON.parse(raw);
    return dedupe(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

export async function mergeAphorisms(items = []) {
  await ensureFile();

  const current = await readAphorisms();
  const merged = dedupe([...current, ...items]);

  await fs.writeFile(FILE_PATH, JSON.stringify(merged, null, 2), "utf-8");

  return {
    added: merged.length - current.length,
    total: merged.length,
    items: merged
  };
}

export async function clearAphorisms() {
  await ensureFile();
  await fs.writeFile(FILE_PATH, "[]", "utf-8");
}