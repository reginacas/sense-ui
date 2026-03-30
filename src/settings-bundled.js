/**
 * Settings Page Script - Bundled Version
 */

// Storage keys
const STORAGE_KEYS = {
    OPENAI_API_KEY: 'senseui_openai_key',
    GEMINI_API_KEY: 'senseui_gemini_key',
    SELECTED_PROVIDER: 'senseui_provider',
    USER_SETTINGS: 'senseui_settings',
};

// ============================================================================
// ENCRYPTION UTILITIES
// ============================================================================
async function getEncryptionPassword() {
    const extensionId = chrome.runtime.id;
    let sessionKey = await chrome.storage.local.get('senseui_session_key');
    if (!sessionKey.senseui_session_key) {
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        sessionKey.senseui_session_key = Array.from(randomBytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        await chrome.storage.local.set(sessionKey);
    }
    return `${extensionId}:${sessionKey.senseui_session_key}`;
}

async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey'],
    );
    return await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

async function encryptData(plaintext) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const password = await getEncryptionPassword();
    const key = await deriveKey(password, salt);
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data,
    );
    const combined = new Uint8Array(
        salt.length + iv.length + encryptedData.byteLength,
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function storeApiKey(keyName, apiKey) {
    const encrypted = await encryptData(apiKey);
    await chrome.storage.local.set({ [keyName]: encrypted });
}

async function retrieveApiKey(keyName) {
    try {
        const result = await chrome.storage.local.get(keyName);
        const encrypted = result[keyName];
        if (!encrypted) return null;

        const combined = new Uint8Array(
            atob(encrypted)
                .split('')
                .map((c) => c.charCodeAt(0)),
        );
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encryptedData = combined.slice(28);

        const password = await getEncryptionPassword();
        const key = await deriveKey(password, salt);
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedData,
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    } catch (error) {
        console.error('Error retrieving API key:', error);
        return null;
    }
}

function validateApiKeyFormat(apiKey, provider) {
    if (!apiKey || typeof apiKey !== 'string') return false;
    switch (provider) {
        case 'openai':
            return apiKey.startsWith('sk-') && apiKey.length >= 48;
        case 'gemini':
            return apiKey.length >= 30 && /^[A-Za-z0-9_-]+$/.test(apiKey);
        default:
            return false;
    }
}

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================
function getDefaultSettings() {
    return {
        contextInstructions: '',
        selectedProvider: 'openai',
        screenshotMode: 'fullpage',
        openaiModel: '',
        geminiModel: '',
        showButtons: false,
    };
}

async function loadSettings() {
    const result = await chrome.storage.local.get([
        STORAGE_KEYS.SELECTED_PROVIDER,
        STORAGE_KEYS.USER_SETTINGS,
    ]);
    const settings = result[STORAGE_KEYS.USER_SETTINGS] || getDefaultSettings();
    settings.selectedProvider =
        result[STORAGE_KEYS.SELECTED_PROVIDER] || 'openai';

    // Backfill defaults for newly added settings
    if (settings.openaiModel === undefined) settings.openaiModel = '';
    if (settings.geminiModel === undefined) settings.geminiModel = '';
    if (settings.screenshotMode === undefined)
        settings.screenshotMode = 'fullpage';

    const openaiKey = await retrieveApiKey(STORAGE_KEYS.OPENAI_API_KEY);
    const geminiKey = await retrieveApiKey(STORAGE_KEYS.GEMINI_API_KEY);
    settings.hasOpenAIKey = !!openaiKey;
    settings.hasGeminiKey = !!geminiKey;

    return settings;
}

async function saveSettings(settings) {
    const { openaiApiKey, geminiApiKey, selectedProvider, ...otherSettings } =
        settings;

    if (selectedProvider) {
        await chrome.storage.local.set({
            [STORAGE_KEYS.SELECTED_PROVIDER]: selectedProvider,
        });
    }
    if (openaiApiKey) {
        await storeApiKey(STORAGE_KEYS.OPENAI_API_KEY, openaiApiKey);
    }
    if (geminiApiKey) {
        await storeApiKey(STORAGE_KEYS.GEMINI_API_KEY, geminiApiKey);
    }
    await chrome.storage.local.set({
        [STORAGE_KEYS.USER_SETTINGS]: otherSettings,
    });
}

function validateSettings(settings) {
    const errors = [];
    if (
        settings.openaiApiKey &&
        !validateApiKeyFormat(settings.openaiApiKey, 'openai')
    ) {
        errors.push('OpenAI API key format is invalid.');
    }
    if (
        settings.geminiApiKey &&
        !validateApiKeyFormat(settings.geminiApiKey, 'gemini')
    ) {
        errors.push('Gemini API key format is invalid.');
    }
    return { valid: errors.length === 0, errors };
}

async function resetSettings() {
    // Keep API keys and selected provider, reset everything else
    const defaults = getDefaultSettings();
    await chrome.storage.local.set({ [STORAGE_KEYS.USER_SETTINGS]: defaults });
    // Note: We do NOT reset STORAGE_KEYS.SELECTED_PROVIDER here anymore
}

async function clearApiKey(provider) {
    const keyName =
        provider === 'openai'
            ? STORAGE_KEYS.OPENAI_API_KEY
            : STORAGE_KEYS.GEMINI_API_KEY;
    await chrome.storage.local.remove(keyName);
}

async function getApiKeyStatus() {
    const openaiKey = await retrieveApiKey(STORAGE_KEYS.OPENAI_API_KEY);
    const geminiKey = await retrieveApiKey(STORAGE_KEYS.GEMINI_API_KEY);
    const result = await chrome.storage.local.get(
        STORAGE_KEYS.SELECTED_PROVIDER,
    );
    return {
        hasOpenAI: !!openaiKey,
        hasGemini: !!geminiKey,
        selectedProvider: result[STORAGE_KEYS.SELECTED_PROVIDER] || 'openai',
    };
}

// ============================================================================
// UI CODE
// ============================================================================
const form = document.getElementById('settings-form');
const providerOpenAI = document.getElementById('provider-openai');
const providerGemini = document.getElementById('provider-gemini');
const openaiKeyInput = document.getElementById('openai-key');
const geminiKeyInput = document.getElementById('gemini-key');
const openaiKeyLabel = openaiKeyInput?.previousElementSibling;
const geminiKeyLabel = geminiKeyInput?.previousElementSibling;
const clearOpenAIBtn = document.getElementById('clear-openai-key');
const clearGeminiBtn = document.getElementById('clear-gemini-key');
const statusDiv = document.getElementById('settings-status');
const openaiStatus = document.getElementById('openai-status');
const geminiStatus = document.getElementById('gemini-status');
const showButtonsCheckbox = document.getElementById('show-buttons');
const contextText = document.getElementById('context-text');
const openaiModelInput = document.getElementById('openai-model');
const geminiModelInput = document.getElementById('gemini-model');
const openaiModelLabel = document.getElementById('openai-model-label');
const geminiModelLabel = document.getElementById('gemini-model-label');
const geminiModelDesc = document.getElementById('gemini-model-desc');
const geminiCombobox = document.getElementById('gemini-combobox');
const modelSection = document.getElementById('model-customization-section');
const aiKeyInstructions = document.getElementById('ai-key-instructions');
const exportSettingsBtn = document.getElementById('export-settings');
const exportSettingsNoKeysBtn = document.getElementById(
    'export-settings-no-keys',
);
const importSettingsBtn = document.getElementById('import-settings');
const importSettingsInput = document.getElementById('import-settings-file');

let hasOpenAIKeyConfigured = false;
let hasGeminiKeyConfigured = false;

function updateModelFieldsVisibility() {
    if (!openaiModelInput || !geminiModelInput) return;

    const selectedProvider = providerOpenAI.checked ? 'openai' : 'gemini';
    const hasOpenAI =
        hasOpenAIKeyConfigured ||
        (openaiKeyInput && openaiKeyInput.value.trim() !== '');
    const hasGemini =
        hasGeminiKeyConfigured ||
        (geminiKeyInput && geminiKeyInput.value.trim() !== '');

    // Get the OpenAI combobox container
    const openaiCombobox = openaiModelInput.closest('.combobox');

    // Show or hide the entire model section
    const shouldShowSection =
        (selectedProvider === 'openai' && hasOpenAI) ||
        (selectedProvider === 'gemini' && hasGemini);
    if (modelSection) {
        modelSection.style.display = shouldShowSection ? '' : 'none';
    }

    // Hide API key instructions if any key is configured
    const hasAnyKey = hasOpenAI || hasGemini;
    if (aiKeyInstructions) {
        aiKeyInstructions.style.display = hasAnyKey ? 'none' : '';
    }

    // Hide provider-specific fields by default
    if (openaiModelLabel) openaiModelLabel.style.display = 'none';
    if (openaiCombobox) openaiCombobox.style.display = 'none';
    if (geminiModelLabel) geminiModelLabel.style.display = 'none';
    if (geminiCombobox) geminiCombobox.style.display = 'none';
    if (geminiModelDesc) geminiModelDesc.style.display = 'none';

    // Show the appropriate provider's fields
    if (selectedProvider === 'openai' && hasOpenAI) {
        if (openaiModelLabel) openaiModelLabel.style.display = '';
        if (openaiCombobox) openaiCombobox.style.display = '';
    } else if (selectedProvider === 'gemini' && hasGemini) {
        if (geminiModelLabel) geminiModelLabel.style.display = '';
        if (geminiCombobox) geminiCombobox.style.display = '';
        if (geminiModelDesc) geminiModelDesc.style.display = '';
    }
}

// Function to toggle API key fields based on selected provider
function toggleApiKeyFields() {
    const selectedProvider = providerOpenAI.checked ? 'openai' : 'gemini';

    if (selectedProvider === 'openai') {
        // Show OpenAI fields
        if (openaiKeyLabel) openaiKeyLabel.style.display = '';
        if (openaiKeyInput) openaiKeyInput.style.display = '';
        if (openaiStatus) openaiStatus.style.display = '';
        if (clearOpenAIBtn && clearOpenAIBtn.style.display === 'inline-block') {
            clearOpenAIBtn.style.display = 'inline-block';
        }
        // Hide Gemini fields
        if (geminiKeyLabel) geminiKeyLabel.style.display = 'none';
        if (geminiKeyInput) geminiKeyInput.style.display = 'none';
        if (geminiStatus) geminiStatus.style.display = 'none';
        if (clearGeminiBtn) clearGeminiBtn.style.display = 'none';
    } else {
        // Show Gemini fields
        if (geminiKeyLabel) geminiKeyLabel.style.display = '';
        if (geminiKeyInput) geminiKeyInput.style.display = '';
        if (geminiStatus) geminiStatus.style.display = '';
        if (clearGeminiBtn && clearGeminiBtn.style.display === 'inline-block') {
            clearGeminiBtn.style.display = 'inline-block';
        }
        // Hide OpenAI fields
        if (openaiKeyLabel) openaiKeyLabel.style.display = 'none';
        if (openaiKeyInput) openaiKeyInput.style.display = 'none';
        if (openaiStatus) openaiStatus.style.display = 'none';
        if (clearOpenAIBtn) clearOpenAIBtn.style.display = 'none';
    }

    updateModelFieldsVisibility();
}

function showStatus(message, isError = false) {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'error-message' : 'success-message';
        statusDiv.classList.remove('visually-hidden');
        setTimeout(() => statusDiv.classList.add('visually-hidden'), 5000);
    }
}

async function handleSuccessfulSave() {
    openaiKeyInput.value = '';
    geminiKeyInput.value = '';

    await updateApiKeyStatus();
    showStatus('Settings saved successfully!');

    const stayOnPage = document.getElementById('stay-on-page')?.checked;
    if (!stayOnPage) {
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }

    return stayOnPage;
}

function getExportableSettings(settings) {
    const exportable = { ...settings };
    delete exportable.hasOpenAIKey;
    delete exportable.hasGeminiKey;
    return exportable;
}

function normalizeImportedSettings(rawSettings) {
    if (!rawSettings || typeof rawSettings !== 'object') {
        throw new Error('Imported file must contain a JSON object.');
    }

    const defaults = getDefaultSettings();
    const normalized = {
        ...defaults,
        contextInstructions:
            typeof rawSettings.contextInstructions === 'string'
                ? rawSettings.contextInstructions
                : defaults.contextInstructions,
        selectedProvider:
            rawSettings.selectedProvider === 'gemini' ? 'gemini' : 'openai',
        screenshotMode:
            rawSettings.screenshotMode === 'viewport' ? 'viewport' : 'fullpage',
        openaiModel:
            typeof rawSettings.openaiModel === 'string'
                ? rawSettings.openaiModel
                : defaults.openaiModel,
        geminiModel:
            typeof rawSettings.geminiModel === 'string'
                ? rawSettings.geminiModel
                : defaults.geminiModel,
        showButtons: Boolean(rawSettings.showButtons),
    };

    if (typeof rawSettings.openaiApiKey === 'string') {
        normalized.openaiApiKey = rawSettings.openaiApiKey.trim();
    }
    if (typeof rawSettings.geminiApiKey === 'string') {
        normalized.geminiApiKey = rawSettings.geminiApiKey.trim();
    }

    return normalized;
}

function downloadJsonFile(data, filename) {
    const blob = new Blob([data], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
}

function getSettingsExportFilename(includeApiKeys) {
    const date = new Date().toISOString().slice(0, 10);
    return includeApiKeys
        ? `senseui-settings-${date}.json`
        : `senseui-settings-no-keys-${date}.json`;
}

async function exportSettingsToFile(includeApiKeys) {
    const settings = await loadSettings();
    const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: getExportableSettings(settings),
    };

    if (includeApiKeys) {
        const openaiApiKey = await retrieveApiKey(STORAGE_KEYS.OPENAI_API_KEY);
        const geminiApiKey = await retrieveApiKey(STORAGE_KEYS.GEMINI_API_KEY);
        if (openaiApiKey) payload.settings.openaiApiKey = openaiApiKey;
        if (geminiApiKey) payload.settings.geminiApiKey = geminiApiKey;
    }

    downloadJsonFile(
        JSON.stringify(payload, null, 2),
        getSettingsExportFilename(includeApiKeys),
    );
    showStatus('Settings exported successfully!');
}

async function handleImportFileChange(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    try {
        const fileContent = await file.text();
        const parsed = JSON.parse(fileContent);
        const rawSettings =
            parsed && typeof parsed === 'object' && parsed.settings
                ? parsed.settings
                : parsed;
        const normalizedSettings = normalizeImportedSettings(rawSettings);
        const validation = validateSettings(normalizedSettings);

        if (!validation.valid) {
            showStatus(
                `Validation errors: ${validation.errors.join(', ')}`,
                true,
            );
            return;
        }

        await saveSettings(normalizedSettings);
        const stayOnPage = await handleSuccessfulSave();

        if (stayOnPage) {
            await loadCurrentSettings();
        }
    } catch (error) {
        console.error('Error importing settings:', error);
        showStatus(`Failed to import settings: ${error.message}`, true);
    } finally {
        if (importSettingsInput) {
            importSettingsInput.value = '';
        }
    }
}

function triggerImportFilePicker() {
    importSettingsInput?.click();
}

async function updateApiKeyStatus() {
    const status = await getApiKeyStatus();

    hasOpenAIKeyConfigured = status.hasOpenAI;
    hasGeminiKeyConfigured = status.hasGemini;

    if (status.hasOpenAI) {
        openaiStatus.textContent = '✓ Key configured';
        openaiStatus.className = 'hint success-text';
        clearOpenAIBtn.style.display = 'inline-block';
        openaiKeyInput.placeholder = '••••••••••••••••';
    } else {
        openaiStatus.textContent = 'No key configured';
        openaiStatus.className = 'hint';
        clearOpenAIBtn.style.display = 'none';
        openaiKeyInput.placeholder = 'Your OpenAI Key...';
    }

    if (status.hasGemini) {
        geminiStatus.textContent = '✓ Key configured';
        geminiStatus.className = 'hint success-text';
        clearGeminiBtn.style.display = 'inline-block';
        geminiKeyInput.placeholder = '••••••••••••••••';
    } else {
        geminiStatus.textContent = 'No key configured';
        geminiStatus.className = 'hint';
        clearGeminiBtn.style.display = 'none';
        geminiKeyInput.placeholder = 'Your Gemini API key';
    }

    updateModelFieldsVisibility();
}

async function loadCurrentSettings() {
    try {
        const settings = await loadSettings();

        if (settings.contextInstructions) {
            contextText.value = settings.contextInstructions;
        }

        // Set the model inputs
        if (openaiModelInput) {
            openaiModelInput.value = settings.openaiModel || '';
        }
        if (geminiModelInput) {
            geminiModelInput.value = settings.geminiModel || '';
        }

        // Set the screenshot mode radio button
        const screenshotViewport = document.getElementById(
            'screenshot-viewport',
        );
        const screenshotFullpage = document.getElementById(
            'screenshot-fullpage',
        );
        if (settings.screenshotMode === 'viewport') {
            screenshotViewport.checked = true;
            screenshotFullpage.checked = false;
        } else {
            screenshotFullpage.checked = true;
            screenshotViewport.checked = false;
        }

        // Set the show buttons checkbox
        const showButtonsCheckbox = document.getElementById('show-buttons');
        if (showButtonsCheckbox) {
            showButtonsCheckbox.checked = settings.showButtons || false;
        }

        // Set the selected provider radio button
        if (settings.selectedProvider === 'gemini') {
            providerGemini.checked = true;
            providerOpenAI.checked = false;
        } else {
            providerOpenAI.checked = true;
            providerGemini.checked = false;
        }

        await updateApiKeyStatus();
        toggleApiKeyFields(); // Show/hide fields based on selected provider and update model visibility
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('Failed to load settings', true);
    }
}

async function handleSubmit(event) {
    event.preventDefault();

    try {
        const formData = new FormData(form);
        const settings = {};

        settings.screenshotMode = formData.get('screenshot') || 'fullpage';

        settings.contextInstructions = formData.get('context') || '';
        settings.selectedProvider = providerGemini?.checked
            ? 'gemini'
            : 'openai';
        settings.showButtons = formData.get('showButtons') === 'on';

        // Model selections (optional strings; treated as-is at runtime)
        const openaiModel = formData.get('openaiModel');
        const geminiModel = formData.get('geminiModel');
        if (openaiModel !== null) settings.openaiModel = openaiModel.trim();
        if (geminiModel !== null) settings.geminiModel = geminiModel.trim();

        const openaiKey = openaiKeyInput.value.trim();
        const geminiKey = geminiKeyInput.value.trim();

        if (openaiKey && openaiKey !== '••••••••••••••••') {
            settings.openaiApiKey = openaiKey;
        }
        if (geminiKey && geminiKey !== '••••••••••••••••') {
            settings.geminiApiKey = geminiKey;
        }

        const validation = validateSettings(settings);
        if (!validation.valid) {
            showStatus(
                `Validation errors: ${validation.errors.join(', ')}`,
                true,
            );
            return;
        }

        await saveSettings(settings);

        await handleSuccessfulSave();
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus(`Failed to save settings: ${error.message}`, true);
    }
}

async function handleClearOpenAI() {
    if (confirm('Are you sure you want to clear your OpenAI API key?')) {
        try {
            await clearApiKey('openai');
            openaiKeyInput.value = '';
            await updateApiKeyStatus();
            showStatus('OpenAI API key cleared');
        } catch (error) {
            showStatus('Failed to clear OpenAI key', true);
        }
    }
}

async function handleClearGemini() {
    if (confirm('Are you sure you want to clear your Gemini API key?')) {
        try {
            await clearApiKey('gemini');
            geminiKeyInput.value = '';
            await updateApiKeyStatus();
            showStatus('Gemini API key cleared');
        } catch (error) {
            showStatus('Failed to clear Gemini key', true);
        }
    }
}

form.addEventListener('submit', handleSubmit);
clearOpenAIBtn.addEventListener('click', handleClearOpenAI);
clearGeminiBtn.addEventListener('click', handleClearGemini);

// Add event listeners to provider radio buttons
providerOpenAI.addEventListener('change', toggleApiKeyFields);
providerGemini.addEventListener('change', toggleApiKeyFields);

// When user types an API key, re-evaluate when to show model fields
if (openaiKeyInput) {
    openaiKeyInput.addEventListener('input', updateModelFieldsVisibility);
}
if (geminiKeyInput) {
    geminiKeyInput.addEventListener('input', updateModelFieldsVisibility);
}

// Add event listener for keyboard shortcuts button
const shortcutsBtn = document.getElementById('open-shortcuts');
if (shortcutsBtn) {
    shortcutsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
}

if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', () => {
        const exportWarningDialog = document.getElementById(
            'export-keys-warning-dialog',
        );
        if (exportWarningDialog) {
            exportWarningDialog.showModal();
            return;
        }

        showStatus('Export warning dialog unavailable.', true);
    });
}

if (exportSettingsNoKeysBtn) {
    exportSettingsNoKeysBtn.addEventListener('click', async () => {
        try {
            await exportSettingsToFile(false);
        } catch (error) {
            console.error('Error exporting settings without keys:', error);
            showStatus(`Failed to export settings: ${error.message}`, true);
        }
    });
}

if (importSettingsBtn) {
    importSettingsBtn.addEventListener('click', triggerImportFilePicker);
}

if (importSettingsInput) {
    importSettingsInput.addEventListener('change', handleImportFileChange);
}

const exportWarningDialog = document.getElementById(
    'export-keys-warning-dialog',
);
const confirmExportKeysBtn = document.getElementById(
    'confirm-export-keys-action',
);
const cancelExportKeysBtn = document.getElementById(
    'cancel-export-keys-action',
);

if (exportWarningDialog) {
    if (confirmExportKeysBtn) {
        confirmExportKeysBtn.addEventListener('click', async () => {
            try {
                await exportSettingsToFile(true);
                exportWarningDialog.close();
            } catch (error) {
                console.error('Error exporting settings:', error);
                showStatus(`Failed to export settings: ${error.message}`, true);
            }
        });
    }

    if (cancelExportKeysBtn) {
        cancelExportKeysBtn.addEventListener('click', () => {
            exportWarningDialog.close();
            showStatus('Export cancelled.');
        });
    }
}

// Add event listener for reset settings button
const resetBtn = document.getElementById('reset-settings');
const resetDialog = document.getElementById('reset-warning-dialog');
const confirmResetBtn = document.getElementById('confirm-reset-action');
const cancelResetBtn = document.getElementById('cancel-reset-action');

if (resetBtn && resetDialog) {
    resetBtn.addEventListener('click', () => {
        resetDialog.showModal();
    });

    if (confirmResetBtn) {
        confirmResetBtn.addEventListener('click', async () => {
            try {
                await resetSettings();
                showStatus('Settings reset to defaults');
                // Reload settings to update UI
                await loadCurrentSettings();
                resetDialog.close();
            } catch (error) {
                console.error('Error resetting settings:', error);
                showStatus('Failed to reset settings', true);
            }
        });
    }

    if (cancelResetBtn) {
        cancelResetBtn.addEventListener('click', () => {
            resetDialog.close();
        });
    }
}

// ============================================================================
// COMBOBOX AUTOCOMPLETE COMPONENT
// ============================================================================

/**
 * ComboboxAutocomplete - ARIA-compliant autocomplete combobox
 * Based on W3C ARIA Authoring Practices Guide
 */
class ComboboxAutocomplete {
    constructor(comboboxNode, buttonNode, listboxNode) {
        this.comboboxNode = comboboxNode;
        this.buttonNode = buttonNode;
        this.listboxNode = listboxNode;

        this.comboboxHasVisualFocus = false;
        this.listboxHasVisualFocus = false;

        this.hasHover = false;

        this.isNone = false;
        this.isList = false;
        this.isBoth = false;

        this.allOptions = [];

        this.option = null;
        this.firstOption = null;
        this.lastOption = null;

        this.filteredOptions = [];
        this.filter = '';

        var autocomplete = this.comboboxNode.getAttribute('aria-autocomplete');

        if (typeof autocomplete === 'string') {
            autocomplete = autocomplete.toLowerCase();
            this.isNone = autocomplete === 'none';
            this.isList = autocomplete === 'list';
            this.isBoth = autocomplete === 'both';
        } else {
            // default value of autocomplete
            this.isNone = true;
        }

        this.comboboxNode.addEventListener(
            'keydown',
            this.onComboboxKeyDown.bind(this),
        );
        this.comboboxNode.addEventListener(
            'keyup',
            this.onComboboxKeyUp.bind(this),
        );
        this.comboboxNode.addEventListener(
            'click',
            this.onComboboxClick.bind(this),
        );
        this.comboboxNode.addEventListener(
            'focus',
            this.onComboboxFocus.bind(this),
        );
        this.comboboxNode.addEventListener(
            'blur',
            this.onComboboxBlur.bind(this),
        );

        document.body.addEventListener(
            'pointerup',
            this.onBackgroundPointerUp.bind(this),
            true,
        );

        // initialize pop up menu

        this.listboxNode.addEventListener(
            'pointerover',
            this.onListboxPointerover.bind(this),
        );
        this.listboxNode.addEventListener(
            'pointerout',
            this.onListboxPointerout.bind(this),
        );

        // Traverse the element children of domNode: configure each with
        // option role behavior and store reference in.options array.
        var nodes = this.listboxNode.getElementsByTagName('LI');

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            this.allOptions.push(node);

            node.addEventListener('click', this.onOptionClick.bind(this));
            node.addEventListener(
                'pointerover',
                this.onOptionPointerover.bind(this),
            );
            node.addEventListener(
                'pointerout',
                this.onOptionPointerout.bind(this),
            );
        }

        this.filterOptions();

        // Open Button
        if (this.buttonNode) {
            this.buttonNode.addEventListener(
                'click',
                this.onButtonClick.bind(this),
            );
        }
    }

    getLowercaseContent(node) {
        return node.textContent.toLowerCase();
    }

    isOptionInView(option) {
        var bounding = option.getBoundingClientRect();
        return (
            bounding.top >= 0 &&
            bounding.left >= 0 &&
            bounding.bottom <=
                (window.innerHeight || document.documentElement.clientHeight) &&
            bounding.right <=
                (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    setActiveDescendant(option) {
        if (option && this.listboxHasVisualFocus) {
            this.comboboxNode.setAttribute('aria-activedescendant', option.id);
            if (!this.isOptionInView(option)) {
                option.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            this.comboboxNode.setAttribute('aria-activedescendant', '');
        }
    }

    setValue(value) {
        this.filter = value;
        this.comboboxNode.value = this.filter;
        this.comboboxNode.setSelectionRange(
            this.filter.length,
            this.filter.length,
        );
        this.filterOptions();
    }

    setOption(option, flag) {
        if (typeof flag !== 'boolean') {
            flag = false;
        }

        if (option) {
            this.option = option;
            this.setCurrentOptionStyle(this.option);
            this.setActiveDescendant(this.option);

            if (this.isBoth) {
                this.comboboxNode.value = this.option.textContent;
                if (flag) {
                    this.comboboxNode.setSelectionRange(
                        this.option.textContent.length,
                        this.option.textContent.length,
                    );
                } else {
                    this.comboboxNode.setSelectionRange(
                        this.filter.length,
                        this.option.textContent.length,
                    );
                }
            }
        }
    }

    setVisualFocusCombobox() {
        this.listboxNode.classList.remove('focus');
        this.comboboxNode.parentNode.classList.add('focus');
        this.comboboxHasVisualFocus = true;
        this.listboxHasVisualFocus = false;
        this.setActiveDescendant(false);
    }

    setVisualFocusListbox() {
        this.comboboxNode.parentNode.classList.remove('focus');
        this.comboboxHasVisualFocus = false;
        this.listboxHasVisualFocus = true;
        this.listboxNode.classList.add('focus');
        this.setActiveDescendant(this.option);
    }

    removeVisualFocusAll() {
        this.comboboxNode.parentNode.classList.remove('focus');
        this.comboboxHasVisualFocus = false;
        this.listboxHasVisualFocus = false;
        this.listboxNode.classList.remove('focus');
        this.option = null;
        this.setActiveDescendant(false);
    }

    filterOptions() {
        // do not filter any options if autocomplete is none
        if (this.isNone) {
            this.filter = '';
        }

        var option = null;
        var currentOption = this.option;
        var filter = this.filter.toLowerCase();

        this.filteredOptions = [];
        this.listboxNode.innerHTML = '';

        for (var i = 0; i < this.allOptions.length; i++) {
            option = this.allOptions[i];
            if (
                filter.length === 0 ||
                this.getLowercaseContent(option).indexOf(filter) === 0
            ) {
                this.filteredOptions.push(option);
                this.listboxNode.appendChild(option);
            }
        }

        // Use populated options array to initialize firstOption and lastOption.
        var numItems = this.filteredOptions.length;
        if (numItems > 0) {
            this.firstOption = this.filteredOptions[0];
            this.lastOption = this.filteredOptions[numItems - 1];

            if (
                currentOption &&
                this.filteredOptions.indexOf(currentOption) >= 0
            ) {
                option = currentOption;
            } else {
                option = this.firstOption;
            }
        } else {
            this.firstOption = null;
            option = null;
            this.lastOption = null;
        }

        return option;
    }

    setCurrentOptionStyle(option) {
        for (var i = 0; i < this.filteredOptions.length; i++) {
            var opt = this.filteredOptions[i];
            if (opt === option) {
                opt.setAttribute('aria-selected', 'true');
                if (
                    this.listboxNode.scrollTop + this.listboxNode.offsetHeight <
                    opt.offsetTop + opt.offsetHeight
                ) {
                    this.listboxNode.scrollTop =
                        opt.offsetTop +
                        opt.offsetHeight -
                        this.listboxNode.offsetHeight;
                } else if (this.listboxNode.scrollTop > opt.offsetTop + 2) {
                    this.listboxNode.scrollTop = opt.offsetTop;
                }
            } else {
                opt.removeAttribute('aria-selected');
            }
        }
    }

    getPreviousOption(currentOption) {
        if (currentOption !== this.firstOption) {
            var index = this.filteredOptions.indexOf(currentOption);
            return this.filteredOptions[index - 1];
        }
        return this.lastOption;
    }

    getNextOption(currentOption) {
        if (currentOption !== this.lastOption) {
            var index = this.filteredOptions.indexOf(currentOption);
            return this.filteredOptions[index + 1];
        }
        return this.firstOption;
    }

    /* MENU DISPLAY METHODS */

    doesOptionHaveFocus() {
        return this.comboboxNode.getAttribute('aria-activedescendant') !== '';
    }

    isOpen() {
        return this.listboxNode.style.display === 'block';
    }

    isClosed() {
        return this.listboxNode.style.display !== 'block';
    }

    hasOptions() {
        return this.filteredOptions.length;
    }

    open() {
        this.listboxNode.style.display = 'block';
        this.comboboxNode.setAttribute('aria-expanded', 'true');
        this.buttonNode.setAttribute('aria-expanded', 'true');
    }

    close(force) {
        if (typeof force !== 'boolean') {
            force = false;
        }

        if (
            force ||
            (!this.comboboxHasVisualFocus &&
                !this.listboxHasVisualFocus &&
                !this.hasHover)
        ) {
            this.setCurrentOptionStyle(false);
            this.listboxNode.style.display = 'none';
            this.comboboxNode.setAttribute('aria-expanded', 'false');
            this.buttonNode.setAttribute('aria-expanded', 'false');
            this.setActiveDescendant(false);
            this.comboboxNode.parentNode.classList.add('focus');
        }
    }

    /* combobox Events */

    onComboboxKeyDown(event) {
        var flag = false,
            altKey = event.altKey;

        if (event.ctrlKey || event.shiftKey) {
            return;
        }

        switch (event.key) {
            case 'Enter':
                if (this.listboxHasVisualFocus) {
                    this.setValue(this.option.textContent);
                }
                this.close(true);
                this.setVisualFocusCombobox();
                flag = true;
                break;

            case 'Down':
            case 'ArrowDown':
                if (this.filteredOptions.length > 0) {
                    if (altKey) {
                        this.open();
                    } else {
                        this.open();
                        if (
                            this.listboxHasVisualFocus ||
                            (this.isBoth && this.filteredOptions.length > 1)
                        ) {
                            this.setOption(
                                this.getNextOption(this.option),
                                true,
                            );
                            this.setVisualFocusListbox();
                        } else {
                            this.setOption(this.firstOption, true);
                            this.setVisualFocusListbox();
                        }
                    }
                }
                flag = true;
                break;

            case 'Up':
            case 'ArrowUp':
                if (this.hasOptions()) {
                    if (this.listboxHasVisualFocus) {
                        this.setOption(
                            this.getPreviousOption(this.option),
                            true,
                        );
                    } else {
                        this.open();
                        if (!altKey) {
                            this.setOption(this.lastOption, true);
                            this.setVisualFocusListbox();
                        }
                    }
                }
                flag = true;
                break;

            case 'Esc':
            case 'Escape':
                if (this.isOpen()) {
                    this.close(true);
                    this.filter = this.comboboxNode.value;
                    this.filterOptions();
                    this.setVisualFocusCombobox();
                } else {
                    this.setValue('');
                    this.comboboxNode.value = '';
                }
                this.option = null;
                flag = true;
                break;

            case 'Tab':
                this.close(true);
                if (this.listboxHasVisualFocus) {
                    if (this.option) {
                        this.setValue(this.option.textContent);
                    }
                }
                break;

            case 'Home':
                this.comboboxNode.setSelectionRange(0, 0);
                flag = true;
                break;

            case 'End':
                var length = this.comboboxNode.value.length;
                this.comboboxNode.setSelectionRange(length, length);
                flag = true;
                break;

            default:
                break;
        }

        if (flag) {
            event.stopPropagation();
            event.preventDefault();
        }
    }

    isPrintableCharacter(str) {
        return str.length === 1 && str.match(/\S| /);
    }

    onComboboxKeyUp(event) {
        var flag = false,
            option = null,
            char = event.key;

        if (this.isPrintableCharacter(char)) {
            this.filter += char;
        }

        // this is for the case when a selection in the textbox has been deleted
        if (this.comboboxNode.value.length < this.filter.length) {
            this.filter = this.comboboxNode.value;
            this.option = null;
            this.filterOptions();
        }

        if (event.key === 'Escape' || event.key === 'Esc') {
            return;
        }

        switch (event.key) {
            case 'Backspace':
                this.setVisualFocusCombobox();
                this.setCurrentOptionStyle(false);
                this.filter = this.comboboxNode.value;
                this.option = null;
                this.filterOptions();
                flag = true;
                break;

            case 'Left':
            case 'ArrowLeft':
            case 'Right':
            case 'ArrowRight':
            case 'Home':
            case 'End':
                if (this.isBoth) {
                    this.filter = this.comboboxNode.value;
                } else {
                    this.option = null;
                    this.setCurrentOptionStyle(false);
                }
                this.setVisualFocusCombobox();
                flag = true;
                break;

            default:
                if (this.isPrintableCharacter(char)) {
                    this.setVisualFocusCombobox();
                    this.setCurrentOptionStyle(false);
                    flag = true;

                    if (this.isList || this.isBoth) {
                        option = this.filterOptions();
                        if (option) {
                            if (
                                this.isClosed() &&
                                this.comboboxNode.value.length
                            ) {
                                this.open();
                            }

                            if (
                                this.getLowercaseContent(option).indexOf(
                                    this.comboboxNode.value.toLowerCase(),
                                ) === 0
                            ) {
                                this.option = option;
                                if (this.isBoth || this.listboxHasVisualFocus) {
                                    this.setCurrentOptionStyle(option);
                                    if (this.isBoth) {
                                        this.setOption(option);
                                    }
                                }
                            } else {
                                this.option = null;
                                this.setCurrentOptionStyle(false);
                            }
                        } else {
                            this.close();
                            this.option = null;
                            this.setActiveDescendant(false);
                        }
                    } else if (this.comboboxNode.value.length) {
                        this.open();
                    }
                }

                break;
        }

        if (flag) {
            event.stopPropagation();
            event.preventDefault();
        }
    }

    onComboboxClick() {
        if (this.isOpen()) {
            this.close(true);
        } else {
            this.open();
        }
    }

    onComboboxFocus() {
        this.filter = this.comboboxNode.value;
        this.filterOptions();
        this.setVisualFocusCombobox();
        this.option = null;
        this.setCurrentOptionStyle(null);
    }

    onComboboxBlur() {
        this.removeVisualFocusAll();
    }

    onBackgroundPointerUp(event) {
        if (
            !this.comboboxNode.contains(event.target) &&
            !this.listboxNode.contains(event.target) &&
            !this.buttonNode.contains(event.target)
        ) {
            this.comboboxHasVisualFocus = false;
            this.setCurrentOptionStyle(null);
            this.removeVisualFocusAll();
            setTimeout(this.close.bind(this, true), 300);
        }
    }

    onButtonClick() {
        if (this.isOpen()) {
            this.close(true);
        } else {
            this.open();
        }
        this.comboboxNode.focus();
        this.setVisualFocusCombobox();
    }

    /* Listbox Events */

    onListboxPointerover() {
        this.hasHover = true;
    }

    onListboxPointerout() {
        this.hasHover = false;
        setTimeout(this.close.bind(this, false), 300);
    }

    // Listbox Option Events

    onOptionClick(event) {
        this.comboboxNode.value = event.target.textContent;
        this.close(true);
    }

    onOptionPointerover() {
        this.hasHover = true;
        this.open();
    }

    onOptionPointerout() {
        this.hasHover = false;
        setTimeout(this.close.bind(this, false), 300);
    }
}

// Initialize combobox components
var comboboxes = document.querySelectorAll('.combobox-list');
for (var i = 0; i < comboboxes.length; i++) {
    var combobox = comboboxes[i];
    var comboboxNode = combobox.querySelector('input');
    var buttonNode = combobox.querySelector('button');
    var listboxNode = combobox.querySelector('[role="listbox"]');
    new ComboboxAutocomplete(comboboxNode, buttonNode, listboxNode);
}

loadCurrentSettings();
