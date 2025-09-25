// ---- Google API 初期化 ----
const GOOGLE_API_KEY = "AIzaSyAvD-I_CTB27OmRz6xxljY3aeKANQopNjc";
const GOOGLE_CLIENT_ID = "665619032047-4q1bnabklt90fqft9uealaobvnk91rqd.apps.googleusercontent.com";

function initGoogleAPI() {
  gapi.load("client:auth2", () => {
    gapi.client.init({
      apiKey: GOOGLE_API_KEY,
      clientId: GOOGLE_CLIENT_ID,
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
      scope: "https://www.googleapis.com/auth/calendar.events",
      cookiePolicy: "single_host_origin"
    }).then(() => {
      console.log("Google API 初期化完了");
    }).catch((err) => {
      console.error("Google API 初期化失敗:", err);
    });
  });
}

function createCalendarEvent(sub) {
  const event = {
    summary: sub.name,
    description: `Subkeep契約: ¥${sub.amount} / ${sub.frequency}`,
    start: { date: sub.nextPaymentDate },
    end: { date: sub.nextPaymentDate }
  };

  gapi.auth2.getAuthInstance().signIn().then(() => {
    gapi.client.calendar.events.insert({
      calendarId: "primary",
      resource: event
    }).then((res) => {
      console.log("Googleカレンダーに登録完了:", res);
    }).catch((err) => {
      console.error("イベント登録失敗:", err);
    });
  }).catch((err) => {
    console.error("Google認証失敗:", err);
  });
}

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
      sendNotification(`${sub.name} の支払い（契約終了日）は3日後です`);
    } else if (diffDays === 1) {
      sendNotification(`${sub.name} の支払い（契約終了日）は明日です`);
    } else if (diffDays === 0) {
      sendNotification(`${sub.name} の支払い日（契約終了日）です`);
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
        monthlyCost = recurring ? Number(sub.amount) * 30 : Number(sub.amount);
        yearlyCost = monthlyCost * 12;
        break;
      case "monthly":
        monthlyCost = Number(sub.amount);
        yearlyCost = recurring ? monthlyCost * 12 : monthlyCost;
        break;
      case "yearly":
        yearlyCost = Number(sub.amount);
        monthlyCost = recurring ? yearlyCost / 12 : yearlyCost;
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

  noSubs.style.display = subs.length === 0 ? "block" : "none";
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

    const newSub = { name, amount, frequency, startDate, nextPaymentDate, isRecurring };
    const subs = getSubscriptions();
    subs.push(newSub);
    saveSubscriptions(subs);

    sendNotification(`${name} を追加しました`);
    createCalendarEvent(newSub);

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
  initGoogleAPI();
  renderSubscriptions();
  renderHistory();
  handleAddPage();
  checkUpcomingPayments();
});
