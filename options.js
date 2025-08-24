// 設定の保存/読込

const elSites = document.getElementById("sites");
const elCooldown = document.getElementById("cooldown");
const elThreshold = document.getElementById("threshold");
const elBell = document.getElementById("bell");
const elSaved = document.getElementById("saved");

function load() {
  chrome.storage.local.get(["settings"], ({ settings }) => {
    const s = settings || {};
    elSites.value = (s.sites || []).join(", ");
    elCooldown.value = s.cooldownMinutes ?? 90;
    elThreshold.value = s.thresholdPx ?? 5000;
    elBell.checked = !!s.bell;
  });
}

function save() {
  const sites = (elSites.value || "")
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const settings = {
    sites,
    cooldownMinutes: Math.max(5, Number(elCooldown.value || 90)),
    thresholdPx: Math.max(1000, Number(elThreshold.value || 5000)),
    bell: !!elBell.checked,
  };
  chrome.storage.local.set({ settings }, () => {
    elSaved.textContent = "保存しました";
    setTimeout(() => (elSaved.textContent = ""), 1200);
  });
}

document.getElementById("save").addEventListener("click", save);
load();

