// 背景スクリプト：コンテキストメニューとメッセージ中継

chrome.runtime.onInstalled.addListener(() => {
  // 右クリック：選択したテキストを穏やかに言い換え
  chrome.contextMenus.create({
    id: "calm-rewrite",
    title: "穏やかな文面に言い換え",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "calm-rewrite" || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, {
    type: "CALM_REWRITE",
    text: info.selectionText || "",
  });
});

// 将来の通知/アラーム用（未使用）
chrome.alarms.onAlarm.addListener((alarm) => {
  // 例: 定期チェックインなど
});

