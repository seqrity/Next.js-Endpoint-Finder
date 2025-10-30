console.log("BACKGROUND: Extension loaded");

const detectNextJs = () => {
  let pages = null;
  if (window.__BUILD_MANIFEST?.sortedPages) {
    pages = window.__BUILD_MANIFEST.sortedPages;
  } else if (window.__NEXT_DATA__?.props?.pageProps?.__N_SSG) {
    pages = Object.keys(window.__NEXT_DATA__.props.pageProps).filter(k => k.startsWith('/'));
  }
  return pages?.length || 0;
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url?.startsWith('http')) return;

  chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    func: detectNextJs,
    world: 'MAIN'
  }).then((results) => {
    const count = results[0]?.result || 0;
    const text = count > 0 ? String(count) : "";
    chrome.action.setBadgeText({ tabId, text });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#EF4444" });
  }).catch(() => {
    chrome.action.setBadgeText({ tabId, text: "" });
  });
});