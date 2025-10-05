const achievements = [
  { id: "cleaner", title: "断捨離マスター", emoji: "🧹", description: "サブスクが3つ以内", unlocked: false },
  { id: "zero", title: "月額ゼロチャレンジ", emoji: "💸", description: "月額支出が0円", unlocked: false },
  { id: "sniper", title: "節約スナイパー", emoji: "📉", description: "前月比で支出10%以上削減", unlocked: false },
  { id: "ranking", title: "節約ランキング", emoji: "🏆", description: "月額支出が1000円以下", unlocked: false },
  { id: "firstSub", title: "初めての契約", emoji: "📝", description: "最初のサブスクを追加する", unlocked: false },
  { id: "collector", title: "サブスクコレクター", emoji: "📦", description: "サブスクを5件以上登録する", unlocked: false },
  { id: "longTerm", title: "長期契約者", emoji: "📅", description: "継続契約のサブスクを3件以上持つ", unlocked: false },
  { id: "earlyBird", title: "早期警戒", emoji: "⏰", description: "支払い3日前の通知を受け取る", unlocked: false },
  { id: "cleanSlate", title: "クリーンスレート", emoji: "🧼", description: "すべてのサブスクを削除する", unlocked: false }
];

// 🔔 効果音
function playUnlockSound() {
  const audio = new Audio("sounds/chariin.mp3");
  audio.play();
}

// 📊 進捗バー更新
function updateProgressBar() {
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  const percent = Math.round((unlockedCount / total) * 100);
  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = `${percent}%`;
}

// 🧠 実績判定＆保存
function evaluateAchievements() {
  const subs = JSON.parse(localStorage.getItem("subscriptions") || "[]");
  const monthlyTotal = subs.reduce((sum, sub) => {
    if (sub.frequency === "monthly") return sum + Number(sub.amount);
    if (sub.frequency === "daily") return sum + Number(sub.amount) * 30;
    if (sub.frequency === "yearly") return sum + Number(sub.amount) / 12;
    return sum;
  }, 0);

  const history = JSON.parse(localStorage.getItem("history") || "[]");
  const previousMonthly = history.reduce((sum, sub) => {
    if (sub.frequency === "monthly") return sum + Number(sub.amount);
    if (sub.frequency === "daily") return sum + Number(sub.amount) * 30;
    if (sub.frequency === "yearly") return sum + Number(sub.amount) / 12;
    return sum;
  }, 0);

  const recurringCount = subs.filter(sub => sub.isRecurring).length;
  const earlyBirdFlag = localStorage.getItem("earlyBirdUnlocked") === "true";

  achievements.forEach(a => {
    const wasUnlocked = a.unlocked;

    switch (a.id) {
      case "cleaner":
        a.unlocked = subs.length <= 3;
        break;
      case "zero":
        a.unlocked = monthlyTotal === 0;
        break;
      case "ranking":
        a.unlocked = monthlyTotal <= 1000;
        break;
      case "sniper":
        a.unlocked = previousMonthly > 0 && monthlyTotal < previousMonthly * 0.9;
        break;
      case "firstSub":
        a.unlocked = subs.length >= 1;
        break;
      case "collector":
        a.unlocked = subs.length >= 5;
        break;
      case "longTerm":
        a.unlocked = recurringCount >= 3;
        break;
      case "cleanSlate":
        a.unlocked = subs.length === 0;
        break;
      case "earlyBird":
        a.unlocked = earlyBirdFlag;
        break;
    }

    a.newlyUnlocked = !wasUnlocked && a.unlocked;
    if (a.newlyUnlocked) {
      console.log(`${a.title} を解除！`);
      playUnlockSound();
    }
  });

  const saveData = achievements.map(a => ({ id: a.id, unlocked: a.unlocked }));
  localStorage.setItem("achievements", JSON.stringify(saveData));
}

// 📥 保存データ読み込み
function loadAchievements() {
  const saved = localStorage.getItem("achievements");
  if (saved) {
    const parsed = JSON.parse(saved);
    achievements.forEach(a => {
      const match = parsed.find(p => p.id === a.id);
      if (match) a.unlocked = match.unlocked;
    });
  }
}

// 🎨 実績表示（クリックで詳細展開）
function renderAchievements() {
  const container = document.getElementById("achievements");
  if (!container) return;

  container.innerHTML = "";
  achievements.forEach(a => {
    const div = document.createElement("div");
    div.className = "achievement-item " + (a.unlocked ? "unlocked" : "locked");
    if (a.newlyUnlocked) div.classList.add("newly-unlocked");

    div.innerHTML = `
      <div class="achievement-header">
        <div class="achievement-emoji">${a.emoji}</div>
        <div class="achievement-title">${a.title}</div>
      </div>
      <div class="achievement-details">
        <div class="achievement-description">${a.description}</div>
      </div>
    `;

    div.addEventListener("click", () => {
      div.classList.toggle("open");
    });

    container.appendChild(div);
  });

  updateProgressBar();
}

// 🔄 実績リセット
function confirmResetAchievements() {
  const confirmed = window.confirm("本当にすべての実績をリセットしますか？\nこの操作は元に戻せません。");
  if (confirmed) {
    const resetData = achievements.map(a => ({ id: a.id, unlocked: false }));
    localStorage.setItem("achievements", JSON.stringify(resetData));
    localStorage.removeItem("earlyBirdUnlocked");
    alert("実績をリセットしました！");
    loadAchievements();
    renderAchievements();
    updateProgressBar();
  }
}

// 🚀 ページロード時
document.addEventListener("DOMContentLoaded", () => {
  loadAchievements();         // ① 読み込み
  evaluateAchievements();     // ② 判定＆保存
  renderAchievements();       // ③ 表示

  const resetBtn = document.getElementById("reset-button");
  if (resetBtn) {
    resetBtn.addEventListener("click", confirmResetAchievements);
  }
});
