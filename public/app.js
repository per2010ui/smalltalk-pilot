const generateBtn = document.getElementById("generateBtn");
const reloadHistoryBtn = document.getElementById("reloadHistoryBtn");

const loadNewsBtn = document.getElementById("loadNewsBtn");
const clearNewsBtn = document.getElementById("clearNewsBtn");
const loadFactsBtn = document.getElementById("loadFactsBtn");
const clearFactsBtn = document.getElementById("clearFactsBtn");

const promptBox = document.getElementById("promptBox");
const resultBox = document.getElementById("resultBox");
const historyBox = document.getElementById("historyBox");

const newsBox = document.getElementById("newsBox");
const newsStatus = document.getElementById("newsStatus");

const factsBox = document.getElementById("factsBox");
const factsStatus = document.getElementById("factsStatus");

generateBtn.addEventListener("click", onGenerate);
reloadHistoryBtn.addEventListener("click", loadHistory);

loadNewsBtn.addEventListener("click", onLoadNews);
clearNewsBtn.addEventListener("click", onClearNews);

loadFactsBtn.addEventListener("click", onLoadFacts);
clearFactsBtn.addEventListener("click", onClearFacts);

loadHistory();
loadNewsList();
loadFactsList();

async function onLoadNews() {
  newsStatus.textContent = "Загрузка новостей...";
  loadNewsBtn.disabled = true;
  clearNewsBtn.disabled = true;

  try {
    const response = await fetch("/load-news", {
      method: "POST"
    });

    const data = await response.json();

    if (!data.ok) {
      newsStatus.textContent = "Ошибка загрузки новостей.";
      return;
    }

    newsStatus.textContent =
      `Загружено новых: ${data.added}. Всего в таблице: ${data.total}.`;

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
    const response = await fetch("/news", {
      method: "DELETE"
    });

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

    renderNewsTable(data.items || []);
  } catch (error) {
    newsBox.innerHTML = `<p>Ошибка сети: ${escapeHtml(error.message)}</p>`;
  }
}

function renderNewsTable(items) {
  if (!items.length) {
    newsBox.innerHTML = "<p>Новостей пока нет.</p>";
    return;
  }

  const rows = items.map((item, index) => {
    return `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #eee;">${index + 1}</td>
        <td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(item.title)}</td>
        <td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(item.source || "")}</td>
        <td style="padding:8px; border-bottom:1px solid #eee;">
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open</a>
        </td>
      </tr>
    `;
  }).join("");

  newsBox.innerHTML = `
    <div style="overflow:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">#</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Title</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Source</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function onLoadFacts() {
  factsStatus.textContent = "Загрузка фактов...";
  loadFactsBtn.disabled = true;
  clearFactsBtn.disabled = true;

  try {
    const response = await fetch("/load-facts", {
      method: "POST"
    });

    const data = await response.json();

    if (!data.ok) {
      factsStatus.textContent = "Ошибка загрузки фактов.";
      return;
    }

    factsStatus.textContent =
      `Загружено новых: ${data.added}. Всего в таблице: ${data.total}.`;

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
    const response = await fetch("/facts", {
      method: "DELETE"
    });

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

    renderFactsTable(data.items || []);
  } catch (error) {
    factsBox.innerHTML = `<p>Ошибка сети: ${escapeHtml(error.message)}</p>`;
  }
}

function renderFactsTable(items) {
  if (!items.length) {
    factsBox.innerHTML = "<p>Фактов пока нет.</p>";
    return;
  }

  const rows = items.map((item, index) => {
    const linkHtml = item.url
      ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Open</a>`
      : "-";

    return `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #eee;">${index + 1}</td>
        <td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(item.title)}</td>
        <td style="padding:8px; border-bottom:1px solid #eee;">${escapeHtml(item.source || "")}</td>
        <td style="padding:8px; border-bottom:1px solid #eee;">${linkHtml}</td>
      </tr>
    `;
  }).join("");

  factsBox.innerHTML = `
    <div style="overflow:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">#</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Title</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Source</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #ddd;">Link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
} 
loadNewsList();

async function onGenerate() {
  const payload = {
    factText: document.getElementById("factText").value.trim(),
    audience: document.getElementById("audience").value.trim(),
    situation: document.getElementById("situation").value.trim(),
    goal: document.getElementById("goal").value.trim(),
    tone: document.getElementById("tone").value,
    language: document.getElementById("language").value,
    send_to_ai: document.getElementById("sendToAi").checked
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

    resultBox.innerHTML = "";

    (data.variants || []).forEach((item) => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `
        <div class="result-header">
          <strong>Вариант ${item.id}</strong>
          <button type="button" class="copy-btn">Copy</button>
        </div>
        <pre>${escapeHtml(item.text)}</pre>
      `;

      card.querySelector(".copy-btn").addEventListener("click", async () => {
        await navigator.clipboard.writeText(item.text);
        alert("Скопировано");
      });

      resultBox.appendChild(card);
    });

    loadHistory();
  } catch (error) {
    resultBox.innerHTML = `<pre>Ошибка сети: ${escapeHtml(error.message)}\nURL: /api/generate</pre>`;
console.error("FETCH ERROR", error);
  }
}

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

    historyBox.innerHTML = data.history.map((item) => {
      const preview = item.variants?.[0]?.text || "";
      return `
        <div class="history-card">
          <p><strong>${escapeHtml(item.fact_text || "Без факта")}</strong></p>
          <p>${escapeHtml(item.created_at || "")}</p>
          <pre>${escapeHtml(preview)}</pre>
        </div>
      `;
    }).join("");
  } catch (error) {
    historyBox.innerHTML = `<p>Ошибка сети: ${escapeHtml(error.message)}</p>`;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}