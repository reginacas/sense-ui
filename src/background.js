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
                const currentTab = tabs[0];
                chrome.sidePanel
                    .open({ windowId: currentTab.windowId })
                    .then(() => {
                        chrome.runtime
                            .sendMessage({ action: 'focus_side_panel' })
                            .catch(() => {
                                // Panel may not be open yet, ignore errors
                            });
                    })
                    .catch(console.error);

                // Accessible announcement on the active webpage so screen reader users
                // immediately know the persistent panel opened and how to navigate.
                if (currentTab.id) {
                    chrome.scripting
                        .executeScript({
                            target: { tabId: currentTab.id },
                            func: () => {
                                const isMac =
                                    typeof navigator !== 'undefined' &&
                                    /Mac|iPod|iPhone|iPad/.test(
                                        navigator.platform ||
                                            navigator.userAgent,
                                    );
                                const closeShortcut = isMac
                                    ? 'Command+Shift+X'
                                    : 'Ctrl+Shift+X';
                                const announceId =
                                    'senseui-persistent-panel-announcement';
                                let live = document.getElementById(announceId);
                                if (!live) {
                                    live = document.createElement('div');
                                    live.id = announceId;
                                    live.setAttribute('role', 'status');
                                    live.setAttribute('aria-live', 'polite');
                                    live.setAttribute('aria-atomic', 'true');
                                    live.className = 'sr-only';
                                    live.style.position = 'absolute';
                                    live.style.width = '1px';
                                    live.style.height = '1px';
                                    live.style.padding = '0';
                                    live.style.margin = '-1px';
                                    live.style.overflow = 'hidden';
                                    live.style.clip = 'rect(0, 0, 0, 0)';
                                    live.style.whiteSpace = 'nowrap';
                                    live.style.border = '0';
                                    document.body.appendChild(live);
                                }
                                live.textContent = '';
                                setTimeout(() => {
                                    live.textContent = `SenseUI persistent side panel opened. Press F6 or Shift+F6 to switch between webpage and panel, or ${closeShortcut} to close.`;
                                }, 50);
                                setTimeout(() => {
                                    if (live && live.parentNode) {
                                        live.remove();
                                    }
                                }, 4000);
                            },
                        })
                        .catch(() => {
                            // Ignore failures on pages where scripting is restricted
                        });
                }
            }
        });
    } else if (command === 'close_side_panel') {
        chrome.runtime.sendMessage({ action: 'close_side_panel' }).catch(() => {
            // Panel may not be open, ignore errors
        });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0 && tabs[0].id) {
                chrome.scripting
                    .executeScript({
                        target: { tabId: tabs[0].id },
                        func: () => {
                            window.focus();
                            if (document.activeElement) {
                                document.activeElement.focus();
                            }
                        },
                    })
                    .catch(() => {
                        // Ignore failures on restricted pages
                    });
            }
        });
    }
});
