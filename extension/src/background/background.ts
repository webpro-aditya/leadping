// ============================================================
// Background Service Worker (Manifest V3)
// Handles side panel opening, relaying messages, icon clicks
// ============================================================

// Helper to reliably enforce side panel options
function enforceSidePanelOptions(tabId?: number) {
  if (!chrome.sidePanel?.setOptions) return;
  const options: chrome.sidePanel.PanelOptions = {
    path: 'sidepanel.html',
    enabled: true,
  };
  if (typeof tabId === 'number') {
    options.tabId = tabId;
  }
  chrome.sidePanel.setOptions(options).catch((err) => {
    console.warn('[LeadPing] Failed to set side panel options:', err);
  });
}

// Set global panel behavior
if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
    console.warn('[LeadPing] Error setting panel behavior:', err);
  });
}

// Initial enforcement on worker spin-up
enforceSidePanelOptions();

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LeadPing] Extension Installed/Updated');
  enforceSidePanelOptions();
});

// Enforce correct path on active tab switch
chrome.tabs?.onActivated?.addListener((activeInfo) => {
  enforceSidePanelOptions(activeInfo.tabId);
});

// Enforce correct path on navigation complete
chrome.tabs?.onUpdated?.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    enforceSidePanelOptions(tabId);
  }
});

// Fallback for action click if setPanelBehavior is not supported
chrome.action?.onClicked?.addListener((tab) => {
  if (tab.id && chrome.sidePanel?.open) {
    enforceSidePanelOptions(tab.id);
    chrome.sidePanel.open({ tabId: tab.id }).catch((err) => {
      console.warn('[LeadPing] Failed to open side panel on click:', err);
    });
  }
});

// Listen for messages from content script or sidepanel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id && chrome.sidePanel?.open) {
        enforceSidePanelOptions(activeTab.id);
        chrome.sidePanel.open({ tabId: activeTab.id }).catch((err) => {
          console.error('[LeadPing] Failed to open side panel:', err);
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
