// ============================================================
// Background Service Worker (Manifest V3)
// Single-tab Side Panel controller: opens and remains active
// exclusively on the single tab where the user opened it.
// ============================================================

const STORAGE_KEYS = {
  tabId: 'leadpingActivePanelTabId',
  windowId: 'leadpingActivePanelWindowId',
} as const;

interface SidePanelCloseApi {
  close?: (options: { tabId?: number; windowId?: number }) => Promise<void>;
}

let memoryActiveTabId: number | null = null;
let memoryActiveWindowId: number | null = null;
let activePanelPort: chrome.runtime.Port | null = null;
let activePortTabId: number | null = null;

function closeSidePanelSafe(options: { tabId?: number; windowId?: number }) {
  const sidePanelApi = chrome.sidePanel as (typeof chrome.sidePanel & SidePanelCloseApi) | undefined;
  if (typeof sidePanelApi?.close === 'function') {
    sidePanelApi.close(options).catch(() => {});
  }
}

function disableTabSidePanel(tabId: number) {
  if (chrome.sidePanel?.setOptions) {
    chrome.sidePanel.setOptions({ tabId, enabled: false }).catch(() => {});
  }
}

function disableAndCloseTabSidePanel(tabId: number) {
  disableTabSidePanel(tabId);
  closeSidePanelSafe({ tabId });
}

function setActivePanelState(tabId: number | null, windowId: number | null) {
  memoryActiveTabId = tabId;
  memoryActiveWindowId = windowId;

  if (!chrome.storage?.session) return;
  if (tabId === null) {
    chrome.storage.session.remove([STORAGE_KEYS.tabId, STORAGE_KEYS.windowId]).catch(() => {});
  } else {
    chrome.storage.session
      .set({
        [STORAGE_KEYS.tabId]: tabId,
        [STORAGE_KEYS.windowId]: windowId,
      })
      .catch(() => {});
  }
}

async function getActivePanelState(): Promise<{ activePanelTabId: number | null; activePanelWindowId: number | null }> {
  if (memoryActiveTabId !== null) {
    return {
      activePanelTabId: memoryActiveTabId,
      activePanelWindowId: memoryActiveWindowId,
    };
  }

  if (!chrome.storage?.session) {
    return { activePanelTabId: null, activePanelWindowId: null };
  }

  try {
    const stored = await chrome.storage.session.get([STORAGE_KEYS.tabId, STORAGE_KEYS.windowId]);
    const tabId = typeof stored[STORAGE_KEYS.tabId] === 'number' ? stored[STORAGE_KEYS.tabId] : null;
    const windowId = typeof stored[STORAGE_KEYS.windowId] === 'number' ? stored[STORAGE_KEYS.windowId] : null;
    memoryActiveTabId = tabId;
    memoryActiveWindowId = windowId;
    return { activePanelTabId: tabId, activePanelWindowId: windowId };
  } catch {
    return { activePanelTabId: null, activePanelWindowId: null };
  }
}

function resetAllSidePanels() {
  if (!chrome.sidePanel) return;

  setActivePanelState(null, null);

  if (chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((err) => {
      console.warn('[LeadPing] Error setting panel behavior:', err);
    });
  }

  if (chrome.sidePanel.setOptions) {
    chrome.sidePanel.setOptions({ enabled: false }).catch((err) => {
      console.warn('[LeadPing] Error disabling global side panel:', err);
    });
  }

  chrome.windows?.getAll?.({}, (windows) => {
    for (const w of windows) {
      if (typeof w.id === 'number') {
        closeSidePanelSafe({ windowId: w.id });
      }
    }
  });

  chrome.tabs?.query?.({}, (tabs) => {
    for (const t of tabs) {
      if (typeof t.id === 'number') {
        disableAndCloseTabSidePanel(t.id);
      }
    }
  });

  chrome.runtime.sendMessage({ type: 'FORCE_CLOSE_SIDE_PANEL' }).catch(() => {});
}

function disableAndCloseOtherTabs(keepTabId: number | null) {
  chrome.tabs?.query?.({}, (tabs) => {
    for (const t of tabs) {
      if (typeof t.id === 'number' && t.id !== keepTabId) {
        disableAndCloseTabSidePanel(t.id);
      }
    }
  });
}

/**
 * Enable and open the side panel synchronously for a single tab (preserving Chrome's user gesture),
 * and close/disable every other tab so only one tab holds LeadPing open.
 */
function openSingleTabSidePanel(tabId: number, windowId: number | null) {
  if (!chrome.sidePanel?.setOptions || !chrome.sidePanel?.open) return;

  const previousTabId = memoryActiveTabId;

  // Must invoke setOptions + open without awaiting to preserve Chrome's user gesture token
  chrome.sidePanel
    .setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true,
    })
    .catch((err) => {
      console.warn('[LeadPing] Failed to enable tab side panel:', err);
    });

  chrome.sidePanel.open({ tabId }).catch((err) => {
    console.warn('[LeadPing] Failed to open tab side panel:', err);
  });

  setActivePanelState(tabId, windowId);

  if (previousTabId !== null && previousTabId !== tabId) {
    disableAndCloseTabSidePanel(previousTabId);
  }

  disableAndCloseOtherTabs(tabId);

  chrome.runtime.sendMessage({ type: 'CLOSE_SIDE_PANEL', keepTabId: tabId }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[LeadPing] Extension Installed/Updated');
  resetAllSidePanels();
});

chrome.runtime.onStartup?.addListener(() => {
  resetAllSidePanels();
});

// Keep newly created tabs disabled by default
chrome.tabs?.onCreated?.addListener((tab) => {
  if (typeof tab.id === 'number') {
    disableTabSidePanel(tab.id);
  }
});

// Enforce per-tab visibility when switching between tabs
chrome.tabs?.onActivated?.addListener((activeInfo) => {
  void getActivePanelState().then(({ activePanelTabId }) => {
    if (activeInfo.tabId !== activePanelTabId) {
      disableAndCloseTabSidePanel(activeInfo.tabId);
    }
  });
});

// Prevent restored/navigated non-owner tabs from inheriting an enabled panel
chrome.tabs?.onUpdated?.addListener((tabId, changeInfo) => {
  if (!changeInfo.url && changeInfo.status !== 'loading') return;
  void getActivePanelState().then(({ activePanelTabId }) => {
    if (tabId !== activePanelTabId) {
      disableTabSidePanel(tabId);
    }
  });
});

// Clear tracked state when the owner tab is closed
chrome.tabs?.onRemoved?.addListener((tabId) => {
  void getActivePanelState().then(({ activePanelTabId }) => {
    if (tabId === activePanelTabId) {
      setActivePanelState(null, null);
    }
  });
});

// Track live side panel port so clicking X clears owner state cleanly
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'leadping-sidepanel') return;

  activePanelPort = port;

  port.onMessage.addListener((msg: { type?: string; ownerTabId?: number | null }) => {
    if (msg?.type === 'PORT_REGISTER' && typeof msg.ownerTabId === 'number') {
      activePortTabId = msg.ownerTabId;
    }
  });

  port.onDisconnect.addListener(() => {
    const disconnectedTabId = activePortTabId;
    if (activePanelPort === port) {
      activePanelPort = null;
      activePortTabId = null;
    }

    if (typeof disconnectedTabId === 'number') {
      void getActivePanelState().then(({ activePanelTabId }) => {
        if (activePanelTabId === disconnectedTabId) {
          disableTabSidePanel(disconnectedTabId);
          setActivePanelState(null, null);
        }
      });
    }
  });
});

// Open side panel exclusively for the tab where the toolbar icon was clicked
chrome.action?.onClicked?.addListener((tab) => {
  if (tab.id) {
    openSingleTabSidePanel(tab.id, tab.windowId ?? null);
  }
});

// Listen for messages from content script, popup, or sidepanel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_SIDE_PANEL') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        openSingleTabSidePanel(activeTab.id, activeTab.windowId ?? null);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true;
  }

  if (message.type === 'REGISTER_SIDE_PANEL') {
    void getActivePanelState().then(({ activePanelTabId, activePanelWindowId }) => {
      if (activePanelTabId !== null) {
        sendResponse({ ownerTabId: activePanelTabId, ownerWindowId: activePanelWindowId });
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        sendResponse({
          ownerTabId: activeTab?.id ?? null,
          ownerWindowId: activeTab?.windowId ?? null,
        });
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_SIDE_PANEL_OWNER') {
    const targetTabId = typeof message.tabId === 'number' ? message.tabId : null;
    void getActivePanelState().then(({ activePanelTabId }) => {
      if (targetTabId !== null) {
        disableAndCloseTabSidePanel(targetTabId);
      }
      if (targetTabId === null || activePanelTabId === targetTabId) {
        setActivePanelState(null, null);
      }
      sendResponse({ success: true });
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
