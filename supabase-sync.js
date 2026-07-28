(() => {
  if (window.__houhouSupabaseSyncLoaded) return;
  window.__houhouSupabaseSyncLoaded = true;

  const config = window.HOUHOU_SUPABASE;
  if (!config?.url || !config?.publishableKey) return;

  const STORAGE_KEY = "houhou-answer-review-v1";
  const SESSION_KEY = "houhou-player-session-v1";

  function getSessionId() {
    let value = localStorage.getItem(SESSION_KEY);
    if (value) return value;
    value = globalThis.crypto?.randomUUID?.() || `houhou-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, value);
    return value;
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  async function submitAttempt(payload) {
    const response = await fetch(`${config.url}/rest/v1/answer_submissions`, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`Supabase ${response.status}: ${message}`);
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".save-answer");
    if (!button || button.disabled) return;

    const card = button.closest(".question-card");
    const textarea = card?.querySelector(".answer-box");
    const answer = textarea?.value.trim();
    if (!card || !answer) return;

    const cards = [...document.querySelectorAll(".question-card")];
    const index = cards.indexOf(card);
    if (index < 0) return;

    const questionText = card.querySelector(".question-prompt")?.textContent?.trim()
      || card.querySelector(".question-title")?.textContent?.trim()
      || `问题 ${index + 1}`;

    setTimeout(() => {
      const state = readState();
      const isCorrect = state.judgments?.[index] === "correct";

      submitAttempt({
        session_id: getSessionId(),
        question_number: index + 1,
        question_text: questionText,
        answer_text: answer,
        is_correct: isCorrect,
        user_agent: navigator.userAgent.slice(0, 500)
      }).catch((error) => {
        console.error("答案同步失败：", error);
        const status = card.querySelector(".answer-status");
        if (status && !isCorrect) {
          status.textContent = `${status.textContent || "答案已检查"}（暂未同步）`;
        }
      });
    }, 120);
  }, true);
})();
