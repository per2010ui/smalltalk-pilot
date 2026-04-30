import fs from "fs/promises";
import path from "path";
import { supabase, isSupabaseEnabled } from "./supabaseClient.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "aphorisms.json");

const STORAGE_KEY = "aphorisms";

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

/* ================= FILE ================= */

async function readFromFile() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");

  try {
    const parsed = JSON.parse(raw);
    return dedupe(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

async function saveToFile(items) {
  await ensureFile();
  const prepared = dedupe(items);
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
  return dedupe(data?.value || []);
}

async function saveToSupabase(items) {
  const prepared = dedupe(items);

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

export async function readAphorisms() {
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

export async function mergeAphorisms(items = []) {
  const current = await readAphorisms();
  const merged = dedupe([...current, ...items]);

  await saveAphorisms(merged);

  return {
    added: merged.length - current.length,
    total: merged.length,
    items: merged
  };
}

export async function saveAphorisms(items = []) {
  if (isSupabaseEnabled) {
    return await saveToSupabase(items);
  }

  return await saveToFile(items);
}

export async function clearAphorisms() {
  await saveAphorisms([]);
  return [];
}