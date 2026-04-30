import fs from "fs/promises";
import path from "path";
import { supabase, isSupabaseEnabled } from "./supabaseClient.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "news.json");

const STORAGE_KEY = "news";

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

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      ...item,
      title: String(item?.title || "").trim(),
      source: String(item?.source || "").trim(),
      url: String(item?.url || "").trim(),
      language: String(item?.language || "").trim()
    }))
    .filter((item) => item.title);
}

/* ================= FILE ================= */

async function readFromFile() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");

  try {
    const parsed = JSON.parse(raw);
    return sanitizeItems(parsed);
  } catch {
    return [];
  }
}

async function saveToFile(items) {
  await ensureFile();
  const prepared = sanitizeItems(items);
  await fs.writeFile(FILE_PATH, JSON.stringify(prepared, null, 2), "utf-8");
  return prepared;
}

/* ================= SUPABASE ================= */

async function readFromSupabase() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", STORAGE_KEY)
    .single();

  if (error) return null;
  return sanitizeItems(data?.value || []);
}

async function saveToSupabase(items) {
  const prepared = sanitizeItems(items);

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        key: STORAGE_KEY,
        value: prepared,
        updated_at: new Date().toISOString()
      },
      { onConflict: "key" }
    );

  if (error) {
    throw error;
  }

  return prepared;
}

/* ================= API ================= */

export async function readNews() {
  if (isSupabaseEnabled) {
    const data = await readFromSupabase();

    if (data) {
      return data;
    }

    const localData = await readFromFile();
    await saveToSupabase(localData);
    return localData;
  }

  return await readFromFile();
}

export async function saveNews(items) {
  if (isSupabaseEnabled) {
    return await saveToSupabase(items);
  }

  return await saveToFile(items);
}

export async function mergeNews(items) {
  const existing = await readNews();
  const map = new Map();

  for (const item of existing) {
    map.set(buildKey(item), item);
  }

  let added = 0;

  for (const item of sanitizeItems(items)) {
    const key = buildKey(item);
    if (!map.has(key)) {
      map.set(key, item);
      added += 1;
    }
  }

  const merged = Array.from(map.values());
  await saveNews(merged);

  return {
    added,
    total: merged.length,
    items: merged
  };
}

export async function clearNews() {
  await saveNews([]);
  return [];
}