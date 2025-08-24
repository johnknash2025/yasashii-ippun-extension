// ポップアップ：気分→ガイド開始、簡易統計

let preset = "calm";

document.querySelectorAll(".moods button").forEach((btn) => {
  btn.addEventListener("click", () => {
    preset = btn.dataset.preset || "calm";
    document.querySelectorAll(".moods button").forEach((b) => (b.style.outline = ""));
    btn.style.outline = "2px solid #2563eb";
  });
});

document.getElementById("start").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "START_GUIDE", preset });
  }
});

function renderStats() {
  chrome.storage.local.get(["logs"], ({ logs }) => {
    const arr = Array.isArray(logs) ? logs : [];
    const minutes = Math.round(arr.filter((l) => l.kind === "guide").length * 1); // 1セッション=約1分
    document.getElementById("calm").textContent = String(minutes);
    document.getElementById("count").textContent = String(arr.length);
  });
}

renderStats();

// --- Auth & API ---
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["settings", "auth"], ({ settings, auth }) => {
      resolve({ settings: settings || {}, auth: auth || {} });
    });
  });
}

async function updateAuthUI() {
  const { auth } = await getSettings();
  const el = document.getElementById("auth-status");
  if (auth?.accessToken) {
    el.textContent = `ログイン中`;
  } else {
    el.textContent = `未ログイン`;
  }
}

async function login() {
  const { settings } = await getSettings();
  const loginUrl = settings.loginUrl;
  if (!loginUrl) {
    alert("まずオプションでログインURLを設定してください。");
    return;
  }
  try {
    const redirect = chrome.identity.getRedirectURL();
    const url = new URL(loginUrl);
    url.searchParams.set("redirect_uri", redirect);
    const responseUrl = await chrome.identity.launchWebAuthFlow({ url: url.toString(), interactive: true });
    // Expect token in: <redirect_uri>#access_token=...
    const hash = new URL(responseUrl).hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    if (accessToken) {
      await chrome.storage.local.set({ auth: { accessToken } });
      updateAuthUI();
    } else {
      alert("ログインに失敗しました。トークンが見つかりません。");
    }
  } catch (e) {
    console.error(e);
    alert("ログインに失敗しました");
  }
}

async function callGentle() {
  const { settings, auth } = await getSettings();
  if (!settings.apiBase) {
    alert("まずオプションでAPIベースURLを設定してください。");
    return;
  }
  if (!auth?.accessToken) {
    alert("まずログインしてください。");
    return;
  }
  try {
    const res = await fetch(`${settings.apiBase}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({ tone: "gentle" }),
    });
    if (res.status === 402) {
      if (confirm("有料機能です。課金ページを開きますか？")) {
        openBilling();
      }
      return;
    }
    const data = await res.json();
    if (data?.text) {
      alert(data.text);
    } else {
      alert("取得に失敗しました");
    }
  } catch (e) {
    console.error(e);
    alert("通信エラーが発生しました");
  }
}

async function openBilling() {
  const { settings, auth } = await getSettings();
  if (!settings.apiBase || !auth?.accessToken) return;
  const res = await fetch(`${settings.apiBase}/api/billing/portal`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });
  const data = await res.json();
  if (data?.url) chrome.tabs.create({ url: data.url });
}

document.getElementById("login").addEventListener("click", login);
document.getElementById("gentle").addEventListener("click", callGentle);
document.getElementById("billing").addEventListener("click", openBilling);
updateAuthUI();
