const pendingScrolls = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "OPEN_ENTRY") {
    const { url, scrollY } = message.payload || {};
    if (!url) {
      return;
    }

    chrome.tabs.create({ url }, (tab) => {
      if (!tab || !tab.id) return;
      pendingScrolls.set(tab.id, scrollY || 0);
    });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "complete") return;

  if (!pendingScrolls.has(tabId)) return;

  const scrollY = pendingScrolls.get(tabId);
  pendingScrolls.delete(tabId);

  chrome.tabs.sendMessage(tabId, { type: "SCROLL_TO", scrollY }, () => {
    if (chrome.runtime.lastError) {
      console.warn(chrome.runtime.lastError.message);
    }
  });
});
