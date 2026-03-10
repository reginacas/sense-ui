/**
 * Background service worker for SenseUI
 * Handles extension lifecycle events including first-time installation
 */

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // First-time installation - set flag to show welcome page in popup
        chrome.storage.local.set({ senseui_first_time: true });
    } else if (details.reason === 'update') {
        // Extension was updated
        console.log(
            'SenseUI updated to version',
            chrome.runtime.getManifest().version,
        );
        // Optionally open a "What's new" page:
        // chrome.tabs.create({ url: chrome.runtime.getURL('whats-new.html') });
    }
});

// Listen for keyboard commands (side panel open/close)
chrome.commands.onCommand.addListener((command) => {
    if (command === 'open_side_panel') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.sidePanel
                    .open({ windowId: tabs[0].windowId })
                    .catch(console.error);
            }
        });
    } else if (command === 'close_side_panel') {
        chrome.runtime.sendMessage({ action: 'close_side_panel' }).catch(() => {
            // Panel may not be open, ignore errors
        });
    }
});
