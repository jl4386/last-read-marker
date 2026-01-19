chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "GET_SCROLL") {
    sendResponse({ scrollY: window.scrollY || document.documentElement.scrollTop || 0 });
    return true;
  }

  if (message?.type === "SCROLL_TO") {
    const target = Number.isFinite(message.scrollY) ? message.scrollY : 0;
    window.scrollTo({ top: target, behavior: "auto" });
  }
});
