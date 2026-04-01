import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { loadNews } from "./services/newsLoader.js";
import { readNews, mergeNews, clearNews } from "./services/newsStore.js";
import { loadFacts } from "./services/factsLoader.js";
import { readFacts, mergeFacts, clearFacts } from "./services/factsStore.js";
import {
  readDictionaries,
  saveDictionaries,
  resetDictionaries
} from "./services/dictionariesStore.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json());
app.use(express.static("public"));

const DATA_DIR = path.resolve("data");
const DATA_FILE = path.resolve("data/history.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readHistory() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(item) {
  ensureDataFile();
  const list = readHistory();
  list.unshift(item);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf-8");
}

function addLine(lines, useFlag, label, value) {
  if (!useFlag) return;

  const prepared = String(value || "").trim();
  if (!prepared) return;

  lines.push(`${label}: ${prepared}`);
}

function findPromptHint(items, selectedValue) {
  if (!Array.isArray(items) || !selectedValue) return "";

  const found = items.find((item) => {
    if (!item || typeof item !== "object") return false;
    return String(item.value || "").trim() === String(selectedValue || "").trim();
  });

  return String(found?.promptHint || "").trim();
}

function buildPrompt(payload) {
  const contextLines = [];

  addLine(contextLines, payload.useLanguage, "Язык", payload.language);

  addLine(contextLines, payload.useFactText, "Факт", payload.factText);
  addLine(contextLines, payload.useGoal, "Цель", payload.goal);

  addLine(contextLines, payload.useMeetingSize, "Размер встречи", payload.meetingSize);
  addLine(contextLines, payload.useMeetingType, "Тип встречи", payload.meetingType);
  addLine(contextLines, payload.useTone, "Тон", payload.tone);
  addLine(contextLines, payload.useConversationInvite, "Приглашение к разговору", payload.conversationInvite);
  addLine(contextLines, payload.useLanguageLevel, "Уровень языка", payload.languageLevel);
  addLine(contextLines, payload.useArchetype, "Архетип", payload.archetype);

  if (payload.useMeetingType && payload.meetingTypeHint) {
    contextLines.push(`Правило для типа встречи: ${payload.meetingTypeHint}`);
  }

  if (payload.useLanguageLevel && payload.languageLevelHint) {
    contextLines.push(`Правило для уровня языка: ${payload.languageLevelHint}`);
  }

  if (payload.useArchetype && payload.archetypeHint) {
    contextLines.push(`Правило для архетипа: ${payload.archetypeHint}`);
  }

  if (payload.useMentalModel && payload.mentalModel) {
    contextLines.push(`Ментальная модель: ${payload.mentalModel}`);
  }

  const rulesBlocks = [];

  if (payload.usePrompt1 && payload.prompt1) {
    rulesBlocks.push(`ПРОМТ 1\n${payload.prompt1.trim()}`);
  }

  if (payload.usePrompt2 && payload.prompt2) {
    rulesBlocks.push(`ПРОМТ 2\n${payload.prompt2.trim()}`);
  }

  if (payload.usePrompt3 && payload.prompt3) {
    rulesBlocks.push(`ПРОМТ 3\n${payload.prompt3.trim()}`);
  }

  const contextBlock = contextLines.length
    ? contextLines.join("\n")
    : "не задан";

  const rulesBlock = rulesBlocks.length
    ? rulesBlocks.join("\n\n")
    : "не заданы";

  return [
    "Ты формируешь короткий business small talk.",
    "",
    "ЗАДАЧА",
    "Создай 3 варианта короткой устной реплики для начала разговора.",
    "",
    "КОНТЕКСТ",
    contextBlock,
    "",
    "ПРАВИЛА ГЕНЕРАЦИИ",
    rulesBlock,
    "",
    "ФОРМАТ ОТВЕТА (строго JSON)",
    '{"variants":[{"id":1,"text":"..."},{"id":2,"text":"..."},{"id":3,"text":"..."}]}'
  ].join("\n");
}

function safeParseJson(text) {
  if (!text) return null;

  const raw = String(text).trim();

  try {
    return JSON.parse(raw);
  } catch {}

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1].trim());
    } catch {}
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = raw.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
}

app.get("/api/history", (_req, res) => {
  res.json({
    ok: true,
    history: readHistory()
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const payload = req.body || {};

    const requestData = {
      mentalModel: payload.mentalModel || "",
      prompt1: payload.prompt1 || "",
      prompt2: payload.prompt2 || "",
      prompt3: payload.prompt3 || "",
      language: payload.language || "русский",

      factText: payload.factText || "",
      goal: payload.goal || "",
      meetingSize: payload.meetingSize || "",
      meetingType: payload.meetingType || "",
      tone: payload.tone || "",
      conversationInvite: payload.conversationInvite || "",
      languageLevel: payload.languageLevel || "",
      archetype: payload.archetype || "",

      useMentalModel: Boolean(payload.useMentalModel),
      usePrompt1: Boolean(payload.usePrompt1),
      usePrompt2: Boolean(payload.usePrompt2),
      usePrompt3: Boolean(payload.usePrompt3),
      useLanguage: Boolean(payload.useLanguage),

      useFactText: Boolean(payload.useFactText),
      useGoal: Boolean(payload.useGoal),
      useMeetingSize: Boolean(payload.useMeetingSize),
      useMeetingType: Boolean(payload.useMeetingType),
      useTone: Boolean(payload.useTone),
      useConversationInvite: Boolean(payload.useConversationInvite),
      useLanguageLevel: Boolean(payload.useLanguageLevel),
      useArchetype: Boolean(payload.useArchetype)
    };

    const sendToAi = Boolean(payload.send_to_ai);
    const dictionaries = await readDictionaries();

    const t0 = Date.now();

    const tPromptStart = Date.now();
    const prompt = buildPrompt({
      ...requestData,
      meetingTypeHint: findPromptHint(dictionaries.meetingType, requestData.meetingType),
      languageLevelHint: findPromptHint(dictionaries.languageLevel, requestData.languageLevel),
      archetypeHint: findPromptHint(dictionaries.archetype, requestData.archetype)
    });
    const promptTime = Date.now() - tPromptStart;

    console.log("===== REQUEST DATA START =====");
    console.log(JSON.stringify(requestData, null, 2));
    console.log("===== REQUEST DATA END =====");

    console.log("===== PROMPT START =====");
    console.log(prompt);
    console.log("===== PROMPT END =====");

    if (!sendToAi) {
      return res.json({
        ok: true,
        preview_only: true,
        prompt_preview: prompt,
        variants: [],
        timing: {
          prompt_ms: promptTime,
          ai_ms: 0,
          total_ms: Date.now() - t0
        }
      });
    }

    const tAiStart = Date.now();

    const response = await openai.responses.create({
      model: process.env.MODEL_GENERATE || "gpt-5-mini",
      instructions: [
        "Return only valid JSON.",
        "Do not use markdown.",
        "Do not use code fences.",
        "Do not add explanations before or after JSON.",
        "Response must be exactly one JSON object.",
        "The object must contain key 'variants' with exactly 3 items.",
        "Each item must have keys 'id' and 'text'."
      ].join(" "),
      input: prompt,
      max_output_tokens: 1200
    });

    const aiTime = Date.now() - tAiStart;
    const rawText = String(response.output_text || "").trim();

    console.log("===== RAW RESPONSE START =====");
    console.log(rawText || "[EMPTY output_text]");
    console.log("===== RAW RESPONSE END =====");

    const parsed = safeParseJson(rawText);

    if (!parsed || !Array.isArray(parsed.variants) || parsed.variants.length !== 3) {
      return res.status(500).json({
        ok: false,
        error: "Модель не вернула корректный JSON с 3 вариантами",
        prompt_preview: prompt,
        raw_output: rawText || "[EMPTY output_text]",
        timing: {
          prompt_ms: promptTime,
          ai_ms: aiTime,
          total_ms: Date.now() - t0
        }
      });
    }

    const result = {
      created_at: new Date().toISOString(),

      mentalModel: requestData.mentalModel,
      prompt1: requestData.prompt1,
      prompt2: requestData.prompt2,
      prompt3: requestData.prompt3,
      language: requestData.language,

      fact_text: requestData.factText,
      goal: requestData.goal,
      meetingSize: requestData.meetingSize,
      meetingType: requestData.meetingType,
      tone: requestData.tone,
      conversationInvite: requestData.conversationInvite,
      languageLevel: requestData.languageLevel,
      archetype: requestData.archetype,

      useMentalModel: requestData.useMentalModel,
      usePrompt1: requestData.usePrompt1,
      usePrompt2: requestData.usePrompt2,
      usePrompt3: requestData.usePrompt3,
      useLanguage: requestData.useLanguage,

      useFactText: requestData.useFactText,
      useGoal: requestData.useGoal,
      useMeetingSize: requestData.useMeetingSize,
      useMeetingType: requestData.useMeetingType,
      useTone: requestData.useTone,
      useConversationInvite: requestData.useConversationInvite,
      useLanguageLevel: requestData.useLanguageLevel,
      useArchetype: requestData.useArchetype,

      variants: parsed.variants.map((item, index) => ({
        id: item.id || index + 1,
        text: String(item.text || "").trim()
      }))
    };

    saveHistory(result);

    res.json({
      ok: true,
      preview_only: false,
      prompt_preview: prompt,
      variants: result.variants,
      timing: {
        prompt_ms: promptTime,
        ai_ms: aiTime,
        total_ms: Date.now() - t0
      }
    });
  } catch (e) {
    console.error("GENERATE ERROR", e);
    res.status(500).json({
      ok: false,
      error: e.message || "Connection error"
    });
  }
});

app.post("/load-news", async (req, res) => {
  try {
    const loadedItems = await loadNews();
    const result = await mergeNews(loadedItems);

    res.json({
      ok: true,
      added: result.added,
      total: result.total,
      items: result.items
    });
  } catch (error) {
    console.error("POST /load-news error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to load news"
    });
  }
});

app.get("/news", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 0);
    const language = String(req.query.language || "").trim().toLowerCase();

    let items = await readNews();

    if (language) {
      items = items.filter(
        (item) => String(item.language || "").toLowerCase() === language
      );
    }

    if (limit > 0) {
      items = items.slice(0, limit);
    }

    res.json({
      ok: true,
      items
    });
  } catch (error) {
    console.error("GET /news error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to read news"
    });
  }
});

app.delete("/news", async (_req, res) => {
  try {
    await clearNews();

    res.json({
      ok: true,
      cleared: true
    });
  } catch (error) {
    console.error("DELETE /news error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to clear news"
    });
  }
});

app.post("/load-facts", async (_req, res) => {
  try {
    const loadedItems = await loadFacts();
    const result = await mergeFacts(loadedItems);

    res.json({
      ok: true,
      added: result.added,
      total: result.total,
      items: result.items
    });
  } catch (error) {
    console.error("POST /load-facts error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to load facts"
    });
  }
});

app.get("/facts", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 0);
    const language = String(req.query.language || "").trim().toLowerCase();

    let items = await readFacts();

    if (language) {
      items = items.filter(
        (item) => String(item.language || "").toLowerCase() === language
      );
    }

    if (limit > 0) {
      items = items.slice(0, limit);
    }

    res.json({
      ok: true,
      items
    });
  } catch (error) {
    console.error("GET /facts error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to read facts"
    });
  }
});

app.delete("/facts", async (_req, res) => {
  try {
    await clearFacts();

    res.json({
      ok: true,
      cleared: true
    });
  } catch (error) {
    console.error("DELETE /facts error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to clear facts"
    });
  }
});

app.get("/api/dictionaries", async (_req, res) => {
  try {
    const dictionaries = await readDictionaries();

    res.json({
      ok: true,
      dictionaries
    });
  } catch (error) {
    console.error("GET /api/dictionaries error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to read dictionaries"
    });
  }
});

app.put("/api/dictionaries", async (req, res) => {
  try {
    const payload = req.body || {};
    const dictionaries = await saveDictionaries(payload);

    res.json({
      ok: true,
      dictionaries
    });
  } catch (error) {
    console.error("PUT /api/dictionaries error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to save dictionaries"
    });
  }
});

app.post("/api/dictionaries/reset", async (_req, res) => {
  try {
    const dictionaries = await resetDictionaries();

    res.json({
      ok: true,
      dictionaries
    });
  } catch (error) {
    console.error("POST /api/dictionaries/reset error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to reset dictionaries"
    });
  }
});

app.listen(PORT, () => {
  console.log("Server started on http://localhost:" + PORT);
});