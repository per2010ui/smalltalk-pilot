import fs from "fs";
import path from "path";
import { supabase, isSupabaseEnabled } from "./supabaseClient.js";

const DATA_DIR = path.resolve("data");
const DATA_FILE = path.resolve("data/history.json");
const STORAGE_KEY = "history";

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function sanitizeHistory(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(Boolean);
}

/* FILE fallback */

function readFromFile() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return sanitizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveToFile(items) {
  ensureDataFile();
  const prepared = sanitizeHistory(items);
  fs.writeFileSync(DATA_FILE, JSON.stringify(prepared, null, 2), "utf-8");
  return prepared;
}

/* SUPABASE */

async function readFromSupabase() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", STORAGE_KEY)
    .single();

  if (error) return null;
  return sanitizeHistory(data?.value || []);
}

async function saveToSupabase(items) {
  const prepared = sanitizeHistory(items);

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

  if (error) throw error;

  return prepared;
}

/* API */

export async function readHistory() {
  if (isSupabaseEnabled) {
    const data = await readFromSupabase();

    if (data) {
      return data;
    }

    const localData = readFromFile();
    await saveToSupabase(localData);
    return localData;
  }

  return readFromFile();
}

export async function saveHistory(item) {
  const list = await readHistory();
  list.unshift(item);

  if (isSupabaseEnabled) {
    await saveToSupabase(list);
  } else {
    saveToFile(list);
  }

  return list;
}