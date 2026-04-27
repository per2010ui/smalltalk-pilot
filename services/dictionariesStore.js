import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "dictionaries.json");

const DEFAULT_DICTIONARIES = {
  meetingSize: [
  {
    value: "Личная",
    promptHint: "Можно точнее и живее. Допускается адресность. Не делай слишком формально."
  },
  {
    value: "Группа",
    promptHint: "Говори нейтрально для группы. Без чрезмерной адресности."
  },
  {
    value: "Группа 20+ (доклад)",
    promptHint: "Быстрый вход для большой группы. Минимум слов, максимум понятности."
  }
],
  meetingType: [
    {
      value: "Agile рутина",
      promptHint: "Делай фразы короткими, рабочими, без лишней абстракции."
    },
    {
      value: "брейнсторм",
      promptHint: "Делай фразы более открывающими, стимулирующими идеи и обсуждение."
    },
    {
      value: "кооперация",
      promptHint: "Фразы должны помогать объединению и совместному движению."
    },
    {
      value: "синхронизация",
      promptHint: "Фразы должны быть нейтральными, короткими и удобными для быстрого входа в разговор."
    },
    {
      value: "принятие решения",
      promptHint: "Фразы должны звучать собранно, делово и направленно на результат."
    },
    {
      value: "обучающая",
      promptHint: "Фразы должны звучать понятно, спокойно и поддерживать интерес."
    },
    {
      value: "ретроспективная",
      promptHint: "Фразы должны поддерживать осмысление опыта, выводы и рефлексию."
    }
  ],
  tone: [
    "Дружелюбный",
    "Деловой",
    "Конфликтный"
  ],
conversationInvite: [
  {
    value: "да",
    promptHint: "По окончании задать открывающие вопросы."
  },
  {
    value: "нет",
    promptHint: "По окончании не задавать открывающие вопросы."
  }
],
  languageLevel: [
    {
      value: "Высокий",
      promptHint: "Можно использовать более естественные и богатые формулировки, но без перегруза."
    },
    {
      value: "Низкий",
      promptHint: "Используй простые слова, короткие предложения и понятные конструкции."
    }
  ],
  smallTalkSize: [
    {
      value: "короткий",
      promptHint: "до 3 предложения"
    },
    {
      value: "средний",
      promptHint: "до 10 предложений"
    },
    {
      value: "длинный",
      promptHint: "больше 10 предложений"
    }
  ],
  archetype: [
    {
      value: "Маг",
      promptHint: "Добавляй ощущение видения, смысла, трансформации и необычного угла."
    },
    {
      value: "Мудрец",
      promptHint: "Делай стиль спокойным, умным, наблюдательным, с акцентом на понимание."
    },
    {
      value: "Правитель",
      promptHint: "Делай стиль уверенным, структурным, собранным, ориентированным на контроль и решение."
    },
    {
      value: "Шут",
      promptHint: "Добавляй легкость, живость, мягкую иронию, но без клоунады."
    }
  ],
  language: [
    "русский",
    "английский"
  ]
};

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(
      FILE_PATH,
      JSON.stringify(DEFAULT_DICTIONARIES, null, 2),
      "utf-8"
    );
  }
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];

  const cleaned = value
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return Array.from(new Set(cleaned));
}

function sanitizeRuleArray(value) {
  if (!Array.isArray(value)) return [];

  const prepared = value
    .map((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) return null;

        return {
          value: trimmed,
          promptHint: ""
        };
      }

      if (!item || typeof item !== "object") return null;

      const preparedValue = String(item.value || "").trim();
      const preparedHint = String(item.promptHint || "").trim();

      if (!preparedValue) return null;

      return {
        value: preparedValue,
        promptHint: preparedHint
      };
    })
    .filter(Boolean);

  const map = new Map();

  for (const item of prepared) {
    if (!map.has(item.value)) {
      map.set(item.value, item);
    }
  }

  return Array.from(map.values());
}

function sanitizeDictionaries(payload = {}) {
  return {
    meetingSize: sanitizeRuleArray(payload.meetingSize),
    meetingType: sanitizeRuleArray(payload.meetingType),
    tone: sanitizeStringArray(payload.tone),
conversationInvite: sanitizeRuleArray(payload.conversationInvite),
    languageLevel: sanitizeRuleArray(payload.languageLevel),
    smallTalkSize: sanitizeRuleArray(payload.smallTalkSize),
    archetype: sanitizeRuleArray(payload.archetype),
    language: sanitizeStringArray(payload.language)
  };
}

export async function readDictionaries() {
  await ensureFile();
  const raw = await fs.readFile(FILE_PATH, "utf-8");

  try {
    const parsed = JSON.parse(raw);
    return sanitizeDictionaries(parsed);
  } catch {
    return { ...DEFAULT_DICTIONARIES };
  }
}

export async function saveDictionaries(payload) {
  await ensureFile();
  const prepared = sanitizeDictionaries(payload);

  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(prepared, null, 2),
    "utf-8"
  );

  return prepared;
}

export async function resetDictionaries() {
  await ensureFile();

  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(DEFAULT_DICTIONARIES, null, 2),
    "utf-8"
  );

  return { ...DEFAULT_DICTIONARIES };
}