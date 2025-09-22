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

// ---- 通知機能 ----
function sendNotification(message) {
  if (Notification.permission === "granted") {
    new Notification("Subkeep", { body: message });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Subkeep", { body: message });
      }
    });
  }
}

function checkUpcomingPayments() {
  const subs = getSubscriptions();
  const today = new Date();

  subs.forEach((sub) => {
    const nextDate = new Date(sub.nextPaymentDate);
    const diffDays = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 3) {
      sendNotification(`${sub.name} の支払いは3日後です`);
    } else if (diffDays === 1) {
      sendNotification(`${sub.name} の支払いは明日です`);
    } else if (diffDays === 0) {
      sendNotification(`${sub.name} の支払い日です`);
    }
  });
}

// ---- index.html 用 ----
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
      case "daily":
        if (recurring) {
          monthlyCost = Number(sub.amount) * 30;
          yearlyCost = monthlyCost * 12;
        } else {
          monthlyCost = Number(sub.amount); // 1日分だけ
          yearlyCost = monthlyCost;
        }
        break;
      case "monthly":
        if (recurring) {
          monthlyCost = Number(sub.amount);
          yearlyCost = monthlyCost * 12;
        } else {
          monthlyCost = Number(sub.amount); // 1ヶ月分だけ
          yearlyCost = monthlyCost;
        }
        break;
      case "yearly":
        if (recurring) {
          yearlyCost = Number(sub.amount);
          monthlyCost = yearlyCost / 12;
        } else {
          yearlyCost = Number(sub.amount); // 1年分だけ
          monthlyCost = yearlyCost;
        }
        break;
    }

    monthlyTotal += monthlyCost;
    yearlyTotal += yearlyCost;

    const li = document.createElement("li");
    li.className = "subscription-item";

    const infoDiv = document.createElement("div");
    infoDiv.className = "subscription-info";
    infoDiv.innerHTML = `
      <strong>${sub.name}</strong>
      <p>${sub.frequency === "monthly" ? "月額" : sub.frequency === "yearly" ? "年額" : "日額"}: ¥${Number(sub.amount).toLocaleString()}</p>
      <p>契約日: ${sub.startDate}</p>
      <p>次回支払日: ${sub.nextPaymentDate}</p>
      <p>継続契約: ${sub.isRecurring ? "はい" : "いいえ"}</p>
    `;

    const delBtn = document.createElement("button");
    delBtn.className = "delete-button";
    delBtn.textContent = "削除";
    delBtn.onclick = () => {
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

  if (subs.length === 0) {
    noSubs.style.display = "block";
  } else {
    noSubs.style.display = "none";
  }

  monthlyTotalEl.textContent = `¥${monthlyTotal.toFixed(0)}`;
  yearlyTotalEl.textContent = `¥${yearlyTotal.toFixed(0)}`;
}

// ---- add.html 用 ----
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

    if (!name || isNaN(amount)) {
      alert("必要な情報を入力してください");
      return;
    }

    const subs = getSubscriptions();
    subs.push({ name, amount, frequency, startDate, nextPaymentDate, isRecurring });
    saveSubscriptions(subs);

    sendNotification(`${name} を追加しました`);

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
    li.textContent = `${item.name} (${item.frequency === "monthly" ? "月額" : item.frequency === "yearly" ? "年額" : "日額"} ¥${item.amount}) 削除日: ${item.deletedAt}`;
    ul.appendChild(li);
  });
}

// ---- ページロード時 ----
document.addEventListener("DOMContentLoaded", () => {
  renderSubscriptions();
  renderHistory();
  handleAddPage();
  checkUpcomingPayments();
});
