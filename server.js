import { readHistory, saveHistory } from "./services/historyStore.js";
import { loadAphorisms } from "./services/aphorismsLoader.js";
import { readAphorisms, mergeAphorisms, clearAphorisms } from "./services/aphorismsStore.js";
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

import { loadFactroomFacts } from "./services/factroomFactsLoader.js";
import {
  readFactroomFacts,
  mergeFactroomFacts,
  clearFactroomFacts
} from "./services/factroomFactsStore.js";

import { loadNews } from "./services/newsLoader.js";
import { readNews, mergeNews, clearNews } from "./services/newsStore.js";
import { loadFacts } from "./services/factsLoader.js";
import { readFacts, mergeFacts, clearFacts } from "./services/factsStore.js";
import {
  readDictionaries,
  saveDictionaries,
  resetDictionaries
} from "./services/dictionariesStore.js";
import {
  readAphorismSources,
  saveAphorismSources,
  resetAphorismSources
} from "./services/aphorismSourcesStore.js";

import {
  readFormSettings,
  saveFormSettings
} from "./services/formSettingsStore.js";

import {
  readFactSources,
  saveFactSources,
  resetFactSources
} from "./services/factSourcesStore.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json());
app.use(express.static("public"));








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

  addLine(contextLines, payload.useLanguage, "Language", payload.language);
  addLine(contextLines, payload.useRole, "Роль", payload.role);

  addLine(contextLines, payload.useFactText, "Fact", payload.factText);
  addLine(contextLines, payload.useGoal, "Goal", payload.goal);

 // addLine(contextLines, payload.useMeetingSize, "Размер встречи", payload.meetingSize);
  if (payload.useMeetingSize && payload.meetingSizeHint) {
  contextLines.push(payload.meetingSizeHint);
}
  //addLine(contextLines, payload.useMeetingType, "Тип встречи", payload.meetingType);
  addLine(contextLines, payload.useTone, "Тон", payload.tone);
  addLine(contextLines, payload.useSharedReality, "Общая реальность", payload.sharedReality);
  // addLine(contextLines, payload.useConversationInvite, "Приглашение к разговору", payload.conversationInvite);

if (payload.useConversationInvite && payload.conversationInviteHint) {
  contextLines.push(payload.conversationInviteHint);
}
  //addLine(contextLines, payload.useLanguageLevel, "Уровень языка", payload.languageLevel);
  //addLine(contextLines, payload.useSmallTalkSize, "Размер SmallTalk", payload.smallTalkSize);
  //addLine(contextLines, payload.useArchetype, "Архетип", payload.archetype);

  if (payload.useMeetingType && payload.meetingTypeHint) {
    contextLines.push(`${payload.meetingTypeHint}`);
  }

  if (payload.useLanguageLevel && payload.languageLevelHint) {
    contextLines.push(`${payload.languageLevelHint}`);
  }

  if (payload.useSmallTalkSize && payload.smallTalkSizeHint) {
    contextLines.push(`${payload.smallTalkSizeHint}`);
  }

  if (payload.useArchetype && payload.archetypeHint) {
    contextLines.push(`${payload.archetypeHint}`);
  }

  if (payload.useMentalModel && payload.mentalModel) {
    contextLines.push(`${payload.mentalModel}`);
  }

  if (payload.variantsCount === 2 && payload.variantStyle1 && payload.variantStyle2) {
    contextLines.push(`Вариант 1: ${payload.variantStyle1}`);
    contextLines.push(`Вариант 2: ${payload.variantStyle2}`);
  }

  const introBlock =
    payload.usePrompt1 && payload.prompt1
      ? payload.prompt1.trim()
      : "не задан";

  const rulesBlocks = [];

  if (payload.usePrompt2 && payload.prompt2) {
    rulesBlocks.push(payload.prompt2.trim());
  }

  if (payload.usePrompt3 && payload.prompt3) {
    rulesBlocks.push(payload.prompt3.trim());
  }

  const contextBlock = contextLines.length
    ? contextLines.join("\n")
    : "не задан";

  const rulesBlock = rulesBlocks.length
    ? rulesBlocks.join("\n\n")
    : "не заданы";

return [
  introBlock,
  "",
  "КОНТЕКСТ",
  contextBlock,
  "",
  "ПРАВИЛА ГЕНЕРАЦИИ",
  rulesBlock,
  "",
  `Количество вариантов: ${payload.variantsCount}.`,
  "Return only JSON matching the schema."
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

function normalizeVariants(parsed, expectedCount) {
  if (!parsed || !Array.isArray(parsed.variants)) {
    return null;
  }

  const normalized = parsed.variants
    .map((item, index) => ({
      id: index + 1,
      text: typeof item?.text === "string" ? item.text.trim() : ""
    }))
    .filter((item) => item.text);

  if (normalized.length !== expectedCount) {
    return null;
  }

  return normalized;
}
app.get("/api/fact-sources", async (_req, res) => {
  const items = await readFactSources();
  res.json({ ok: true, items });
});

app.put("/api/fact-sources", async (req, res) => {
  const items = await saveFactSources(req.body || []);
  res.json({ ok: true, items });
});

app.post("/api/fact-sources/reset", async (_req, res) => {
  const items = await resetFactSources();
  res.json({ ok: true, items });
});
app.get("/api/history", async (_req, res) => {
  try {
    const history = await readHistory();

    res.json({
      ok: true,
      history
    });
  } catch (error) {
    console.error("GET /api/history error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to read history"
    });
  }
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
      smallTalkSize: payload.smallTalkSize || "",
      variantsCount: [1, 2].includes(Number(payload.variantsCount))
  ? Number(payload.variantsCount)
  : 1,

      useMentalModel: Boolean(payload.useMentalModel),
      usePrompt1: Boolean(payload.usePrompt1),
      usePrompt2: Boolean(payload.usePrompt2),
      usePrompt3: Boolean(payload.usePrompt3),
      useLanguage: Boolean(payload.useLanguage),
      useSmallTalkSize: Boolean(payload.useSmallTalkSize),

      useFactText: Boolean(payload.useFactText),
      useGoal: Boolean(payload.useGoal),
      useMeetingSize: Boolean(payload.useMeetingSize),
      useMeetingType: Boolean(payload.useMeetingType),
      useTone: Boolean(payload.useTone),
      useConversationInvite: Boolean(payload.useConversationInvite),
      useLanguageLevel: Boolean(payload.useLanguageLevel),
      useArchetype: Boolean(payload.useArchetype),

      role: payload.role || "",
      sharedReality: payload.sharedReality || "",
      useRole: Boolean(payload.useRole),
      useSharedReality: Boolean(payload.useSharedReality)
    };

    const sendToAi = Boolean(payload.send_to_ai);
    const dictionaries = await readDictionaries();

    const t0 = Date.now();

    const tPromptStart = Date.now();
const prompt = buildPrompt({
  ...requestData,
  meetingSizeHint: findPromptHint(dictionaries.meetingSize, requestData.meetingSize),
  meetingTypeHint: findPromptHint(dictionaries.meetingType, requestData.meetingType),
  languageLevelHint: findPromptHint(dictionaries.languageLevel, requestData.languageLevel),
  smallTalkSizeHint: findPromptHint(dictionaries.smallTalkSize, requestData.smallTalkSize),
  archetypeHint: findPromptHint(dictionaries.archetype, requestData.archetype),
  conversationInviteHint: findPromptHint(dictionaries.conversationInvite, requestData.conversationInvite),
  variantStyle1: dictionaries.variantStyle1 || "",
  variantStyle2: dictionaries.variantStyle2 || ""
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
  input: prompt,
  reasoning: { effort: "minimal" },
  max_output_tokens: 800,
  text: {
    format: {
      type: "json_schema",
      name: "smalltalk_response",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          variants: {
            type: "array",
minItems: requestData.variantsCount,
maxItems: requestData.variantsCount,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "integer" },
                text: { type: "string" }
              },
              required: ["id", "text"]
            }
          }
        },
        required: ["variants"]
      }
    }
  }
});

    const aiTime = Date.now() - tAiStart;
    const rawText = String(response.output_text || "").trim();

    console.log("===== RAW RESPONSE START =====");
    console.log(rawText || "[EMPTY output_text]");
    console.log("===== RAW RESPONSE END =====");

    const parsed = safeParseJson(rawText);
    const normalizedVariants = normalizeVariants(parsed, requestData.variantsCount);

    if (!normalizedVariants) {
      return res.status(500).json({
        ok: false,
       error: `Модель не вернула корректный JSON с ${requestData.variantsCount} вариант(ами)`,
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
      smallTalkSize: requestData.smallTalkSize,

      useMentalModel: requestData.useMentalModel,
      usePrompt1: requestData.usePrompt1,
      usePrompt2: requestData.usePrompt2,
      usePrompt3: requestData.usePrompt3,
      useLanguage: requestData.useLanguage,
      useSmallTalkSize: requestData.useSmallTalkSize,

      useFactText: requestData.useFactText,
      useGoal: requestData.useGoal,
      useMeetingSize: requestData.useMeetingSize,
      useMeetingType: requestData.useMeetingType,
      useTone: requestData.useTone,
      useConversationInvite: requestData.useConversationInvite,
      useLanguageLevel: requestData.useLanguageLevel,
      useArchetype: requestData.useArchetype,

      variants: normalizedVariants
    };

    await saveHistory(result);

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

app.get("/api/aphorism-sources", async (_req, res) => {
  try {
    const items = await readAphorismSources();

    res.json({
      ok: true,
      items
    });
  } catch (error) {
    console.error("GET /api/aphorism-sources error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to read aphorism sources"
    });
  }
});

app.put("/api/aphorism-sources", async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [];
    const items = await saveAphorismSources(payload);

    res.json({
      ok: true,
      items
    });
  } catch (error) {
    console.error("PUT /api/aphorism-sources error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to save aphorism sources"
    });
  }
});

app.post("/api/aphorism-sources/reset", async (_req, res) => {
  try {
    const items = await resetAphorismSources();

    res.json({
      ok: true,
      items
    });
  } catch (error) {
    console.error("POST /api/aphorism-sources/reset error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to reset aphorism sources"
    });
  }
});

app.post("/load-aphorisms", async (_req, res) => {
  try {
    const loadedItems = await loadAphorisms();
    const result = await mergeAphorisms(loadedItems);

    res.json({
      ok: true,
      added: result.added,
      total: result.total,
      items: result.items
    });
  } catch (error) {
    console.error("POST /load-aphorisms error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to load aphorisms"
    });
  }
});

app.get("/aphorisms", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 0);
    const language = String(req.query.language || "").trim().toLowerCase();

    let items = await readAphorisms();

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
    console.error("GET /aphorisms error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to read aphorisms"
    });
  }
});

app.delete("/aphorisms", async (_req, res) => {
  try {
    await clearAphorisms();

    res.json({
      ok: true,
      cleared: true
    });
  } catch (error) {
    console.error("DELETE /aphorisms error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to clear aphorisms"
    });
  }
});

app.get("/api/form-settings", async (_req, res) => {
  try {
    const settings = await readFormSettings();

    res.json({
      ok: true,
      settings
    });
  } catch (error) {
    console.error("GET /api/form-settings error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to read form settings"
    });
  }
});

app.put("/api/form-settings", async (req, res) => {
  try {
    const payload = req.body || {};
    const settings = await saveFormSettings(payload);

    res.json({
      ok: true,
      settings
    });
  } catch (error) {
    console.error("PUT /api/form-settings error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to save form settings"
    });
  }
});

app.post("/load-factroom-facts", async (_req, res) => {
  try {
    const loadedItems = await loadFactroomFacts();
    const result = await mergeFactroomFacts(loadedItems);

    res.json({
      ok: true,
      added: result.added,
      total: result.total,
      items: result.items
    });
  } catch (error) {
    console.error("POST /load-factroom-facts error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to load Factroom facts"
    });
  }
});

app.get("/factroom-facts", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 0);
    const language = String(req.query.language || "").trim().toLowerCase();

    let items = await readFactroomFacts();

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
    console.error("GET /factroom-facts error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to read Factroom facts"
    });
  }
});

app.delete("/factroom-facts", async (_req, res) => {
  try {
    await clearFactroomFacts();

    res.json({
      ok: true,
      cleared: true
    });
  } catch (error) {
    console.error("DELETE /factroom-facts error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to clear Factroom facts"
    });
  }
});

app.listen(PORT, () => {
  console.log("Server started on http://localhost:" + PORT);
});

//console.log("SUPABASE:", process.env.SUPABASE_URL);