/**
 * About Page Script
 */

// Handle opening Chrome shortcuts page
const shortcutsBtn = document.getElementById('open-shortcuts-about');
if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
}

// Side panel message listener
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'close_side_panel') {
        window.close();
    } else if (message.action === 'focus_side_panel') {
        window.focus();
    }
});
