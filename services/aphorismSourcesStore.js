import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "aphorismSources.json");

const DEFAULT_SOURCES = [
  {
    id: "jack-sparrow",
    label: "Капитан Джек Воробей",
    type: "character",
    url: "https://citaty.info/character/kapitan-dzhek-vorobei",
    enabled: true,
    language: "ru",
    limit: 30
  },
  {
    id: "alice-book",
    label: "Алиса в стране чудес",
    type: "book",
    url: "https://citaty.info/book/lyuis-kerroll/alisa-v-strane-chudes",
    enabled: true,
    language: "ru",
    limit: 30
  },
  {
    id: "smeshariki",
    label: "Смешарики",
    type: "animation",
    url: "https://citaty.info/animation/smeshariki",
    enabled: true,
    language: "ru",
    limit: 30
  }
];

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(
      FILE_PATH,
      JSON.stringify(DEFAULT_SOURCES, null, 2),
      "utf-8"
    );
  }
}

function sanitizeSource(item = {}, index = 0) {
  const id = String(item.id || `source-${index + 1}`).trim();
  const label = String(item.label || "").trim();
  const type = String(item.type || "custom").trim();
  const url = String(item.url || "").trim();
  const language = String(item.language || "ru").trim();
  const limitNum = Number(item.limit);

  return {
    id,
    label,
    type,
    url,
    enabled: Boolean(item.enabled),
    language,
    limit: Number.isFinite(limitNum) && limitNum > 0 ? Math.floor(limitNum) : 30
  };
}

function sanitizeSources(items = []) {
  if (!Array.isArray(items)) return [];

  const prepared = items
    .map((item, index) => sanitizeSource(item, index))
    .filter((item) => item.id && item.label && item.url);

  const map = new Map();

  for (const item of prepared) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

export async function readAphorismSources() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");

  try {
    const parsed = JSON.parse(raw);
    return sanitizeSources(parsed);
  } catch {
    return [...DEFAULT_SOURCES];
  }
}

export async function saveAphorismSources(items) {
  await ensureFile();
  const prepared = sanitizeSources(items);

  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(prepared, null, 2),
    "utf-8"
  );

  return prepared;
}

export async function resetAphorismSources() {
  await ensureFile();

  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(DEFAULT_SOURCES, null, 2),
    "utf-8"
  );

  return [...DEFAULT_SOURCES];
}