const generateBtn = document.getElementById("generateBtn");
const reloadHistoryBtn = document.getElementById("reloadHistoryBtn");
const promptBox = document.getElementById("promptBox");
const resultBox = document.getElementById("resultBox");
const historyBox = document.getElementById("historyBox");

generateBtn.addEventListener("click", onGenerate);
reloadHistoryBtn.addEventListener("click", loadHistory);

loadHistory();

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