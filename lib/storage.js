import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "db.json");

const emptyDb = {
  history: []
};

export async function ensureDb() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(emptyDb, null, 2), "utf-8");
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(dbPath, "utf-8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf-8");
}

export async function getHistory() {
  const db = await readDb();
  return Array.isArray(db.history) ? db.history.slice().reverse() : [];
}

export async function saveHistoryItem(item) {
  const db = await readDb();
  db.history = Array.isArray(db.history) ? db.history : [];
  db.history.push(item);
  db.history = db.history.slice(-50);
  await writeDb(db);
}