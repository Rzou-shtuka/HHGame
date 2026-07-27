(() => {
  if (window.__houhouDemo7RewardLoaded) return;
  window.__houhouDemo7RewardLoaded = true;

  const STORAGE_KEY = "houhou-answer-review-v1";
  const DEMO7_URL = "https://youtu.be/v6cQEdIFWVw";
  const rewardCard = document.querySelector('.milestone-card[data-threshold="3"]');
  if (!rewardCard) return;

  const style = document.createElement("style");
  style.textContent = `
    .demo7-reward {
      position: relative;
      z-index: 2;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid rgba(23, 76, 53, .13);
    }

    .demo7-locked {
      display: block;
      color: var(--muted);
      font-size: .8rem;
      font-weight: 800;
    }

    .demo7-reward-link {
      display: none;
      width: fit-content;
      padding: 11px 16px;
      border-radius: 999px;
      color: #fff;
      font-size: .86rem;
      font-weight: 900;
      text-decoration: none;
      background: linear-gradient(135deg, var(--green-700), var(--green-500));
      box-shadow: 0 9px 20px rgba(35, 100, 71, .22);
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .demo7-reward-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 13px 25px rgba(35, 100, 71, .28);
    }

    .demo7-reward.is-unlocked .demo7-locked { display: none; }
    .demo7-reward.is-unlocked .demo7-reward-link { display: inline-flex; }
  `;
  document.head.appendChild(style);

  const reward = document.createElement("div");
  reward.className = "demo7-reward";
  reward.innerHTML = `
    <span class="demo7-locked">🔒 判定正确 3 个问题后解锁 Demo7</span>
    <a class="demo7-reward-link" href="${DEMO7_URL}" target="_blank" rel="noopener noreferrer">
      🎁 领取奖励：进入 Demo7
    </a>
  `;
  rewardCard.appendChild(reward);

  function getCorrectCount() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.judgments)) return 0;
      return saved.judgments.filter((value) => value === "correct").length;
    } catch {
      return 0;
    }
  }

  function updateReward() {
    reward.classList.toggle("is-unlocked", getCorrectCount() >= 3);
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest(".judge-button") || event.target.closest(".save-answer")) {
      setTimeout(updateReward, 0);
    }
  });

  window.addEventListener("storage", updateReward);
  updateReward();
})();
