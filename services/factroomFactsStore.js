import fs from "fs/promises";
import path from "path";
import { supabase, isSupabaseEnabled } from "./supabaseClient.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "factroomFacts.json");

const STORAGE_KEY = "factroom_facts";

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
      id: String(item?.id || "").trim(),
      type: "factroomFact",
      title: String(item?.title || "").trim(),
      source: String(item?.source || "").trim(),
      url: String(item?.url || "").trim(),
      language: String(item?.language || "ru").trim(),
      created_at: String(item?.created_at || new Date().toISOString()).trim()
    }))
    .filter((item) => item.title);
}

async function readFromFile() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");

  try {
    return sanitizeItems(JSON.parse(raw));
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

  if (error) throw error;

  return prepared;
}

export async function readFactroomFacts() {
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

export async function saveFactroomFacts(items) {
  if (isSupabaseEnabled) {
    return await saveToSupabase(items);
  }

  return await saveToFile(items);
}

export async function mergeFactroomFacts(items) {
  const existing = await readFactroomFacts();
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
  await saveFactroomFacts(merged);

  return {
    added,
    total: merged.length,
    items: merged
  };
}

export async function clearFactroomFacts() {
  await saveFactroomFacts([]);
  return [];
}