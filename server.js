import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

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

function buildPrompt({ factText, language, tone, audience, situation, goal }) {
  return `
Ты помогаешь подготовить короткий business small talk для встречи.

ЗАДАЧА
На основе вручную заданного факта создай 3 варианта small talk.

ВХОДНЫЕ ДАННЫЕ
Язык: ${language || "русский"}
Тон: ${tone || "нейтральный"}
Аудитория / собеседник: ${audience || "не указано"}
Ситуация: ${situation || "не указана"}
Цель: ${goal || "не указана"}

ФАКТ
${factText || "не указан"}

ПРАВИЛА
1. Используй только данный факт.
2. Ничего не выдумывай сверх данного факта.
3. Каждый вариант должен быть коротким и естественным.
4. Каждый вариант должен звучать как готовая реплика.
5. Верни ровно 3 варианта.
6. Ответ должен быть только JSON.
7. Не используй markdown.
8. Не используй тройные кавычки и code fences.
9. Не добавляй никаких пояснений до или после JSON.

Формат:
{"variants":[{"id":1,"text":"..."},{"id":2,"text":"..."},{"id":3,"text":"..."}]}
`.trim();
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

    const factText = payload.factText || "";
    const audience = payload.audience || "";
    const situation = payload.situation || "";
    const goal = payload.goal || "";
    const tone = payload.tone || "нейтральный";
    const language = payload.language || "русский";
    const sendToAi = Boolean(payload.send_to_ai);

    const t0 = Date.now();

    const tPromptStart = Date.now();
    const prompt = buildPrompt({
      factText,
      audience,
      situation,
      goal,
      tone,
      language
    });
    const promptTime = Date.now() - tPromptStart;

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
      fact_text: factText,
      audience,
      situation,
      goal,
      tone,
      language,
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

app.listen(PORT, () => {
  console.log("Server started on http://localhost:" + PORT);
});