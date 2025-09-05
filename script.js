// script.js

// ---- 共通ユーティリティ ----
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

// ---- 支払日までの残り日数を計算 ----
function getDaysUntil(dateStr) {
  const today = new Date();
  const target = new Date(dateStr);
  const diff = Math.floor((target - today) / (1000 * 60 * 60 * 24));
  return diff;
}

// ---- 通知機能 ----
function sendNotification(message) {
  if (!("Notification" in window)) {
    console.warn("このブラウザは通知に対応していません");
    return;
  }

  if (Notification.permission === "granted") {
    new Notification("Subkeep", { body: message });
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Subkeep", { body: message });
      } else {
        console.warn("通知が拒否されました");
      }
    });
  } else {
    console.warn("通知は拒否されています。ブラウザ設定から許可してください");
  }
}

// ---- index.html 用 ----
function renderSubscriptions() {
  const subs = getSubscriptions();
  const ul = document.getElementById("subscriptions-ul");
  const noSubs = document.getElementById("no-subscriptions");
  const monthlyTotalEl = document.getElementById("monthly-total");
  const yearlyTotalEl = document.getElementById("yearly-total");

  if (!ul) return; // add.html や history.html ではスキップ

  ul.innerHTML = "";
  let monthlyTotal = 0;

  subs.forEach((sub, index) => {
    // 月額換算
    const monthlyCost =
      sub.frequency === "yearly"
        ? Number(sub.amount) / 12
        : Number(sub.amount);

    monthlyTotal += monthlyCost;

    // 🔔 支払日が近い場合に通知（7日前・3日前・1日前）
    const daysUntilPayment = getDaysUntil(sub.nextPaymentDate);
    if ([7, 3, 1].includes(daysUntilPayment)) {
      sendNotification(`${sub.name} の支払いはあと ${daysUntilPayment} 日です`);
    }

    const li = document.createElement("li");
    li.className = "subscription-item";

    const infoDiv = document.createElement("div");
    infoDiv.className = "subscription-info";
    infoDiv.innerHTML = `
      <strong>${sub.name}</strong>
      <p>${sub.frequency === "monthly" ? "月額" : "年額"}: ¥${sub.amount}</p>
      <p>契約日: ${sub.startDate}</p>
      <p>次回支払日: ${sub.nextPaymentDate}</p>
    `;

    const delBtn = document.createElement("button");
    delBtn.className = "delete-button";
    delBtn.textContent = "削除";
    delBtn.onclick = () => {
      const removed = subs.splice(index, 1)[0];
      saveSubscriptions(subs);

      // 履歴に追加
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

  if (subs.length === 0) {
    noSubs.style.display = "block";
  } else {
    noSubs.style.display = "none";
  }

  monthlyTotalEl.textContent = `¥${monthlyTotal.toFixed(0)}`;
  yearlyTotalEl.textContent = `¥${(monthlyTotal * 12).toFixed(0)}`;
}

// ---- add.html 用 ----
function handleAddPage() {
  const form = document.getElementById("subscription-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const amount = document.getElementById("amount").value.trim();
    const frequency = document.getElementById("frequency").value;
    const startDate = document.getElementById("start-date").value;
    const nextPaymentDate = document.getElementById("next-payment-date").value;

    if (!name || !amount) {
      alert("必要な情報を入力してください");
      return;
    }

    const subs = getSubscriptions();
    subs.push({ name, amount, frequency, startDate, nextPaymentDate });
    saveSubscriptions(subs);

    sendNotification(`${name} を追加しました`);

    // ホームに戻る
    window.location.href = "index.html";
  });
}

// ---- history.html 用 ----
function renderHistory() {
  const hist = getHistory();
  const ul = document.getElementById("history-ul");
  if (!ul) return;

  ul.innerHTML = "";
  hist.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.name} (${item.frequency === "monthly" ? "月額" : "年額"} ¥${item.amount}) 削除日: ${item.deletedAt}`;
    ul.appendChild(li);
  });
}

// ---- ページロード時 ----
document.addEventListener("DOMContentLoaded", () => {
  // 通知の許可をリクエスト（初回のみ）
  if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      console.log("通知権限:", permission);
    });
  }

  renderSubscriptions();
  renderHistory();
  handleAddPage();
});