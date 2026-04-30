import { supabase } from "./supabaseClient.js";

const DICTIONARIES_ID = "main";

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

async function saveDictionariesToDb(data) {
  const { error } = await supabase
    .from("dictionaries")
    .upsert({
      id: DICTIONARIES_ID,
      data,
      updated_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function readDictionaries() {
  const { data, error } = await supabase
    .from("dictionaries")
    .select("data")
    .eq("id", DICTIONARIES_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.data) {
    const prepared = sanitizeDictionaries(DEFAULT_DICTIONARIES);
    await saveDictionariesToDb(prepared);
    return prepared;
  }

  return sanitizeDictionaries(data.data);
}

export async function saveDictionaries(payload) {
  const prepared = sanitizeDictionaries(payload);
  await saveDictionariesToDb(prepared);
  return prepared;
}

export async function resetDictionaries() {
  const prepared = sanitizeDictionaries(DEFAULT_DICTIONARIES);
  await saveDictionariesToDb(prepared);
  return prepared;
}