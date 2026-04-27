const saveBtn = document.getElementById("saveDictionariesBtn");
const resetBtn = document.getElementById("resetDictionariesBtn");
const statusBox = document.getElementById("settingsStatus");

const addAphorismSourceBtn = document.getElementById("addAphorismSourceBtn");
const saveAphorismSourcesBtn = document.getElementById("saveAphorismSourcesBtn");
const resetAphorismSourcesBtn = document.getElementById("resetAphorismSourcesBtn");
const aphorismSourcesStatus = document.getElementById("aphorismSourcesStatus");
const aphorismSourcesBox = document.getElementById("aphorismSourcesBox");

const fieldMap = {
  meetingSize: document.getElementById("dictMeetingSize"),
  meetingType: document.getElementById("dictMeetingType"),
  tone: document.getElementById("dictTone"),
  conversationInvite: document.getElementById("dictConversationInvite"),
  languageLevel: document.getElementById("dictLanguageLevel"),
  smallTalkSize: document.getElementById("dictSmallTalkSize"),
  archetype: document.getElementById("dictArchetype"),
  language: document.getElementById("dictLanguage")
};

saveBtn?.addEventListener("click", onSave);
resetBtn?.addEventListener("click", onReset);

addAphorismSourceBtn?.addEventListener("click", onAddAphorismSource);
saveAphorismSourcesBtn?.addEventListener("click", onSaveAphorismSources);
resetAphorismSourcesBtn?.addEventListener("click", onResetAphorismSources);

initializeSettingsPage();

async function initializeSettingsPage() {
  await loadDictionaries();
  await loadAphorismSources();
}

/* ================= DICTIONARIES ================= */

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
  return collectLines(text)
    .map((line) => {
      const parts = line.split("||");
      const value = String(parts[0] || "").trim();
      const promptHint = String(parts.slice(1).join("||") || "").trim();

      return {
        value,
        promptHint
      };
    })
    .filter((item) => item.value);
}

function formatRuleLines(items) {
  if (!Array.isArray(items)) return "";

  return items
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      const value = String(item?.value || "").trim();
      const promptHint = String(item?.promptHint || "").trim();

      if (!value) return "";
      if (!promptHint) return value;

      return `${value} || ${promptHint}`;
    })
    .filter(Boolean)
    .join("\n");
}

function collectFormData() {
  return {
    meetingSize: collectRuleLines(fieldMap.meetingSize.value),
    meetingType: collectRuleLines(fieldMap.meetingType.value),
    tone: collectLines(fieldMap.tone.value),
    conversationInvite: collectRuleLines(fieldMap.conversationInvite.value),
    languageLevel: collectRuleLines(fieldMap.languageLevel.value),
    smallTalkSize: collectRuleLines(fieldMap.smallTalkSize.value),
    archetype: collectRuleLines(fieldMap.archetype.value),
    language: collectLines(fieldMap.language.value)
  };
}

function fillForm(dictionaries) {
  fieldMap.meetingSize.value = formatRuleLines(dictionaries.meetingSize || []);
  fieldMap.meetingType.value = formatRuleLines(dictionaries.meetingType || []);
  fieldMap.tone.value = (dictionaries.tone || []).join("\n");
  fieldMap.conversationInvite.value = formatRuleLines(dictionaries.conversationInvite || []);
  fieldMap.languageLevel.value = formatRuleLines(dictionaries.languageLevel || []);
  fieldMap.smallTalkSize.value = formatRuleLines(dictionaries.smallTalkSize || []);
  fieldMap.archetype.value = formatRuleLines(dictionaries.archetype || []);
  fieldMap.language.value = (dictionaries.language || []).join("\n");
}

/* ================= APHORISM SOURCES ================= */

async function loadAphorismSources() {
  if (!aphorismSourcesBox || !aphorismSourcesStatus) return;

  aphorismSourcesStatus.textContent = "Загрузка источников афоризмов...";

  try {
    const response = await fetch("/api/aphorism-sources");
    const data = await response.json();

    if (!data.ok) {
      aphorismSourcesStatus.textContent = "Ошибка загрузки источников афоризмов.";
      return;
    }

    renderAphorismSources(data.items || []);
    aphorismSourcesStatus.textContent = "Источники афоризмов загружены.";
  } catch (error) {
    aphorismSourcesStatus.textContent = `Ошибка сети: ${error.message}`;
  }
}

function createAphorismSourceRow(item = {}) {
  const row = document.createElement("div");
  row.className = "aphorism-source-row";
  row.style.border = "1px solid #dbe1e8";
  row.style.borderRadius = "10px";
  row.style.padding = "12px";
  row.style.marginTop = "12px";
  row.style.background = "#fcfdff";

  row.innerHTML = `
    <div style="display:grid; gap:10px;">
      <label>
        <span>ID</span>
        <input type="text" class="aph-src-id" value="${escapeHtml(item.id || "")}" placeholder="например: jack-sparrow" />
      </label>

      <label>
        <span>Название</span>
        <input type="text" class="aph-src-label" value="${escapeHtml(item.label || "")}" placeholder="Название источника" />
      </label>

      <label>
        <span>Тип</span>
        <input type="text" class="aph-src-type" value="${escapeHtml(item.type || "custom")}" placeholder="character / book / animation / custom" />
      </label>

      <label>
        <span>URL</span>
        <input type="text" class="aph-src-url" value="${escapeHtml(item.url || "")}" placeholder="https://..." />
      </label>

      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
        <label>
          <span>Язык</span>
          <input type="text" class="aph-src-language" value="${escapeHtml(item.language || "ru")}" placeholder="ru" />
        </label>

        <label>
          <span>Лимит</span>
          <input type="number" class="aph-src-limit" value="${escapeHtml(String(item.limit ?? 30))}" min="1" />
        </label>

        <label class="checkbox-row" style="align-self:end;">
          <input type="checkbox" class="aph-src-enabled" ${item.enabled ? "checked" : ""} />
          Использовать
        </label>
      </div>

      <div>
        <button type="button" class="aph-src-remove-btn">Удалить</button>
      </div>
    </div>
  `;

  row.querySelector(".aph-src-remove-btn")?.addEventListener("click", () => {
    row.remove();

    if (!aphorismSourcesBox.children.length) {
      aphorismSourcesStatus.textContent = "Список пуст.";
    }
  });

  return row;
}

function renderAphorismSources(items) {
  aphorismSourcesBox.innerHTML = "";

  if (!items.length) {
    aphorismSourcesStatus.textContent = "Список пуст.";
    return;
  }

  items.forEach((item) => {
    aphorismSourcesBox.appendChild(createAphorismSourceRow(item));
  });
}

function onAddAphorismSource() {
  aphorismSourcesBox.appendChild(
    createAphorismSourceRow({
      id: "",
      label: "",
      type: "custom",
      url: "",
      enabled: true,
      language: "ru",
      limit: 30
    })
  );

  aphorismSourcesStatus.textContent = "Добавлен новый источник.";
}

function collectAphorismSourcesForm() {
  const rows = Array.from(document.querySelectorAll(".aphorism-source-row"));

  return rows
    .map((row, index) => {
      const id = String(row.querySelector(".aph-src-id")?.value || "").trim() || `source-${index + 1}`;
      const label = String(row.querySelector(".aph-src-label")?.value || "").trim();
      const type = String(row.querySelector(".aph-src-type")?.value || "custom").trim();
      const url = String(row.querySelector(".aph-src-url")?.value || "").trim();
      const language = String(row.querySelector(".aph-src-language")?.value || "ru").trim();
      const limitValue = Number(row.querySelector(".aph-src-limit")?.value || 30);
      const enabled = Boolean(row.querySelector(".aph-src-enabled")?.checked);

      return {
        id,
        label,
        type,
        url,
        enabled,
        language,
        limit: Number.isFinite(limitValue) && limitValue > 0 ? Math.floor(limitValue) : 30
      };
    })
    .filter((item) => item.id && item.label && item.url);
}

async function onSaveAphorismSources() {
  aphorismSourcesStatus.textContent = "Сохранение источников афоризмов...";
  saveAphorismSourcesBtn.disabled = true;
  resetAphorismSourcesBtn.disabled = true;
  addAphorismSourceBtn.disabled = true;

  try {
    const payload = collectAphorismSourcesForm();

    const response = await fetch("/api/aphorism-sources", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.ok) {
      aphorismSourcesStatus.textContent = "Ошибка сохранения источников афоризмов.";
      return;
    }

    renderAphorismSources(data.items || []);
    aphorismSourcesStatus.textContent = "Источники афоризмов сохранены.";
  } catch (error) {
    aphorismSourcesStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    saveAphorismSourcesBtn.disabled = false;
    resetAphorismSourcesBtn.disabled = false;
    addAphorismSourceBtn.disabled = false;
  }
}

async function onResetAphorismSources() {
  aphorismSourcesStatus.textContent = "Сброс источников афоризмов...";
  saveAphorismSourcesBtn.disabled = true;
  resetAphorismSourcesBtn.disabled = true;
  addAphorismSourceBtn.disabled = true;

  try {
    const response = await fetch("/api/aphorism-sources/reset", {
      method: "POST"
    });

    const data = await response.json();

    if (!data.ok) {
      aphorismSourcesStatus.textContent = "Ошибка сброса источников афоризмов.";
      return;
    }

    renderAphorismSources(data.items || []);
    aphorismSourcesStatus.textContent = "Источники афоризмов сброшены.";
  } catch (error) {
    aphorismSourcesStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    saveAphorismSourcesBtn.disabled = false;
    resetAphorismSourcesBtn.disabled = false;
    addAphorismSourceBtn.disabled = false;
  }
}

/* ================= HELPERS ================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}