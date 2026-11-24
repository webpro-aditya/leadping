(function () {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      window.location.replace(chrome.runtime.getURL('sidepanel.html'));
    } else {
      window.location.replace('../../sidepanel.html');
    }
  } catch (e) {
    window.location.replace('../../sidepanel.html');
  }
})();
