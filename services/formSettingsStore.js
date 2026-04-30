import { supabase, isSupabaseEnabled } from "./supabaseClient.js";

const KEY = "form_settings";

const DEFAULT_FORM_SETTINGS = {
  mentalModel: "Моя ментальная модель: Строю системы и стратегии",
  useMentalModel: true,

  prompt1: "Generate 1 small talk opener.",
  usePrompt1: true,

  prompt2: "Важно: Свяжи цель встречи и факт - подчеркни их связь. В случае если в факту указан источник - упомяни это в смол токе",
  usePrompt2: true,

  prompt3: "Используй только переданный факт. Не используй markdown и пояснения.",
  usePrompt3: true,

  language: "русский",
  useLanguage: true
};

function sanitizeFormSettings(payload = {}) {
  return {
    mentalModel: String(payload.mentalModel || DEFAULT_FORM_SETTINGS.mentalModel).trim(),
    useMentalModel: Boolean(payload.useMentalModel),

    prompt1: String(payload.prompt1 || DEFAULT_FORM_SETTINGS.prompt1).trim(),
    usePrompt1: Boolean(payload.usePrompt1),

    prompt2: String(payload.prompt2 || DEFAULT_FORM_SETTINGS.prompt2).trim(),
    usePrompt2: Boolean(payload.usePrompt2),

    prompt3: String(payload.prompt3 || DEFAULT_FORM_SETTINGS.prompt3).trim(),
    usePrompt3: Boolean(payload.usePrompt3),

    language: String(payload.language || DEFAULT_FORM_SETTINGS.language).trim(),
    useLanguage: Boolean(payload.useLanguage)
  };
}

export async function readFormSettings() {
  if (!isSupabaseEnabled) {
    return DEFAULT_FORM_SETTINGS;
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", KEY)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.value || Object.keys(data.value).length === 0) {
    await saveFormSettings(DEFAULT_FORM_SETTINGS);
    return DEFAULT_FORM_SETTINGS;
  }

  return sanitizeFormSettings(data.value);
}

export async function saveFormSettings(payload) {
  const prepared = sanitizeFormSettings(payload);

  if (!isSupabaseEnabled) {
    return prepared;
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        key: KEY,
        value: prepared,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "key"
      }
    );

  if (error) {
    throw error;
  }

  return prepared;
}