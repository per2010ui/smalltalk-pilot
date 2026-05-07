const generateBtn = document.getElementById("generateBtn");
const reloadHistoryBtn = document.getElementById("reloadHistoryBtn");

const loadNewsBtn = document.getElementById("loadNewsBtn");
const clearNewsBtn = document.getElementById("clearNewsBtn");

const loadFactsBtn = document.getElementById("loadFactsBtn");
const clearFactsBtn = document.getElementById("clearFactsBtn");

const loadAphorismsBtn = document.getElementById("loadAphorismsBtn");
const clearAphorismsBtn = document.getElementById("clearAphorismsBtn");

// ВОТ СЮДА ДОБАВИТЬ
const loadFactroomFactsBtn = document.getElementById("loadFactroomFactsBtn");
const clearFactroomFactsBtn = document.getElementById("clearFactroomFactsBtn");

const promptBox = document.getElementById("promptBox");
const resultBox = document.getElementById("resultBox");
const historyBox = document.getElementById("historyBox");

const newsBox = document.getElementById("newsBox");
const newsStatus = document.getElementById("newsStatus");

const factsBox = document.getElementById("factsBox");
const factsStatus = document.getElementById("factsStatus");

const aphorismsBox = document.getElementById("aphorismsBox");
const aphorismsStatus = document.getElementById("aphorismsStatus");

const factroomFactsBox = document.getElementById("factroomFactsBox");
const factroomFactsStatus = document.getElementById("factroomFactsStatus");



const dictionarySelectMap = {
  language: document.getElementById("language"),
  meetingSize: document.getElementById("meetingSize"),
  meetingType: document.getElementById("meetingType"),
  tone: document.getElementById("tone"),
  smallTalkSize: document.getElementById("smallTalkSize"),
  conversationInvite: document.getElementById("conversationInvite"),
  languageLevel: document.getElementById("languageLevel"),
  archetype: document.getElementById("archetype")
};

const FORM_SETTINGS_FIELD_IDS = [
  "mentalModel",
  "prompt1",
  "prompt2",
  "prompt3",
  "language",
  "useMentalModel",
  "usePrompt1",
  "usePrompt2",
  "usePrompt3",
  "useLanguage"
];

const LOCAL_FIELD_IDS = [
  "sendToAi",
  "factText",
  "goal",
  "meetingSize",
  "meetingType",
  "tone",
  "smallTalkSize",
  "conversationInvite",
  "languageLevel",
  "archetype",
  "role",
  "sharedReality",
  "useFactText",
  "useGoal",
  "useMeetingSize",
  "useMeetingType",
  "useTone",
  "useSmallTalkSize",
  "useConversationInvite",
  "useLanguageLevel",
  "useArchetype",
  "useRole",
  "useSharedReality"
];

const STORAGE_KEY = "cto-review-form-state-v1";

generateBtn?.addEventListener("click", onGenerate);
reloadHistoryBtn?.addEventListener("click", loadHistory);

loadNewsBtn?.addEventListener("click", onLoadNews);
clearNewsBtn?.addEventListener("click", onClearNews);

loadFactsBtn?.addEventListener("click", onLoadFacts);
clearFactsBtn?.addEventListener("click", onClearFacts);

loadAphorismsBtn?.addEventListener("click", onLoadAphorisms);
clearAphorismsBtn?.addEventListener("click", onClearAphorisms);

loadFactroomFactsBtn?.addEventListener("click", onLoadFactroomFacts);
clearFactroomFactsBtn?.addEventListener("click", onClearFactroomFacts);

initializeApp();

async function initializeApp() {
  await loadDictionaries();
  await loadFormSettings();

  bindFormSettingsFields();
  bindLocalPersistentFields();
  restoreLocalFormState();

  setupTabs();

  loadHistory();
  loadNewsList();
  loadFactsList();
  loadAphorismsList();
  loadFactroomFactsList();


}

/* ================= FORM SETTINGS FROM SERVER ================= */

async function loadFormSettings() {
  try {
    const response = await fetch("/api/form-settings");
    const data = await response.json();

    if (!data.ok) {
      console.error("Failed to load form settings");
      return;
    }

    applyFormSettings(data.settings || {});
  } catch (error) {
    console.error("loadFormSettings error:", error);
  }
}

function applyFormSettings(settings) {
  FORM_SETTINGS_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!(id in settings)) return;

    if (el.type === "checkbox") {
      el.checked = Boolean(settings[id]);
    } else {
      el.value = settings[id];
    }
  });
}

function collectFormSettings() {
  const settings = {};

  FORM_SETTINGS_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === "checkbox") {
      settings[id] = el.checked;
    } else {
      settings[id] = el.value;
    }
  });

  return settings;
}

let formSettingsSaveTimer = null;

function scheduleSaveFormSettings() {
  clearTimeout(formSettingsSaveTimer);

  formSettingsSaveTimer = setTimeout(async () => {
    try {
      await fetch("/api/form-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(collectFormSettings())
      });
    } catch (error) {
      console.error("saveFormSettings error:", error);
    }
  }, 400);
}

function bindFormSettingsFields() {
  FORM_SETTINGS_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const eventName =
      el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";

    el.addEventListener(eventName, scheduleSaveFormSettings);
  });
}

/* ================= DICTIONARIES ================= */

async function loadDictionaries() {
  try {
    const response = await fetch("/api/dictionaries");
    const data = await response.json();

    if (!data.ok) {
      console.error("Failed to load dictionaries");
      return;
    }

    fillDictionarySelects(data.dictionaries || {});
  } catch (error) {
    console.error("loadDictionaries error:", error);
  }
}

function fillDictionarySelects(dictionaries) {
  fillSelect(dictionarySelectMap.language, dictionaries.language || []);
  fillSelect(dictionarySelectMap.meetingSize, dictionaries.meetingSize || []);
  fillSelect(dictionarySelectMap.meetingType, dictionaries.meetingType || []);
  fillSelect(dictionarySelectMap.tone, dictionaries.tone || []);
  fillSelect(dictionarySelectMap.smallTalkSize, dictionaries.smallTalkSize || []);
  fillSelect(dictionarySelectMap.conversationInvite, dictionaries.conversationInvite || []);
  fillSelect(dictionarySelectMap.languageLevel, dictionaries.languageLevel || []);
  fillSelect(dictionarySelectMap.archetype, dictionaries.archetype || []);
}

function fillSelect(selectEl, items) {
  if (!selectEl) return;

  const currentValue = selectEl.value;
  selectEl.innerHTML = "";

  const normalizedItems = (items || [])
    .map((item) => {
      if (item && typeof item === "object") {
        const value = String(item.value || "").trim();
        return value ? { value, label: value } : null;
      }

      const raw = String(item || "").trim();
      if (!raw) return null;

      const [valuePart] = raw.split("||");
      const value = String(valuePart || "").trim();

      return value ? { value, label: value } : null;
    })
    .filter(Boolean);

  normalizedItems.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    selectEl.appendChild(option);
  });

  const values = normalizedItems.map((item) => item.value);

  if (values.includes(currentValue)) {
    selectEl.value = currentValue;
  } else if (normalizedItems.length > 0) {
    selectEl.value = normalizedItems[0].value;
  }
}

/* ================= GENERATE ================= */

async function onGenerate() {
  const payload = {
    mentalModel: getFieldValue("mentalModel"),
    prompt1: getFieldValue("prompt1"),
    prompt2: getFieldValue("prompt2"),
    prompt3: getFieldValue("prompt3"),
    language: getFieldValue("language"),

    factText: getFieldValue("factText"),
    goal: getFieldValue("goal"),
    meetingSize: getFieldValue("meetingSize"),
    meetingType: getFieldValue("meetingType"),
    tone: getFieldValue("tone"),
    smallTalkSize: getFieldValue("smallTalkSize"),
    variantsCount: Number(getFieldValue("variantsCount") || 1),
    conversationInvite: getFieldValue("conversationInvite"),
    languageLevel: getFieldValue("languageLevel"),
    archetype: getFieldValue("archetype"),
    role: getFieldValue("role"),
    sharedReality: getFieldValue("sharedReality"),

    useMentalModel: getCheckboxValue("useMentalModel"),
    usePrompt1: getCheckboxValue("usePrompt1"),
    usePrompt2: getCheckboxValue("usePrompt2"),
    usePrompt3: getCheckboxValue("usePrompt3"),
    useLanguage: getCheckboxValue("useLanguage"),

    useFactText: getCheckboxValue("useFactText"),
    useGoal: getCheckboxValue("useGoal"),
    useMeetingSize: getCheckboxValue("useMeetingSize"),
    useMeetingType: getCheckboxValue("useMeetingType"),
    useTone: getCheckboxValue("useTone"),
    useSmallTalkSize: getCheckboxValue("useSmallTalkSize"),
    useConversationInvite: getCheckboxValue("useConversationInvite"),
    useLanguageLevel: getCheckboxValue("useLanguageLevel"),
    useArchetype: getCheckboxValue("useArchetype"),
    useRole: getCheckboxValue("useRole"),
    useSharedReality: getCheckboxValue("useSharedReality"),

    send_to_ai: getCheckboxValue("sendToAi")
  };

  resultBox.innerHTML = "Выполняется...";
  promptBox.textContent = "Подготовка prompt...";

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    const timingEl = document.getElementById("timing");
    if (timingEl && data.timing) {
      timingEl.innerHTML =
        "Prompt build: " + data.timing.prompt_ms + " ms<br>" +
        "AI request: " + data.timing.ai_ms + " ms<br>" +
        "Total: " + data.timing.total_ms + " ms";
    }

    promptBox.textContent = data.prompt_preview || "Prompt отсутствует.";

    if (!data.ok) {
      resultBox.innerHTML = `<pre>Ошибка: ${escapeHtml(data.error || "Неизвестная ошибка")}</pre>`;
      return;
    }

    if (data.preview_only) {
      resultBox.innerHTML = `<p>AI выключен. Показан только prompt preview.</p>`;
      return;
    }

    if (!Array.isArray(data.variants) || data.variants.length === 0) {
      resultBox.innerHTML = `<pre>Ошибка: модель не вернула ни одного варианта.</pre>`;
      return;
    }

    resultBox.innerHTML = "";

    data.variants.forEach((item, index) => {
      const safeId = item?.id || index + 1;
      const safeText = String(item?.text || "").trim();

      if (!safeText) return;

      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <div class="result-header">
          <strong>Вариант ${escapeHtml(safeId)}</strong>
          <button type="button" class="copy-btn">Copy</button>
        </div>
        <pre>${escapeHtml(safeText)}</pre>
      `;

      card.querySelector(".copy-btn")?.addEventListener("click", async () => {
        await navigator.clipboard.writeText(safeText);
        alert("Скопировано");
      });

      resultBox.appendChild(card);
    });

    if (!resultBox.children.length) {
      resultBox.innerHTML = `<pre>Ошибка: модель вернула варианты без текста.</pre>`;
      return;
    }

    loadHistory();
  } catch (error) {
    resultBox.innerHTML = `<pre>Ошибка сети: ${escapeHtml(error.message)}\nURL: /api/generate</pre>`;
    console.error("FETCH ERROR", error);
  }
}

/* ================= HISTORY ================= */

async function loadHistory() {
  try {
    const response = await fetch("/api/history");
    const data = await response.json();

    if (!data.ok) {
      historyBox.innerHTML = "<p>Ошибка загрузки history.</p>";
      return;
    }

    if (!data.history || !data.history.length) {
      historyBox.innerHTML = "<p>История пока пустая.</p>";
      return;
    }

    historyBox.innerHTML = data.history
      .map((item) => {
        const preview = item.variants?.[0]?.text || "";
        return `
          <div class="history-card">
            <p><strong>${escapeHtml(item.fact_text || "Без факта")}</strong></p>
            <p>${escapeHtml(item.created_at || "")}</p>
            <pre>${escapeHtml(preview)}</pre>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    historyBox.innerHTML = `<p>Ошибка сети: ${escapeHtml(error.message)}</p>`;
  }
}

/* ================= NEWS ================= */

async function onLoadNews() {
  newsStatus.textContent = "Загрузка новостей...";
  loadNewsBtn.disabled = true;
  clearNewsBtn.disabled = true;

  try {
    const response = await fetch("/load-news", { method: "POST" });
    const data = await response.json();

    if (!data.ok) {
      newsStatus.textContent = "Ошибка загрузки новостей.";
      return;
    }

    newsStatus.textContent = `Загружено новых: ${data.added}. Всего в таблице: ${data.total}.`;
    await loadNewsList();
  } catch (error) {
    newsStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    loadNewsBtn.disabled = false;
    clearNewsBtn.disabled = false;
  }
}

async function onClearNews() {
  newsStatus.textContent = "Очистка новостей...";
  loadNewsBtn.disabled = true;
  clearNewsBtn.disabled = true;

  try {
    const response = await fetch("/news", { method: "DELETE" });
    const data = await response.json();

    if (!data.ok) {
      newsStatus.textContent = "Ошибка очистки новостей.";
      return;
    }

    newsStatus.textContent = "Таблица новостей очищена.";
    await loadNewsList();
  } catch (error) {
    newsStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    loadNewsBtn.disabled = false;
    clearNewsBtn.disabled = false;
  }
}

async function loadNewsList() {
  try {
    const response = await fetch("/news");
    const data = await response.json();

    if (!data.ok) {
      newsBox.innerHTML = "<p>Ошибка загрузки списка новостей.</p>";
      return;
    }

    renderSelectableContentTable(newsBox, data.items || [], "news");
  } catch (error) {
    newsBox.innerHTML = `<p>Ошибка сети: ${escapeHtml(error.message)}</p>`;
  }
}

/* ================= FACTS ================= */

async function onLoadFacts() {
  factsStatus.textContent = "Загрузка фактов...";
  loadFactsBtn.disabled = true;
  clearFactsBtn.disabled = true;

  try {
    const response = await fetch("/load-facts", { method: "POST" });
    const data = await response.json();

    if (!data.ok) {
      factsStatus.textContent = "Ошибка загрузки фактов.";
      return;
    }

    factsStatus.textContent = `Загружено новых: ${data.added}. Всего в таблице: ${data.total}.`;
    await loadFactsList();
  } catch (error) {
    factsStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    loadFactsBtn.disabled = false;
    clearFactsBtn.disabled = false;
  }
}

async function onClearFacts() {
  factsStatus.textContent = "Очистка фактов...";
  loadFactsBtn.disabled = true;
  clearFactsBtn.disabled = true;

  try {
    const response = await fetch("/facts", { method: "DELETE" });
    const data = await response.json();

    if (!data.ok) {
      factsStatus.textContent = "Ошибка очистки фактов.";
      return;
    }

    factsStatus.textContent = "Таблица фактов очищена.";
    await loadFactsList();
  } catch (error) {
    factsStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    loadFactsBtn.disabled = false;
    clearFactsBtn.disabled = false;
  }
}

async function loadFactsList() {
  try {
    const response = await fetch("/facts");
    const data = await response.json();

    if (!data.ok) {
      factsBox.innerHTML = "<p>Ошибка загрузки списка фактов.</p>";
      return;
    }

    renderSelectableContentTable(factsBox, data.items || [], "facts");
  } catch (error) {
    factsBox.innerHTML = `<p>Ошибка сети: ${escapeHtml(error.message)}</p>`;
  }
}

/* ================= APHORISMS ================= */

async function onLoadAphorisms() {
  aphorismsStatus.textContent = "Загрузка афоризмов...";
  loadAphorismsBtn.disabled = true;
  clearAphorismsBtn.disabled = true;

  try {
    const response = await fetch("/load-aphorisms", { method: "POST" });
    const data = await response.json();

    if (!data.ok) {
      aphorismsStatus.textContent = "Ошибка загрузки афоризмов.";
      return;
    }

    aphorismsStatus.textContent = `Загружено новых: ${data.added}. Всего в таблице: ${data.total}.`;
    await loadAphorismsList();
  } catch (error) {
    aphorismsStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    loadAphorismsBtn.disabled = false;
    clearAphorismsBtn.disabled = false;
  }
}

/* ================= FACTROOM FACTS ================= */

async function onLoadFactroomFacts() {
  factroomFactsStatus.textContent = "Загрузка Factroom фактов...";
  loadFactroomFactsBtn.disabled = true;
  clearFactroomFactsBtn.disabled = true;

  try {
    const response = await fetch("/load-factroom-facts", { method: "POST" });
    const data = await response.json();

    if (!data.ok) {
      factroomFactsStatus.textContent = "Ошибка загрузки Factroom фактов.";
      return;
    }

    factroomFactsStatus.textContent = `Загружено новых: ${data.added}. Всего в таблице: ${data.total}.`;
    await loadFactroomFactsList();
  } catch (error) {
    factroomFactsStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    loadFactroomFactsBtn.disabled = false;
    clearFactroomFactsBtn.disabled = false;
  }
}

async function onClearFactroomFacts() {
  factroomFactsStatus.textContent = "Очистка Factroom фактов...";
  loadFactroomFactsBtn.disabled = true;
  clearFactroomFactsBtn.disabled = true;

  try {
    const response = await fetch("/factroom-facts", { method: "DELETE" });
    const data = await response.json();

    if (!data.ok) {
      factroomFactsStatus.textContent = "Ошибка очистки Factroom фактов.";
      return;
    }

    factroomFactsStatus.textContent = "Таблица Factroom фактов очищена.";
    await loadFactroomFactsList();
  } catch (error) {
    factroomFactsStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    loadFactroomFactsBtn.disabled = false;
    clearFactroomFactsBtn.disabled = false;
  }
}

async function loadFactroomFactsList() {
  try {
    const response = await fetch("/factroom-facts");
    const data = await response.json();

    if (!data.ok) {
      factroomFactsBox.innerHTML = "<p>Ошибка загрузки списка Factroom фактов.</p>";
      return;
    }

    renderSelectableContentTable(factroomFactsBox, data.items || [], "factroomFacts");
  } catch (error) {
    factroomFactsBox.innerHTML = `<p>Ошибка сети: ${escapeHtml(error.message)}</p>`;
  }
}



async function onClearAphorisms() {
  aphorismsStatus.textContent = "Очистка афоризмов...";
  loadAphorismsBtn.disabled = true;
  clearAphorismsBtn.disabled = true;

  try {
    const response = await fetch("/aphorisms", { method: "DELETE" });
    const data = await response.json();

    if (!data.ok) {
      aphorismsStatus.textContent = "Ошибка очистки афоризмов.";
      return;
    }

    aphorismsStatus.textContent = "Таблица афоризмов очищена.";
    await loadAphorismsList();
  } catch (error) {
    aphorismsStatus.textContent = `Ошибка сети: ${error.message}`;
  } finally {
    loadAphorismsBtn.disabled = false;
    clearAphorismsBtn.disabled = false;
  }
}

async function loadAphorismsList() {
  try {
    const response = await fetch("/aphorisms");
    const data = await response.json();

    if (!data.ok) {
      aphorismsBox.innerHTML = "<p>Ошибка загрузки списка афоризмов.</p>";
      return;
    }

    renderSelectableContentTable(aphorismsBox, data.items || [], "aphorisms");
  } catch (error) {
    aphorismsBox.innerHTML = `<p>Ошибка сети: ${escapeHtml(error.message)}</p>`;
  }
}

/* ================= SELECTABLE CONTENT TABLE ================= */

function renderSelectableContentTable(targetBox, items, type) {
  if (!items.length) {
    targetBox.innerHTML = "<p>Пока пусто.</p>";
    return;
  }

  const rows = items
    .map((item, index) => {
      const text = String(item?.title || "").trim();
      const source = String(item?.source || "").trim();
      const url = String(item?.url || "").trim();

      return `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #eee;">${index + 1}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(text)}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(source)}</td>
          <td style="padding:8px; border-bottom:1px solid #eee;">
            ${
              url
                ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open</a>`
                : "-"
            }
          </td>
          <td style="padding:8px; border-bottom:1px solid #eee;">
            <button
              type="button"
              class="use-content-btn"
              data-type="${escapeHtmlAttribute(type)}"
              data-text="${escapeHtmlAttribute(text)}"
              data-source="${escapeHtmlAttribute(source)}"
            >
              Use
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  targetBox.innerHTML = `
    <div style="overflow:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">#</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Text</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Source</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Link</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  targetBox.querySelectorAll(".use-content-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      useContentForGeneration(
        btn.dataset.text || "",
        btn.dataset.source || "",
        btn.dataset.type || ""
      );
    });
  });
}

function getContentPrefix(type) {
  if (type === "news") return "Новость";
  if (type === "facts") return "Факт";
  if (type === "factroomFacts") return "Факт";
  if (type === "aphorisms") return "Цитата";
  return "Материал";
}

function getNextContentNumber(existingText, prefix) {
  const regex = new RegExp(`\\(${prefix} \\d+\\)`, "g");
  const matches = existingText.match(regex) || [];
  return matches.length + 1;
}

function useContentForGeneration(text, source, type) {
  const preparedText = String(text || "").trim();
  const preparedSource = String(source || "").trim();

  if (!preparedText) return;

  const factTextEl = document.getElementById("factText");
  const useFactTextEl = document.getElementById("useFactText");

  if (!factTextEl) return;

  const currentText = String(factTextEl.value || "").trim();
  const prefix = getContentPrefix(type);
  const nextNumber = getNextContentNumber(currentText, prefix);

  const sourcePart = preparedSource
    ? ` (источник: ${preparedSource}).`
    : ".";

  const newLine = `(${prefix} ${nextNumber}) ${preparedText}${sourcePart}`;

  factTextEl.value = currentText
    ? `${currentText}\n${newLine}`
    : newLine;

  if (useFactTextEl) {
    useFactTextEl.checked = true;
  }

  saveLocalFormState();

  const message = "Материал добавлен в поле Факт.";

  if (type === "news" && newsStatus) {
    newsStatus.textContent = message;
  }

  if (type === "facts" && factsStatus) {
    factsStatus.textContent = message;
  }
  if (type === "factroomFacts" && factroomFactsStatus) {
  factroomFactsStatus.textContent = message;
}

  if (type === "aphorisms" && aphorismsStatus) {
    aphorismsStatus.textContent = message;
  }
}

/* ================= LOCAL FORM STATE ================= */

function getFieldValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return String(el.value ?? "").trim();
}

function getCheckboxValue(id) {
  const el = document.getElementById(id);
  return Boolean(el?.checked);
}

function collectLocalFormState() {
  const state = {};

  LOCAL_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === "checkbox") {
      state[id] = el.checked;
    } else {
      state[id] = el.value;
    }
  });

  return state;
}

function saveLocalFormState() {
  try {
    const state = collectLocalFormState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("saveLocalFormState error:", error);
  }
}

function restoreLocalFormState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const state = JSON.parse(raw);
    if (!state || typeof state !== "object") return;

    LOCAL_FIELD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!(id in state)) return;

      if (el.type === "checkbox") {
        el.checked = Boolean(state[id]);
      } else {
        el.value = state[id];
      }
    });
  } catch (error) {
    console.error("restoreLocalFormState error:", error);
  }
}

function bindLocalPersistentFields() {
  LOCAL_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const eventName =
      el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";

    el.addEventListener(eventName, saveLocalFormState);
  });
}

/* ================= UI ================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeHtmlAttribute(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  function activateTab(tabName) {
    tabs.forEach((b) => b.classList.remove("active"));
    contents.forEach((content) => content.classList.remove("active"));

    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const content = document.getElementById("tab-" + tabName);

    btn?.classList.add("active");
    content?.classList.add("active");
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      activateTab(btn.dataset.tab);
    });
  });

  const hashTab = window.location.hash.replace("#tab-", "");

  if (hashTab) {
    setTimeout(() => {
      activateTab(hashTab);
    }, 0);
  }
}