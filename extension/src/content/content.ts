// ============================================================
// Content Script (runs in the context of web pages)
// Listens for messages from sidepanel/background to extract page data
// ============================================================

import { extractPageData } from '../services/extractor';

// Listen for messages from background or sidepanel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_INFO') {
    sendResponse({
      success: true,
      url: window.location.href,
      title: document.title || '',
    });
    return false;
  }

  if (message.type === 'EXTRACT_PAGE_DATA') {
    try {
      const pageData = extractPageData();
      sendResponse({ success: true, data: pageData });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract page data';
      sendResponse({ success: false, error: errorMessage });
    }
  }
  return true; // Keep message channel open for async response
});
