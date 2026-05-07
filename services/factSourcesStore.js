import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "factSources.json");

const DEFAULT_SOURCES = [
  {
    id: "factroom-nauka",
    label: "Factroom / Наука",
    type: "factroom",
    url: "https://www.factroom.ru/nauka",
    enabled: true,
    language: "ru",
    limit: 20
  },
  {
    id: "factroom-animals",
    label: "Factroom / Животные",
    type: "factroom",
    url: "https://www.factroom.ru/zhivotnye",
    enabled: true,
    language: "ru",
    limit: 20
  },
  {
    id: "factroom-world",
    label: "Factroom / Мир",
    type: "factroom",
    url: "https://www.factroom.ru/mir",
    enabled: true,
    language: "ru",
    limit: 20
  },
  {
    id: "factroom-places",
    label: "Factroom / Места",
    type: "factroom",
    url: "https://www.factroom.ru/mesta",
    enabled: true,
    language: "ru",
    limit: 20
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

function sanitize(items = []) {
  if (!Array.isArray(items)) return [];

  const map = new Map();

  for (const item of items) {
    const id = String(item.id || "").trim();
    const label = String(item.label || "").trim();
    const url = String(item.url || "").trim();

    if (!id || !label || !url) continue;

    map.set(id, {
      id,
      label,
      type: String(item.type || "custom"),
      url,
      enabled: Boolean(item.enabled),
      language: String(item.language || "ru"),
      limit: Number(item.limit) || 20
    });
  }

  return Array.from(map.values());
}

export async function readFactSources() {
  await ensureFile();

  const raw = await fs.readFile(FILE_PATH, "utf-8");

  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return [...DEFAULT_SOURCES];
  }
}

export async function saveFactSources(items) {
  await ensureFile();

  const prepared = sanitize(items);

  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(prepared, null, 2),
    "utf-8"
  );

  return prepared;
}

export async function resetFactSources() {
  await ensureFile();

  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(DEFAULT_SOURCES, null, 2),
    "utf-8"
  );

  return [...DEFAULT_SOURCES];
}