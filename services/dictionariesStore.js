import { supabase, isSupabaseEnabled } from "./supabaseClient.js";

const KEY = "dictionaries";

const DEFAULT_DICTIONARIES = {
  meetingSize: [
    { value: "Личная", promptHint: "Можно точнее и живее. Допускается адресность. Не делай слишком формально." },
    { value: "Группа", promptHint: "Говори нейтрально для группы. Без чрезмерной адресности." },
    { value: "Группа 20+ (доклад)", promptHint: "Быстрый вход для большой группы. Минимум слов, максимум понятности." }
  ],
  meetingType: [
    { value: "Agile рутина", promptHint: "Делай фразы короткими, рабочими, без лишней абстракции." },
    { value: "брейнсторм", promptHint: "Делай фразы более открывающими, стимулирующими идеи и обсуждение." },
    { value: "кооперация", promptHint: "Фразы должны помогать объединению и совместному движению." },
    { value: "синхронизация", promptHint: "Фразы должны быть нейтральными, короткими и удобными для быстрого входа в разговор." },
    { value: "принятие решения", promptHint: "Фразы должны звучать собранно, делово и направленно на результат." },
    { value: "обучающая", promptHint: "Фразы должны звучать понятно, спокойно и поддерживать интерес." },
    { value: "ретроспективная", promptHint: "Фразы должны поддерживать осмысление опыта, выводы и рефлексию." }
  ],
  tone: ["Дружелюбный", "Деловой", "Конфликтный"],
  conversationInvite: [
    { value: "да", promptHint: "По окончании задать открывающие вопросы." },
    { value: "нет", promptHint: "По окончании не задавать открывающие вопросы." }
  ],
  languageLevel: [
    { value: "Высокий", promptHint: "Можно использовать более естественные и богатые формулировки, но без перегруза." },
    { value: "Низкий", promptHint: "Используй простые слова, короткие предложения и понятные конструкции." }
  ],
  smallTalkSize: [
    { value: "короткий", promptHint: "до 3 предложения" },
    { value: "средний", promptHint: "до 10 предложений" },
    { value: "длинный", promptHint: "больше 10 предложений" }
  ],
  archetype: [
    { value: "Маг", promptHint: "Добавляй ощущение видения, смысла, трансформации и необычного угла." },
    { value: "Мудрец", promptHint: "Делай стиль спокойным, умным, наблюдательным, с акцентом на понимание." },
    { value: "Правитель", promptHint: "Делай стиль уверенным, структурным, собранным, ориентированным на контроль и решение." },
    { value: "Шут", promptHint: "Добавляй легкость, живость, мягкую иронию, но без клоунады." }
  ],
  language: ["русский", "английский"],
  variantStyle1: "деловой (используй формальные и профессиональные фразы)",
  variantStyle2: "дружелюбный (используй метафоры и неформальную лексику)"
};

/* ===== sanitize ===== */

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(v => String(v || "").trim()).filter(Boolean)));
}

function sanitizeRuleArray(value) {
  if (!Array.isArray(value)) return [];

  const map = new Map();

  for (const item of value) {
    if (typeof item === "string") {
      const v = item.trim();
      if (v && !map.has(v)) map.set(v, { value: v, promptHint: "" });
      continue;
    }

    if (item && typeof item === "object") {
      const v = String(item.value || "").trim();
      const h = String(item.promptHint || "").trim();
      if (v && !map.has(v)) map.set(v, { value: v, promptHint: h });
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
    language: sanitizeStringArray(payload.language),
    variantStyle1: String(payload.variantStyle1 || "").trim(),
    variantStyle2: String(payload.variantStyle2 || "").trim()
  };
}

/* ===== main ===== */

export async function readDictionaries() {
  if (!isSupabaseEnabled) return DEFAULT_DICTIONARIES;

  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", KEY)
    .single();

  if (!data || !data.value) {
    return DEFAULT_DICTIONARIES;
  }

  const sanitized = sanitizeDictionaries(data.value);

  // 🔴 КРИТИЧЕСКАЯ ПРОВЕРКА
  const ARRAY_KEYS = ["meetingSize", "meetingType", "tone", "conversationInvite", "languageLevel", "smallTalkSize", "archetype", "language"];
  const isEmpty = ARRAY_KEYS.every(k => Array.isArray(sanitized[k]) && sanitized[k].length === 0);

  if (isEmpty) {
    return DEFAULT_DICTIONARIES;
  }

  return sanitized;
}

export async function saveDictionaries(payload) {
  const prepared = sanitizeDictionaries(payload);

  const ARRAY_KEYS = ["meetingSize", "meetingType", "tone", "conversationInvite", "languageLevel", "smallTalkSize", "archetype", "language"];
  const isEmpty = ARRAY_KEYS.every(k => Array.isArray(prepared[k]) && prepared[k].length === 0);

  if (isEmpty) {
    throw new Error("Refuse to save empty dictionaries");
  }

  if (!isSupabaseEnabled) return prepared;

  await supabase.from("app_settings").upsert({
    key: KEY,
    value: prepared
  });

  return prepared;
}

export async function resetDictionaries() {
  if (!isSupabaseEnabled) return DEFAULT_DICTIONARIES;

  await supabase.from("app_settings").upsert({
    key: KEY,
    value: DEFAULT_DICTIONARIES
  });

  return DEFAULT_DICTIONARIES;
}