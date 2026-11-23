// ============================================================
// Background Service Worker (Manifest V3)
// Handles side panel opening, relaying messages, icon clicks
// ============================================================

// Open side panel when extension action icon is clicked
chrome.sidePanel
  ?.setPanelBehavior?.({ openPanelOnActionClick: true })
  ?.catch((error: unknown) => {
    console.error('Error setting panel behavior:', error);
  });

chrome.runtime.onInstalled.addListener(() => {
  console.log('LeadPing AI Extension Installed');
});

// Listen for messages from popup or sidepanel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.sidePanel.open({ tabId: activeTab.id }).catch((err) => {
          console.error('Failed to open side panel:', err);
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true;
  }

  if (message.type === 'GET_CURRENT_TAB_URL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      sendResponse({ url: activeTab?.url || '', title: activeTab?.title || '' });
    });
    return true;
  }
});
