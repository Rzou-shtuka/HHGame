(() => {
  if (window.__houhouAnswerReviewLoaded) return;
  window.__houhouAnswerReviewLoaded = true;

  const STORAGE_KEY = "houhou-answer-review-v2";
  const cards = [...document.querySelectorAll(".question-card")];
  if (!cards.length) return;

  const params = new URLSearchParams(window.location.search);
  const isHostMode = params.get("mode") === "host";
  let config = null;
  let state = { answers: Array(cards.length).fill(""), judgments: Array(cards.length).fill(null) };

  function loadScript(src) {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = resolve;
      document.head.appendChild(script);
    });
  }

  function normalizeState(raw) {
    return {
      answers: cards.map((_, i) => typeof raw?.answers?.[i] === "string" ? raw.answers[i] : ""),
      judgments: cards.map((_, i) => ["correct", "wrong"].includes(raw?.judgments?.[i]) ? raw.judgments[i] : null)
    };
  }

  function loadLocal() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
    } catch {
      return normalizeState({});
    }
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function isOnlineSyncReady() {
    return Boolean(
      config &&
      config.supabaseUrl &&
      config.supabaseAnonKey &&
      !config.supabaseUrl.includes("YOUR_") &&
      !config.supabaseAnonKey.includes("YOUR_")
    );
  }

  function headers() {
    return {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };
  }

  async function fetchRemoteState() {
    if (!isOnlineSyncReady()) return loadLocal();
    const gameId = encodeURIComponent(config.gameId || "houhou-main");
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/houhou_answers?game_id=eq.${gameId}&select=question_index,answer,judgment`,
      { headers: headers(), cache: "no-store" }
    );
    if (!response.ok) throw new Error(`同步读取失败：${response.status}`);
    const rows = await response.json();
    const next = normalizeState({});
    rows.forEach((row) => {
      const i = Number(row.question_index);
      if (Number.isInteger(i) && i >= 0 && i < cards.length) {
        next.answers[i] = typeof row.answer === "string" ? row.answer : "";
        next.judgments[i] = ["correct", "wrong"].includes(row.judgment) ? row.judgment : null;
      }
    });
    return next;
  }

  async function saveAnswer(index, answer) {
    state.answers[index] = answer;
    state.judgments[index] = null;
    saveLocal();
    if (!isOnlineSyncReady()) return;

    const payload = {
      game_id: config.gameId || "houhou-main",
      question_index: index,
      answer,
      judgment: null,
      updated_at: new Date().toISOString()
    };
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/houhou_answers?on_conflict=game_id,question_index`,
      { method: "POST", headers: { ...headers(), Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(payload) }
    );
    if (!response.ok) throw new Error(`答案同步失败：${response.status}`);
  }

  async function saveJudgment(index, judgment) {
    state.judgments[index] = judgment;
    saveLocal();
    if (!isOnlineSyncReady()) return;

    const gameId = encodeURIComponent(config.gameId || "houhou-main");
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/houhou_answers?game_id=eq.${gameId}&question_index=eq.${index}`,
      {
        method: "PATCH",
        headers: { ...headers(), Prefer: "return=minimal" },
        body: JSON.stringify({ judgment, updated_at: new Date().toISOString() })
      }
    );
    if (!response.ok) throw new Error(`判定同步失败：${response.status}`);
  }

  function requireHostAccess() {
    if (!isHostMode) return true;
    const expected = String(config?.hostPin || "");
    const entered = window.prompt("请输入出题人密码：");
    if (!expected || entered !== expected) {
      window.alert("密码不正确，将返回玩家页面。");
      window.location.replace(window.location.pathname);
      return false;
    }
    return true;
  }

  const style = document.createElement("style");
  style.textContent = `
    .question-card.is-wrong { border-color: rgba(182,75,69,.5)!important; background:linear-gradient(135deg,var(--white),#fff0ef)!important; }
    .question-card.is-wrong .question-number { background:linear-gradient(145deg,#8f3f3a,var(--danger))!important; }
    .answer-review-wrap { margin-top:15px; padding-top:15px; border-top:1px solid rgba(23,76,53,.12); }
    .answer-label,.judge-title { display:block; margin:0 0 7px; color:var(--green-900); font-size:.84rem; font-weight:850; }
    .answer-box { width:100%; min-height:96px; padding:12px 13px; resize:vertical; border:1px solid rgba(23,76,53,.2); border-radius:13px; outline:none; color:var(--ink); line-height:1.55; background:#fbfdfb; }
    .answer-box:focus { border-color:var(--green-500); box-shadow:0 0 0 4px rgba(72,164,119,.13); }
    .answer-actions,.judge-buttons { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-top:10px; }
    .save-answer,.judge-button { border:0; cursor:pointer; padding:9px 14px; border-radius:999px; font-weight:850; }
    .save-answer { color:#fff; background:var(--green-700); }
    .judge-button.correct { color:var(--green-900); background:var(--green-200); }
    .judge-button.wrong { color:#7d302c; background:#ffd9d6; }
    .save-status,.judge-result,.sync-status { color:var(--muted); font-size:.78rem; font-weight:750; }
    .judge-area { margin-top:15px; padding:13px; border:1px dashed rgba(23,76,53,.22); border-radius:13px; background:rgba(231,245,237,.58); }
    .player-result { margin-top:12px; padding:10px 12px; border-radius:12px; background:var(--green-100); color:var(--muted); font-size:.82rem; font-weight:800; }
    .host-banner { margin-bottom:16px; padding:12px 16px; border-radius:16px; color:#fff; background:rgba(11,46,33,.65); text-align:center; font-weight:850; }
  `;
  document.head.appendChild(style);

  function subtitleFor(index) {
    if (state.judgments[index] === "correct") return "✓ 回答正确";
    if (state.judgments[index] === "wrong") return "再想想看 :)";
    if (state.answers[index]) return "回答已提交，等待判定";
    return "点击展开问题并填写回答";
  }

  function applyCardState(card, index) {
    const judgment = state.judgments[index];
    card.classList.toggle("is-complete", judgment === "correct");
    card.classList.toggle("is-wrong", judgment === "wrong");
    const subtitle = card.querySelector(".question-subtitle");
    if (subtitle) subtitle.textContent = subtitleFor(index);
    const result = card.querySelector(".judge-result,.player-result");
    if (result) {
      result.textContent = judgment === "correct"
        ? "✓ 这个回答被判定为正确。"
        : judgment === "wrong"
          ? "好像还不是这个答案，再想想看 :)"
          : state.answers[index]
            ? "回答已提交，等待出题人判定。"
            : "";
    }
  }

  function enhanceCard(card, index) {
    const body = card.querySelector(".question-body");
    if (!body) return;
    body.querySelector(".complete-button")?.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "answer-review-wrap";
    wrapper.innerHTML = isHostMode ? `
      <label class="answer-label">玩家回答</label>
      <textarea class="answer-box" readonly></textarea>
      <div class="judge-area">
        <p class="judge-title">出题人判定</p>
        <div class="judge-buttons">
          <button class="judge-button correct" type="button">✓ 回答正确</button>
          <button class="judge-button wrong" type="button">再想想看</button>
        </div>
        <div class="judge-result"></div>
      </div>
    ` : `
      <label class="answer-label" for="answer-${index}">你的回答</label>
      <textarea class="answer-box" id="answer-${index}" placeholder="在这里输入回答……"></textarea>
      <div class="answer-actions">
        <button class="save-answer" type="button">提交回答</button>
        <span class="save-status"></span>
      </div>
      <div class="player-result"></div>
    `;
    body.appendChild(wrapper);

    const textarea = wrapper.querySelector(".answer-box");
    textarea.value = state.answers[index];

    if (isHostMode) {
      wrapper.querySelector(".judge-button.correct").addEventListener("click", async () => {
        if (!state.answers[index]) return;
        await saveJudgment(index, "correct");
        applyAll();
      });
      wrapper.querySelector(".judge-button.wrong").addEventListener("click", async () => {
        if (!state.answers[index]) return;
        await saveJudgment(index, "wrong");
        applyAll();
      });
    } else {
      const status = wrapper.querySelector(".save-status");
      wrapper.querySelector(".save-answer").addEventListener("click", async () => {
        const answer = textarea.value.trim();
        if (!answer) {
          status.textContent = "请先填写回答";
          textarea.focus();
          return;
        }
        try {
          status.textContent = "正在提交……";
          await saveAnswer(index, answer);
          status.textContent = isOnlineSyncReady() ? "✓ 已同步提交" : "✓ 已保存在本机";
          applyAll();
        } catch (error) {
          status.textContent = error.message;
        }
      });
    }
    applyCardState(card, index);
  }

  function updateProgress() {
    const correct = state.judgments.filter((v) => v === "correct").length;
    const answered = state.answers.filter(Boolean).length;
    const counter = document.getElementById("questionCounter");
    if (counter) counter.textContent = isHostMode
      ? `待审核 ${answered - state.judgments.filter(Boolean).length} · 正确 ${correct}`
      : `回答正确 ${correct} / ${cards.length} · 已提交 ${answered}`;

    document.querySelectorAll(".milestone-card").forEach((card) => {
      const threshold = Number(card.dataset.threshold);
      const unlocked = correct >= threshold;
      card.classList.toggle("is-unlocked", unlocked);
      const label = card.querySelector(".milestone-state");
      if (label) label.textContent = unlocked ? "✓ 已解锁" : `还差 ${Math.max(0, threshold - correct)} 个正确回答`;
    });
    window.dispatchEvent(new CustomEvent("houhou-state-updated", { detail: { correct, answered } }));
  }

  function applyAll() {
    cards.forEach((card, i) => {
      const textarea = card.querySelector(".answer-box");
      if (textarea && document.activeElement !== textarea) textarea.value = state.answers[i];
      applyCardState(card, i);
    });
    updateProgress();
  }

  async function refresh() {
    try {
      state = await fetchRemoteState();
      saveLocal();
      applyAll();
    } catch (error) {
      console.warn(error);
    }
  }

  async function init() {
    await loadScript("./sync-config.js?v=1");
    config = window.HOUHOU_SYNC_CONFIG || {};
    if (!requireHostAccess()) return;
    state = await fetchRemoteState().catch(() => loadLocal());

    if (isHostMode) {
      const banner = document.createElement("div");
      banner.className = "host-banner";
      banner.textContent = isOnlineSyncReady() ? "出题人模式 · 在线同步已连接" : "出题人模式 · 当前仅本机保存";
      document.querySelector(".site-shell")?.prepend(banner);
    }

    cards.forEach(enhanceCard);
    applyAll();
    setInterval(refresh, 5000);
  }

  init();
})();
