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

