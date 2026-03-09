/**
 * Service Worker (Background Script) for SenseUI
 */

// Keep the default browser action free to open the standard popup defined in manifest.json

// Listen for keyboard commands, primarily the custom close shortcut
chrome.commands.onCommand.addListener((command) => {
    if (command === 'open_side_panel') {
        // Query the active tab to get the current window ID and open the panel there
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.sidePanel
                    .open({ windowId: tabs[0].windowId })
                    .catch(console.error);
            }
        });
    } else if (command === 'close_side_panel') {
        // Send a message to the active views to close themselves
        chrome.runtime.sendMessage({ action: 'close_side_panel' }).catch(() => {
            // It's possible the panel is not open, ignore errors here
        });
    }
});
