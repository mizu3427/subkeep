// ---- 定数定義 ----
const FREQUENCIES = {
  DAILY: "daily",
  MONTHLY: "monthly",
  YEARLY: "yearly"
};

// ---- OS判定 ----
function detectMobileOS() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  if (ua.includes("android")) return "android";
  return "other";
}

// ---- 日付処理 ----
function normalizeDate(dateStr) {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
}

// ---- 初期化 ----
document.addEventListener("DOMContentLoaded", () => {
  const os = detectMobileOS();
  document.body.classList.add(`os-${os}`);
  checkUpcomingPayments();

  if (document.getElementById("subscription-form")) handleAddPage();
  if (document.getElementById("subscriptions-ul")) renderSubscriptions();
  if (document.getElementById("history-ul")) renderHistory();

  // Android通知許可
  if (os === "android") {
    Notification.requestPermission().then((perm) => {
      console.log("Android通知許可:", perm);
    });
  }

  // Service Worker登録確認
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      console.log("Service Worker registered:", reg);
    }).catch((err) => {
      if (os === "android") {
        console.error("AndroidでService Worker登録失敗:", err);
      }
    });
  }
});

// ---- ユーティリティ ----
function getSubscriptions() {
  return JSON.parse(localStorage.getItem("subscriptions") || "[]");
}
function saveSubscriptions(subs) {
  localStorage.setItem("subscriptions", JSON.stringify(subs));
}
function getHistory() {
  return JSON.parse(localStorage.getItem("history") || "[]");
}
function saveHistory(hist) {
  localStorage.setItem("history", JSON.stringify(hist));
}
function sendNotification(message) {
  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = ua.includes("android");

  console.log("通知送信内容:", message);
  console.log("通知許可状態:", Notification.permission);

  if (Notification.permission === "granted") {
    new Notification("Subkeep", { body: message });
    if (isAndroid) navigator.vibrate?.(200);
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Subkeep", { body: message });
        if (isAndroid) navigator.vibrate?.(200);
      }
    });
  }
}

// ---- リマインダー ----
function checkUpcomingPayments() {
  const subs = getSubscriptions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  subs.forEach((sub) => {
    const nextDate = normalizeDate(sub.nextPaymentDate);
    const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 3) sendNotification(`${sub.name} の支払いは3日後です`);
    else if (diffDays === 1) sendNotification(`${sub.name} の支払いは明日です`);
    else if (diffDays === 0) sendNotification(`${sub.name} の支払い日です`);
  });
}

// ---- 追加処理 ----
function handleAddPage() {
  const form = document.getElementById("subscription-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);
    const frequency = document.getElementById("frequency").value;
    const startDate = document.getElementById("start-date").value;
    const nextPaymentDate = document.getElementById("next-payment-date").value;
    const isRecurring = document.getElementById("is-recurring").checked;

    console.log("入力された名前:", name);
    console.log("入力された金額:", amount);

    if (!name || isNaN(amount) || amount <= 0) {
      alert("有効な名前と金額を入力してください");
      return;
    }

    const newSub = { name, amount, frequency, startDate, nextPaymentDate, isRecurring };
    const subs = getSubscriptions();
    subs.push(newSub);
    saveSubscriptions(subs);

    const hist = getHistory();
    hist.push({ ...newSub, addedAt: new Date().toLocaleString() });
    saveHistory(hist);

    sendNotification(`${name} を追加しました`);

    setTimeout(() => {
      window.location.href = location.origin + "/index.html";
    }, 100);
  });
}

// ---- 表示処理 ----
function renderSubscriptions() {
  const subs = getSubscriptions();
  const ul = document.getElementById("subscriptions-ul");
  const noSubs = document.getElementById("no-subscriptions");
  const monthlyTotalEl = document.getElementById("monthly-total");
  const yearlyTotalEl = document.getElementById("yearly-total");

  if (!ul) return;

  ul.innerHTML = "";
  let monthlyTotal = 0;
  let yearlyTotal = 0;

  subs.forEach((sub, index) => {
    let monthlyCost = 0;
    let yearlyCost = 0;

    const recurring = sub.isRecurring;

    switch (sub.frequency) {
      case FREQUENCIES.DAILY:
        monthlyCost = recurring ? sub.amount * 30 : sub.amount;
        yearlyCost = monthlyCost * 12;
        break;
      case FREQUENCIES.MONTHLY:
        monthlyCost = sub.amount;
        yearlyCost = recurring ? monthlyCost * 12 : monthlyCost;
        break;
      case FREQUENCIES.YEARLY:
        yearlyCost = sub.amount;
        monthlyCost = recurring ? yearlyCost / 12 : yearlyCost;
        break;
    }

    monthlyTotal += monthlyCost;
    yearlyTotal += yearlyCost;

    console.log("表示する契約:", sub.name, "金額:", sub.amount);

    const li = document.createElement("li");
    li.className = "subscription-item";

    const infoDiv = document.createElement("div");
    infoDiv.className = "subscription-info";
    infoDiv.innerHTML = `
      <strong>${sub.name}</strong>
      <p>${sub.frequency === FREQUENCIES.MONTHLY ? "月額" : sub.frequency === FREQUENCIES.YEARLY ? "年額" : "日額"}: ¥${sub.amount.toLocaleString()}</p>
      <p>契約日: ${sub.startDate}</p>
      <p>次回支払日: ${sub.nextPaymentDate}</p>
      <p>継続契約: ${sub.isRecurring ? "はい" : "いいえ"}</p>
    `;

    const delBtn = document.createElement("button");
    delBtn.className = "delete-button";
    delBtn.textContent = "削除";
    delBtn.type = "button";
    delBtn.onclick = () => {
      if (!confirm(`${sub.name} を本当に削除しますか？`)) return;

      const removed = subs.splice(index, 1)[0];
      saveSubscriptions(subs);

      const hist = getHistory();
      hist.push({ ...removed, deletedAt: new Date().toLocaleString() });
      saveHistory(hist);

      sendNotification(`${removed.name} を削除しました`);
      renderSubscriptions();
    };

    li.appendChild(infoDiv);
    li.appendChild(delBtn);
    ul.appendChild(li);
  });

  noSubs.style.display = subs.length === 0 ? "block" : "none";
  monthlyTotalEl.textContent = `¥${monthlyTotal.toFixed(0)}`;
  yearlyTotalEl.textContent = `¥${yearlyTotal.toFixed(0)}`;
}

// ---- 履歴表示 ----
function renderHistory() {
  const hist = getHistory();
  const ul = document.getElementById("history-ul");
  if (!ul) return;

  ul.innerHTML = "";
  hist.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} (${item.frequency === FREQUENCIES.MONTHLY ? "月額" : item.frequency === FREQUENCIES.YEARLY ? "年額" : "日額"} ¥${item.amount
