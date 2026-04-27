const generateBtn = document.getElementById("generateBtn");
const reloadHistoryBtn = document.getElementById("reloadHistoryBtn");

const loadNewsBtn = document.getElementById("loadNewsBtn");
const clearNewsBtn = document.getElementById("clearNewsBtn");
const loadFactsBtn = document.getElementById("loadFactsBtn");
const clearFactsBtn = document.getElementById("clearFactsBtn");
const loadAphorismsBtn = document.getElementById("loadAphorismsBtn");
const clearAphorismsBtn = document.getElementById("clearAphorismsBtn");

const promptBox = document.getElementById("promptBox");
const resultBox = document.getElementById("resultBox");
const historyBox = document.getElementById("historyBox");

const newsBox = document.getElementById("newsBox");
const newsStatus = document.getElementById("newsStatus");

const factsBox = document.getElementById("factsBox");
const factsStatus = document.getElementById("factsStatus");

const aphorismsBox = document.getElementById("aphorismsBox");
const aphorismsStatus = document.getElementById("aphorismsStatus");

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

const STORAGE_KEY = "cto-review-form-state-v1";

const PERSISTED_FIELD_IDS = [
  "mentalModel",
  "prompt1",
  "prompt2",
  "prompt3",
  "language",
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
  "useMentalModel",
  "usePrompt1",
  "usePrompt2",
  "usePrompt3",
  "useLanguage",
  "useFactText",
  "useGoal",
  "useMeetingSize",
  "useMeetingType",
  "useTone",
  "useSmallTalkSize",
  "useConversationInvite",
  "useLanguageLevel",
  "useArchetype"
];

generateBtn?.addEventListener("click", onGenerate);
reloadHistoryBtn?.addEventListener("click", loadHistory);

loadNewsBtn?.addEventListener("click", onLoadNews);
clearNewsBtn?.addEventListener("click", onClearNews);

loadFactsBtn?.addEventListener("click", onLoadFacts);
clearFactsBtn?.addEventListener("click", onClearFacts);

loadAphorismsBtn?.addEventListener("click", onLoadAphorisms);
clearAphorismsBtn?.addEventListener("click", onClearAphorisms);

initializeApp();

async function initializeApp() {
  await loadDictionaries();
  bindPersistentFields();
  restoreFormState();
  setupTabs();

  loadHistory();
  loadNewsList();
  loadFactsList();
  loadAphorismsList();
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
    conversationInvite: getFieldValue("conversationInvite"),
    languageLevel: getFieldValue("languageLevel"),
    archetype: getFieldValue("archetype"),

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

    renderSimpleTable(newsBox, data.items || [], [
      { key: "title", label: "Title" },
      { key: "source", label: "Source" }
    ], true);
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

    renderSimpleTable(factsBox, data.items || [], [
      { key: "title", label: "Title" },
      { key: "source", label: "Source" }
    ], true);
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

    renderAphorismsTable(aphorismsBox, data.items || []);
  } catch (error) {
    aphorismsBox.innerHTML = `<p>Ошибка сети: ${escapeHtml(error.message)}</p>`;
  }
}

function renderAphorismsTable(targetBox, items) {
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
              class="use-aphorism-btn"
              data-text="${escapeHtmlAttribute(text)}"
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

  targetBox.querySelectorAll(".use-aphorism-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.text || "";
      useAphorismForGeneration(text);
    });
  });
}

function useAphorismForGeneration(text) {
  const prepared = String(text || "").trim();
  if (!prepared) return;

  const factTextEl = document.getElementById("factText");
  const useFactTextEl = document.getElementById("useFactText");

  if (factTextEl) {
    factTextEl.value = prepared;
  }

  if (useFactTextEl) {
    useFactTextEl.checked = true;
  }

  saveFormState();
  aphorismsStatus.textContent = "Афоризм подставлен в поле Факт.";
}

/* ================= SHARED TABLE ================= */

function renderSimpleTable(targetBox, items, columns, includeLink = false) {
  if (!items.length) {
    targetBox.innerHTML = "<p>Пока пусто.</p>";
    return;
  }

  const headers = columns
    .map((col) => `<th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">${escapeHtml(col.label)}</th>`)
    .join("");

  const rows = items
    .map((item, index) => {
      const cells = columns
        .map((col) => `<td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(item[col.key] || "")}</td>`)
        .join("");

      const linkCell = includeLink
        ? `<td style="padding:8px; border-bottom:1px solid #eee;">${
            item.url
              ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open</a>`
              : "-"
          }</td>`
        : "";

      return `
        <tr>
          <td style="padding:8px; border-bottom:1px solid #eee;">${index + 1}</td>
          ${cells}
          ${linkCell}
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
            ${headers}
            ${includeLink ? `<th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Link</th>` : ""}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ================= FORM STATE ================= */

function getFieldValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return String(el.value ?? "").trim();
}

function getCheckboxValue(id) {
  const el = document.getElementById(id);
  return Boolean(el?.checked);
}

function collectFormState() {
  const state = {};

  PERSISTED_FIELD_IDS.forEach((id) => {
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

function saveFormState() {
  try {
    const state = collectFormState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("saveFormState error:", error);
  }
}

function restoreFormState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const state = JSON.parse(raw);
    if (!state || typeof state !== "object") return;

    PERSISTED_FIELD_IDS.forEach((id) => {
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
    console.error("restoreFormState error:", error);
  }
}

function bindPersistentFields() {
  PERSISTED_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const eventName =
      el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";

    el.addEventListener(eventName, saveFormState);
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

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;

      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      contents.forEach((content) => {
        content.classList.remove("active");

        if (content.id === "tab-" + target) {
          content.classList.add("active");
        }
      });
    });
  });
}