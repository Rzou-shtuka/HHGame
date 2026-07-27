(() => {
  if (window.__houhouAutoCheckLoaded) return;
  window.__houhouAutoCheckLoaded = true;

  const STORAGE_KEY = "houhou-answer-review-v1";
  const cards = [...document.querySelectorAll(".question-card")];
  const answerKey = Array.isArray(window.HOUHOU_ANSWER_KEY) ? window.HOUHOU_ANSWER_KEY : [];
  if (!cards.length) return;

  const emptyState = () => ({
    answers: Array(cards.length).fill(""),
    judgments: Array(cards.length).fill(null)
  });

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.answers) || !Array.isArray(saved.judgments)) return emptyState();
      return {
        answers: cards.map((_, i) => typeof saved.answers[i] === "string" ? saved.answers[i] : ""),
        judgments: cards.map((_, i) => saved.judgments[i] === "correct" ? "correct" : null)
      };
    } catch {
      return emptyState();
    }
  }

  let state = loadState();
  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s\u3000]/g, "")
      .replace(/[.,!?;:'\"，。！？；：、（）()【】\[\]《》<>“”‘’\-—_]/g, "");
  }

  function configuredAnswers(index) {
    return Array.isArray(answerKey[index]) ? answerKey[index] : [];
  }

  function isAnyNonEmptyAnswer(index) {
    return configuredAnswers(index).some((answer) => String(answer).trim() === "*");
  }

  function hasConfiguredAnswer(index) {
    return isAnyNonEmptyAnswer(index) || configuredAnswers(index).some((answer) => normalize(answer));
  }

  function isCorrect(index, value) {
    const normalized = normalize(value);
    if (!normalized) return false;
    if (isAnyNonEmptyAnswer(index)) return true;
    return configuredAnswers(index).map(normalize).filter(Boolean).includes(normalized);
  }

  const style = document.createElement("style");
  style.textContent = `
    .answer-check-wrap{margin-top:15px;padding-top:15px;border-top:1px solid rgba(23,76,53,.12)}
    .answer-label{display:block;margin-bottom:7px;color:var(--green-900);font-size:.84rem;font-weight:850}
    .answer-box{width:100%;min-height:96px;padding:12px 13px;resize:vertical;border:1px solid rgba(23,76,53,.2);border-radius:13px;outline:none;color:var(--ink);line-height:1.55;background:#fbfdfb;transition:border-color 160ms ease,box-shadow 160ms ease}
    .answer-box:focus{border-color:var(--green-500);box-shadow:0 0 0 4px rgba(72,164,119,.13)}
    .answer-box:disabled{color:#315044;background:var(--green-100);cursor:default}
    .answer-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}
    .save-answer{padding:9px 14px;border:0;border-radius:999px;color:var(--white);font-weight:850;background:var(--green-700);cursor:pointer}
    .save-answer:disabled{color:var(--green-900);background:var(--green-200);cursor:default}
    .answer-status{color:var(--muted);font-size:.8rem;font-weight:800}
    .answer-status.correct{color:var(--green-700)}
    .answer-status.wrong{color:var(--danger)}
  `;
  document.head.appendChild(style);

  function updateProgress() {
    const correctCount = state.judgments.filter((value) => value === "correct").length;
    const counter = document.getElementById("questionCounter");
    if (counter) counter.textContent = `已答对 ${correctCount} / ${cards.length}`;

    document.querySelectorAll(".milestone-card").forEach((card) => {
      const threshold = Number(card.dataset.threshold);
      const unlocked = correctCount >= threshold;
      card.classList.toggle("is-unlocked", unlocked);
      const label = card.querySelector(".milestone-state");
      if (label) label.textContent = unlocked ? "✓ 已解锁" : `还差 ${Math.max(0, threshold - correctCount)} 个正确回答`;
    });
  }

  function applyCardState(card, index) {
    const correct = state.judgments[index] === "correct";
    card.classList.toggle("is-complete", correct);
    const subtitle = card.querySelector(".question-subtitle");
    const textarea = card.querySelector(".answer-box");
    const button = card.querySelector(".save-answer");
    const status = card.querySelector(".answer-status");

    if (subtitle) subtitle.textContent = correct ? "✓ 已答对" : "点击展开问题并输入答案";
    if (textarea) {
      textarea.value = state.answers[index] || "";
      textarea.disabled = correct;
    }
    if (button) {
      button.disabled = correct;
      button.textContent = correct ? "✓ 已答对" : "提交答案";
    }
    if (status) {
      status.className = `answer-status${correct ? " correct" : ""}`;
      status.textContent = correct ? "回答正确，已计入通关进度。" : "";
    }
  }

  cards.forEach((card, index) => {
    const body = card.querySelector(".question-body");
    if (!body) return;
    body.querySelector(".complete-button")?.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "answer-check-wrap";
    wrapper.innerHTML = `
      <label class="answer-label" for="answer-${index}">你的回答</label>
      <textarea class="answer-box" id="answer-${index}" placeholder="在这里输入答案……"></textarea>
      <div class="answer-actions">
        <button class="save-answer" type="button">提交答案</button>
        <span class="answer-status"></span>
      </div>`;
    body.appendChild(wrapper);

    const textarea = wrapper.querySelector(".answer-box");
    const button = wrapper.querySelector(".save-answer");
    const status = wrapper.querySelector(".answer-status");

    button.addEventListener("click", () => {
      const value = textarea.value.trim();
      if (!value) {
        status.className = "answer-status wrong";
        status.textContent = "请先输入答案。";
        textarea.focus();
        return;
      }
      if (!hasConfiguredAnswer(index)) {
        window.alert("这一题还没有设置答案，请联系出题人。");
        return;
      }

      state.answers[index] = value;
      if (isCorrect(index, value)) {
        state.judgments[index] = "correct";
        persist();
        applyCardState(card, index);
        updateProgress();
        window.alert("回答正确！");
      } else {
        state.judgments[index] = null;
        persist();
        status.className = "answer-status wrong";
        status.textContent = "答案不对，再试试吧。";
        window.alert("答案不对，再改一改吧。");
        textarea.focus();
        textarea.select();
      }
    });

    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") button.click();
    });

    applyCardState(card, index);
  });

  const rulesDescription = document.querySelector(".rules-hero p");
  if (rulesDescription) rulesDescription.textContent = "自由选择问题并输入答案。系统会自动判断，答错后可以继续修改。";
  const panelDescription = document.querySelector(".questions-panel .panel-title-wrap p");
  if (panelDescription) panelDescription.textContent = "输入答案并提交，系统会自动判断是否正确。";
  const milestoneDescription = document.querySelector(".milestone-heading p");
  if (milestoneDescription) milestoneDescription.textContent = "每一个正确答案都会计入通关进度。";

  updateProgress();

  const resetButton = document.getElementById("resetButton");
  if (resetButton) {
    resetButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!window.confirm("确定重新开始吗？所有已输入答案和通关进度都会被清除。")) return;
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }, true);
  }
})();
