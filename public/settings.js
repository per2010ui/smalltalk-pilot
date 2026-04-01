const saveBtn = document.getElementById("saveDictionariesBtn");
const resetBtn = document.getElementById("resetDictionariesBtn");
const statusBox = document.getElementById("settingsStatus");

const fieldMap = {
  meetingSize: document.getElementById("dictMeetingSize"),
  meetingType: document.getElementById("dictMeetingType"),
  tone: document.getElementById("dictTone"),
  conversationInvite: document.getElementById("dictConversationInvite"),
  languageLevel: document.getElementById("dictLanguageLevel"),
  archetype: document.getElementById("dictArchetype"),
  language: document.getElementById("dictLanguage")
};

saveBtn.addEventListener("click", onSave);
resetBtn.addEventListener("click", onReset);

loadDictionaries();

async function loadDictionaries() {
  statusBox.textContent = "Загрузка справочников...";

  try {
    const response = await fetch("/api/dictionaries");
    const data = await response.json();

    if (!data.ok) {
      statusBox.textContent = "Ошибка загрузки справочников.";
      return;
    }

    fillForm(data.dictionaries || {});
    statusBox.textContent = "Справочники загружены.";
  } catch (error) {
    statusBox.textContent = `Ошибка сети: ${error.message}`;
  }
}

async function onSave() {
  statusBox.textContent = "Сохранение справочников...";
  saveBtn.disabled = true;
  resetBtn.disabled = true;

  try {
    const payload = collectFormData();

    const response = await fetch("/api/dictionaries", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.ok) {
      statusBox.textContent = "Ошибка сохранения справочников.";
      return;
    }

    fillForm(data.dictionaries || {});
    statusBox.textContent = "Справочники сохранены.";
  } catch (error) {
    statusBox.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    saveBtn.disabled = false;
    resetBtn.disabled = false;
  }
}

async function onReset() {
  statusBox.textContent = "Сброс справочников...";
  saveBtn.disabled = true;
  resetBtn.disabled = true;

  try {
    const response = await fetch("/api/dictionaries/reset", {
      method: "POST"
    });

    const data = await response.json();

    if (!data.ok) {
      statusBox.textContent = "Ошибка сброса справочников.";
      return;
    }

    fillForm(data.dictionaries || {});
    statusBox.textContent = "Справочники сброшены к умолчанию.";
  } catch (error) {
    statusBox.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    saveBtn.disabled = false;
    resetBtn.disabled = false;
  }
}

function collectLines(text) {
  return String(text || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectRuleLines(text) {
  return collectLines(text).map((line) => {
    const parts = line.split("||");
    const value = String(parts[0] || "").trim();
    const promptHint = String(parts.slice(1).join("||") || "").trim();

    return {
      value,
      promptHint
    };
  }).filter((item) => item.value);
}

function formatRuleLines(items) {
  if (!Array.isArray(items)) return "";

  return items.map((item) => {
    if (typeof item === "string") {
      return item;
    }

    const value = String(item?.value || "").trim();
    const promptHint = String(item?.promptHint || "").trim();

    if (!value) return "";
    if (!promptHint) return value;

    return `${value} || ${promptHint}`;
  }).filter(Boolean).join("\n");
}
function collectRuleLines(text) {
  return collectLines(text).map((line) => {
    const parts = line.split("||");
    const value = String(parts[0] || "").trim();
    const promptHint = String(parts.slice(1).join("||") || "").trim();

    return {
      value,
      promptHint
    };
  }).filter((item) => item.value);
}

function formatRuleLines(items) {
  if (!Array.isArray(items)) return "";

  return items.map((item) => {
    if (typeof item === "string") {
      return item;
    }

    const value = String(item?.value || "").trim();
    const promptHint = String(item?.promptHint || "").trim();

    if (!value) return "";
    if (!promptHint) return value;

    return `${value} || ${promptHint}`;
  }).filter(Boolean).join("\n");
}
function collectFormData() {
  return {
    meetingSize: collectLines(fieldMap.meetingSize.value),
    meetingType: collectRuleLines(fieldMap.meetingType.value),
    tone: collectLines(fieldMap.tone.value),
    conversationInvite: collectLines(fieldMap.conversationInvite.value),
    languageLevel: collectRuleLines(fieldMap.languageLevel.value),
    archetype: collectRuleLines(fieldMap.archetype.value),
    language: collectLines(fieldMap.language.value)
  };
}

function fillForm(dictionaries) {
  fieldMap.meetingSize.value = (dictionaries.meetingSize || []).join("\n");
  fieldMap.meetingType.value = formatRuleLines(dictionaries.meetingType || []);
  fieldMap.tone.value = (dictionaries.tone || []).join("\n");
  fieldMap.conversationInvite.value = (dictionaries.conversationInvite || []).join("\n");
  fieldMap.languageLevel.value = formatRuleLines(dictionaries.languageLevel || []);
  fieldMap.archetype.value = formatRuleLines(dictionaries.archetype || []);
  fieldMap.language.value = (dictionaries.language || []).join("\n");
}