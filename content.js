// コンテンツスクリプト：スクロール検知、オーバーレイ、言い換えモーダル

let scrollPx = 0;
let lastY = window.scrollY;
let lastBreakAt = 0;

const DEFAULTS = {
  THRESHOLD_PX: 5000, // この距離以上スクロールしたら提案
  COOLDOWN_MS: 90 * 60 * 1000, // 90分に1回まで
};

// 設定の読み込み
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["settings"], ({ settings }) => {
      resolve(settings || {});
    });
  });
}

function now() {
  return Date.now();
}

window.addEventListener("scroll", () => {
  const y = window.scrollY;
  scrollPx += Math.abs(y - lastY);
  lastY = y;
});

setInterval(async () => {
  const s = (await loadSettings()) || {};
  const threshold = s.thresholdPx || DEFAULTS.THRESHOLD_PX;
  const cooldown = (s.cooldownMinutes || DEFAULTS.COOLDOWN_MS / (60 * 1000)) * 60 * 1000;
  const n = now();
  if (scrollPx > threshold && n - lastBreakAt > cooldown) {
    showCalmOverlay();
    lastBreakAt = n;
    scrollPx = 0;
  }
}, 5000);

// メッセージ受信（ポップアップからの開始 / 右クリック言い換え）
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "START_GUIDE") {
    showCalmOverlay(msg?.preset);
  }
  if (msg?.type === "CALM_REWRITE") {
    openRewriteModal(msg.text || "");
  }
});

function showCalmOverlay(preset) {
  if (document.getElementById("yasashii-calm-overlay")) return; // 多重生成防止

  const overlay = document.createElement("div");
  overlay.id = "yasashii-calm-overlay";
  overlay.attachShadow({ mode: "open" });

  const root = document.createElement("div");
  const style = document.createElement("style");
  style.textContent = `
    #wrap { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgba(0,0,0,0.28); }
    .card { width: min(420px, 92vw); background: #fff; color: #222; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); padding: 20px; }
    .title { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
    .desc { font-size: 14px; line-height: 1.7; color: #444; }
    .breath { margin: 12px 0; font-size: 16px; text-align: center; }
    .ring { width: 140px; height: 140px; margin: 12px auto; border-radius: 999px; border: 2px solid #cbd5e1; display: grid; place-items: center; }
    .progress { height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden; margin: 12px 0; }
    .bar { height: 100%; width: 0%; background: #60a5fa; transition: width 1s linear; }
    .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    button { appearance: none; border: 0; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
    .primary { background: #2563eb; color: #fff; }
    .ghost { background: #f3f4f6; color: #111827; }
    .muted { color: #6b7280; font-size: 12px; text-align: center; margin-top: 6px; }
  `;

  root.innerHTML = `
    <div id="wrap">
      <div class="card" role="dialog" aria-label="やさしい1分">
        <p class="title">60秒のやさしい休憩</p>
        <p class="desc">姿勢を楽に整えます。鼻から吸って4、止めて1、口から吐いて6。肩の力を抜いて、足の裏の感覚を感じます。</p>
        <div class="ring"><div id="phase">吸う 4</div></div>
        <div class="breath" id="breathText">吸う 4 / 止 1 / 吐く 6</div>
        <div class="progress"><div class="bar" id="bar"></div></div>
        <div class="row">
          <button class="ghost" id="closeBtn">閉じる</button>
          <button class="primary" id="okBtn">少し楽になった</button>
        </div>
        <div class="muted">浮かぶ考えは追いかけず、「考えている」と名づけて手放します。</div>
      </div>
    </div>
  `;

  overlay.shadowRoot.append(style, root);
  document.documentElement.appendChild(overlay);

  const bar = overlay.shadowRoot.getElementById("bar");
  const phase = overlay.shadowRoot.getElementById("phase");
  const closeBtn = overlay.shadowRoot.getElementById("closeBtn");
  const okBtn = overlay.shadowRoot.getElementById("okBtn");

  let seconds = 0;
  const total = 60;
  const timer = setInterval(() => {
    seconds += 1;
    bar.style.width = `${(seconds / total) * 100}%`;
    const mod = seconds % 11; // 4+1+6=11秒サイクル
    if (mod < 4) phase.textContent = `吸う ${4 - mod}`;
    else if (mod < 5) phase.textContent = `止 ${5 - mod}`;
    else phase.textContent = `吐く ${11 - mod}`;
    if (seconds >= total) finish(true);
  }, 1000);

  function finish(relieved) {
    clearInterval(timer);
    logSession({ kind: "guide", method: "breath", relieved: !!relieved });
    remove();
  }
  function remove() {
    overlay.remove();
  }

  closeBtn.addEventListener("click", () => finish(false));
  okBtn.addEventListener("click", () => finish(true));
}

function logSession(entry) {
  try {
    chrome.storage.local.get(["logs"], ({ logs }) => {
      const arr = Array.isArray(logs) ? logs : [];
      arr.push({ ...entry, ts: Date.now() });
      chrome.storage.local.set({ logs: arr });
    });
  } catch (_) {}
}

// 穏やか言い換え（ローカル簡易版）
function calmRewriteLocal(t) {
  if (!t) return "";
  let out = t.trim();
  out = out.replace(/!+/g, "。");
  out = out.replace(/(はっきり言って|正直|とにかく)/g, "");
  out = out.replace(/あなた/g, "私");
  out = out.replace(/だから/g, "ので");
  out = out.replace(/(怒|ムカ|腹が立)/g, "");
  out = `私が感じているのは、${out}。事実と要望を分けてお伝えします。`;
  return out;
}

function openRewriteModal(originalText) {
  const id = "yasashii-rewrite-modal";
  if (document.getElementById(id)) return;
  const host = document.createElement("div");
  host.id = id;
  host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    #wrap { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgba(0,0,0,0.28); }
    .card { width: min(560px, 92vw); background: #fff; color: #222; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); padding: 16px; }
    textarea { width: 100%; min-height: 90px; padding: 8px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    button { appearance: none; border: 0; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
    .primary { background: #2563eb; color: #fff; }
    .ghost { background: #f3f4f6; color: #111827; }
    .label { font-size: 12px; color: #6b7280; margin-top: 6px; }
  `;

  const wrap = document.createElement("div");
  wrap.id = "wrap";
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">やわらか返信アシスト</div>
    <div class="label">元の文</div>
    <textarea id="orig"></textarea>
    <div class="label">穏やかな文面（提案）</div>
    <textarea id="out"></textarea>
    <div class="row">
      <button class="ghost" id="close">閉じる</button>
      <button class="primary" id="copy">コピー</button>
    </div>
  `;
  wrap.appendChild(card);
  host.shadowRoot.append(style, wrap);
  document.documentElement.appendChild(host);

  const orig = host.shadowRoot.getElementById("orig");
  const out = host.shadowRoot.getElementById("out");
  orig.value = originalText || "";
  out.value = calmRewriteLocal(originalText || "");

  host.shadowRoot.getElementById("close").addEventListener("click", () => host.remove());
  host.shadowRoot.getElementById("copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(out.value); } catch (_) {}
  });
}

