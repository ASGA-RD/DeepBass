chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove(`deepBass_${tabId}`);
});
