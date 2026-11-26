// ============================================================
// Background Service Worker (Manifest V3)
// Lightweight message relay for toolbar popup mode
// ============================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LeadPing] Extension Installed/Updated (Popup Mode)');
});

// Listen for helper messages from content script or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_CURRENT_TAB_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      sendResponse({ url: activeTab?.url || '', title: activeTab?.title || '' });
    });
    return true;
  }
});
