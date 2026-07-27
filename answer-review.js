(() => {
  if (window.__houhouAnswerReviewLoaded) return;
  window.__houhouAnswerReviewLoaded = true;

  const STORAGE_KEY = "houhou-answer-review-v1";
  const cards = [...document.querySelectorAll(".question-card")];
  if (!cards.length) return;

  const emptyState = () => ({
    answers: Array(cards.length).fill(""),
    judgments: Array(cards.length).fill(null)
  });

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || !Array.isArray(parsed.answers) || !Array.isArray(parsed.judgments)) {
        return emptyState();
      }
      return {
        answers: cards.map((_, index) => typeof parsed.answers[index] === "string" ? parsed.answers[index] : ""),
        judgments: cards.map((_, index) => ["correct", "wrong"].includes(parsed.judgments[index]) ? parsed.judgments[index] : null)
      };
    } catch {
      return emptyState();
    }
  }

  let state = loadState();

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const style = document.createElement("style");
  style.textContent = `
    .question-card.is-wrong {
      border-color: rgba(182,75,69,.5) !important;
      background: linear-gradient(135deg, var(--white), #fff0ef) !important;
    }

    .question-card.is-wrong .question-number {
      background: linear-gradient(145deg, #8f3f3a, var(--danger)) !important;
    }

    .answer-review-wrap {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid rgba(23,76,53,.12);
    }

    .answer-label {
      display: block;
      margin-bottom: 7px;
      color: var(--green-900);
      font-size: .84rem;
      font-weight: 850;
    }

    .answer-box {
      width: 100%;
      min-height: 96px;
      padding: 12px 13px;
      resize: vertical;
      border: 1px solid rgba(23,76,53,.2);
      border-radius: 13px;
      outline: none;
      color: var(--ink);
      line-height: 1.55;
      background: #fbfdfb;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    .answer-box:focus {
      border-color: var(--green-500);
      box-shadow: 0 0 0 4px rgba(72,164,119,.13);
    }

    .answer-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .save-answer,
    .judge-button {
      border: 0;
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .save-answer {
      padding: 9px 14px;
      border-radius: 999px;
      color: var(--white);
      font-weight: 850;
      background: var(--green-700);
    }

    .save-answer:hover,
    .judge-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(35,100,71,.18);
    }

    .save-status {
      color: var(--muted);
      font-size: .78rem;
      font-weight: 750;
    }

    .judge-area {
      display: none;
      margin-top: 15px;
      padding: 13px;
      border: 1px dashed rgba(23,76,53,.22);
      border-radius: 13px;
      background: rgba(231,245,237,.58);
    }

    .judge-area.is-visible { display: block; }

    .judge-title {
      margin: 0 0 9px;
      color: var(--green-900);
      font-size: .82rem;
      font-weight: 850;
    }

    .judge-buttons {
      display: flex;
      gap: 9px;
      flex-wrap: wrap;
    }

    .judge-button {
      padding: 9px 13px;
      border-radius: 999px;
      font-size: .82rem;
      font-weight: 850;
    }

    .judge-button.correct {
      color: var(--green-900);
      background: var(--green-200);
    }

    .judge-button.wrong {
      color: #7d302c;
      background: #ffd9d6;
    }

    .judge-result {
      margin-top: 9px;
      color: var(--muted);
      font-size: .78rem;
      font-weight: 800;
    }
  `;
  document.head.appendChild(style);

  function subtitleFor(index) {
    if (state.judgments[index] === "correct") return "✓ 回答正确";
    if (state.judgments[index] === "wrong") return "✕ 回答错误，可以修改后重新保存";
    if (state.answers[index]) return "回答已保存，等待判定";
    return "点击展开问题并填写回答";
  }

  function applyCardState(card, index) {
    const judgment = state.judgments[index];
    const subtitle = card.querySelector(".question-subtitle");
    const judgeArea = card.querySelector(".judge-area");
    const result = card.querySelector(".judge-result");

    card.classList.toggle("is-complete", judgment === "correct");
    card.classList.toggle("is-wrong", judgment === "wrong");
    if (subtitle) subtitle.textContent = subtitleFor(index);
    if (judgeArea) judgeArea.classList.toggle("is-visible", Boolean(state.answers[index]));

    if (!result) return;
    if (judgment === "correct") {
      result.textContent = "已判定：回答正确，计入通关进度。";
    } else if (judgment === "wrong") {
      result.textContent = "已判定：回答错误，不计入通关进度。";
    } else if (state.answers[index]) {
      result.textContent = "回答已保存，请由出题人选择判定结果。";
    } else {
      result.textContent = "";
    }
  }

  function enhanceCard(card, index) {
    card.dataset.questionIndex = String(index);
    const body = card.querySelector(".question-body");
    if (!body) return;

    body.querySelector(".complete-button")?.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "answer-review-wrap";
    wrapper.innerHTML = `
      <label class="answer-label" for="answer-${index}">你的回答</label>
      <textarea class="answer-box" id="answer-${index}" placeholder="在这里输入回答……"></textarea>
      <div class="answer-actions">
        <button class="save-answer" type="button">保存回答</button>
        <span class="save-status"></span>
      </div>
      <div class="judge-area">
        <p class="judge-title">出题人判定</p>
        <div class="judge-buttons">
          <button class="judge-button correct" type="button">✓ 回答正确</button>
          <button class="judge-button wrong" type="button">✕ 回答错误</button>
        </div>
        <div class="judge-result"></div>
      </div>
    `;
    body.appendChild(wrapper);

    const textarea = wrapper.querySelector(".answer-box");
    const saveStatus = wrapper.querySelector(".save-status");
    textarea.value = state.answers[index];

    textarea.addEventListener("input", () => {
      saveStatus.textContent = textarea.value !== state.answers[index]
        ? "有尚未保存的修改"
        : (state.answers[index] ? "回答已保存" : "");
    });

    wrapper.querySelector(".save-answer").addEventListener("click", () => {
      const answer = textarea.value.trim();
      if (!answer) {
        saveStatus.textContent = "请先填写回答";
        textarea.focus();
        return;
      }

      state.answers[index] = answer;
      state.judgments[index] = null;
      persist();
      saveStatus.textContent = "✓ 已保存";
      applyCardState(card, index);
      updateProgress();
    });

    wrapper.querySelector(".judge-button.correct").addEventListener("click", () => {
      if (!state.answers[index]) return;
      state.judgments[index] = "correct";
      persist();
      applyCardState(card, index);
      updateProgress();
    });

    wrapper.querySelector(".judge-button.wrong").addEventListener("click", () => {
      if (!state.answers[index]) return;
      state.judgments[index] = "wrong";
      persist();
      applyCardState(card, index);
      updateProgress();
    });

    applyCardState(card, index);
  }

  function updateMilestoneCopy() {
    const section = document.querySelector(".milestone-section");
    if (!section) return;

    const heading = section.querySelector(".milestone-heading p");
    if (heading) heading.textContent = "只有被判定为“回答正确”的问题才计入通关进度。";

    const milestones = [
      {
        title: "特别通关",
        text: "当你成功回答 3 个问题，并且因为这个游戏感到一些快乐的时候，恭喜你，你成为了这世界上唯一一个通关的人哟。"
      },
      {
        title: "奖励解锁",
        text: "当你成功回答 7 个问题，你就能解锁一个奖励：Demo7 背后的小故事。"
      },
      {
        title: "完美通关",
        text: "当你成功回答 12 个问题，你就能完美通关，并得到一个关于彩蛋的提示。"
      }
    ];

    [...section.querySelectorAll(".milestone-card")].forEach((card, index) => {
      const copy = milestones[index];
      if (!copy) return;
      const title = card.querySelector("h3");
      const text = card.querySelector("p");
      if (title) title.textContent = copy.title;
      if (text) text.textContent = copy.text;
    });
  }

  function updateProgress() {
    const correctCount = state.judgments.filter((value) => value === "correct").length;
    const answeredCount = state.answers.filter(Boolean).length;
    const questionCounter = document.getElementById("questionCounter");

    if (questionCounter) {
      questionCounter.textContent = `回答正确 ${correctCount} / ${cards.length} · 已保存 ${answeredCount}`;
    }

    document.querySelectorAll(".milestone-card").forEach((card) => {
      const threshold = Number(card.dataset.threshold);
      const unlocked = correctCount >= threshold;
      const remaining = Math.max(0, threshold - correctCount);
      card.classList.toggle("is-unlocked", unlocked);
      const milestoneState = card.querySelector(".milestone-state");
      if (milestoneState) {
        milestoneState.textContent = unlocked ? "✓ 已解锁" : `还差 ${remaining} 个正确回答`;
      }
    });
  }

  function updateRules() {
    const description = document.querySelector(".rules-hero p");
    if (description) {
      description.textContent = "自由选择问题，填写回答，必要时使用提示，然后等待出题人判定。";
    }

    const list = document.querySelector(".rules-list");
    if (list) {
      list.innerHTML = `
        <li><span class="rule-number">1</span><span>左侧共有 <strong>12 个问题</strong>，点击问题即可展开。</span></li>
        <li><span class="rule-number">2</span><span>在回答框中填写内容并点击 <strong>“保存回答”</strong>，刷新网页后仍会保留。</span></li>
        <li><span class="rule-number">3</span><span>保存后由出题人选择 <strong>“回答正确”</strong>或 <strong>“回答错误”</strong>。</span></li>
        <li><span class="rule-number">4</span><span>只有回答正确的问题才计入 3、7、12 题通关进度。</span></li>
        <li><span class="rule-number">5</span><span>右侧共有 <strong>5 张 Hint 卡</strong>；大提示打开前会再次确认。</span></li>
      `;
    }

    const panelDescription = document.querySelector(".questions-panel .panel-title-wrap p");
    if (panelDescription) {
      panelDescription.textContent = "填写并保存回答，再由出题人判定是否正确。";
    }

    const footer = document.querySelector(".footer-note");
    if (footer) footer.textContent = "HOUHOU GAME · 回答与判定保存在当前浏览器中。";
  }

  cards.forEach(enhanceCard);
  updateRules();
  updateMilestoneCopy();

  const previousUpdateCounters = typeof window.updateCounters === "function"
    ? window.updateCounters
    : null;

  window.updateCounters = function () {
    if (previousUpdateCounters) previousUpdateCounters();
    updateProgress();
  };

  const resetButton = document.getElementById("resetButton");
  if (resetButton) {
    resetButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const confirmed = window.confirm("确定重新开始吗？所有回答、判定和已打开的提示都会被清除。");
      if (!confirmed) return;
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }, true);
  }

  updateProgress();
})();
