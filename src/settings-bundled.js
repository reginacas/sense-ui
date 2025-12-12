/**
 * Settings Page Script - Bundled Version
 */

// Storage keys
const STORAGE_KEYS = {
    OPENAI_API_KEY: 'senseui_openai_key',
    GEMINI_API_KEY: 'senseui_gemini_key',
    SELECTED_PROVIDER: 'senseui_provider',
    USER_SETTINGS: 'senseui_settings'
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
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        await chrome.storage.local.set(sessionKey);
    }
    return `${extensionId}:${sessionKey.senseui_session_key}`;
}

async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const keyMaterial = await crypto.subtle.importKey(
        'raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
    );
    return await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
}

async function encryptData(plaintext) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const password = await getEncryptionPassword();
    const key = await deriveKey(password, salt);
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, data);
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
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
        
        const combined = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encryptedData = combined.slice(28);
        
        const password = await getEncryptionPassword();
        const key = await deriveKey(password, salt);
        const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, encryptedData);
        
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
        detailLevel: 'normal',
        downloadOption: 'all',
        contextInstructions: '',
        selectedProvider: 'openai'
    };
}

async function loadSettings() {
    const result = await chrome.storage.local.get([
        STORAGE_KEYS.SELECTED_PROVIDER,
        STORAGE_KEYS.USER_SETTINGS
    ]);
    const settings = result[STORAGE_KEYS.USER_SETTINGS] || getDefaultSettings();
    settings.selectedProvider = result[STORAGE_KEYS.SELECTED_PROVIDER] || 'openai';
    
    const openaiKey = await retrieveApiKey(STORAGE_KEYS.OPENAI_API_KEY);
    const geminiKey = await retrieveApiKey(STORAGE_KEYS.GEMINI_API_KEY);
    settings.hasOpenAIKey = !!openaiKey;
    settings.hasGeminiKey = !!geminiKey;
    
    return settings;
}

async function saveSettings(settings) {
    const { openaiApiKey, geminiApiKey, selectedProvider, ...otherSettings } = settings;
    
    if (selectedProvider) {
        await chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROVIDER]: selectedProvider });
    }
    if (openaiApiKey) {
        await storeApiKey(STORAGE_KEYS.OPENAI_API_KEY, openaiApiKey);
    }
    if (geminiApiKey) {
        await storeApiKey(STORAGE_KEYS.GEMINI_API_KEY, geminiApiKey);
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.USER_SETTINGS]: otherSettings });
}

function validateSettings(settings) {
    const errors = [];
    if (settings.openaiApiKey && !validateApiKeyFormat(settings.openaiApiKey, 'openai')) {
        errors.push('OpenAI API key format is invalid.');
    }
    if (settings.geminiApiKey && !validateApiKeyFormat(settings.geminiApiKey, 'gemini')) {
        errors.push('Gemini API key format is invalid.');
    }
    return { valid: errors.length === 0, errors };
}

async function clearApiKey(provider) {
    const keyName = provider === 'openai' ? STORAGE_KEYS.OPENAI_API_KEY : STORAGE_KEYS.GEMINI_API_KEY;
    await chrome.storage.local.remove(keyName);
}

async function getApiKeyStatus() {
    const openaiKey = await retrieveApiKey(STORAGE_KEYS.OPENAI_API_KEY);
    const geminiKey = await retrieveApiKey(STORAGE_KEYS.GEMINI_API_KEY);
    const result = await chrome.storage.local.get(STORAGE_KEYS.SELECTED_PROVIDER);
    return {
        hasOpenAI: !!openaiKey,
        hasGemini: !!geminiKey,
        selectedProvider: result[STORAGE_KEYS.SELECTED_PROVIDER] || 'openai'
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
const detailComprehensive = document.getElementById('detail-comprehensive');
const detailNormal = document.getElementById('detail-normal');
const detailConcise = document.getElementById('detail-concise');
const downloadAll = document.getElementById('download-all');
const downloadFavorites = document.getElementById('download-favorites');
const contextText = document.getElementById('context-text');

function updateDetailAria() {
    const radios = [detailComprehensive, detailNormal, detailConcise].filter(Boolean);
    radios.forEach(radio => {
        radio.setAttribute('aria-checked', radio.checked ? 'true' : 'false');
    });
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
}

function showStatus(message, isError = false) {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'error-message' : 'success-message';
        statusDiv.classList.remove('visually-hidden');
        setTimeout(() => statusDiv.classList.add('visually-hidden'), 5000);
    }
}

async function updateApiKeyStatus() {
    const status = await getApiKeyStatus();
    
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
}

async function loadCurrentSettings() {
    try {
        const settings = await loadSettings();
        
        if (settings.detailLevel === 'comprehensive') {
            detailComprehensive.checked = true;
        } else if (settings.detailLevel === 'concise') {
            detailConcise.checked = true;
        } else {
            detailNormal.checked = true;
        }
        updateDetailAria();
        
        if (settings.downloadOption === 'favorites') {
            downloadFavorites.checked = true;
        } else {
            downloadAll.checked = true;
        }
        
        if (settings.contextInstructions) {
            contextText.value = settings.contextInstructions;
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
        toggleApiKeyFields(); // Show/hide fields based on selected provider
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
        
        const detailLevel = formData.get('detail');
        if (detailLevel) settings.detailLevel = detailLevel;
        
        const downloadOption = formData.get('download');
        if (downloadOption) settings.downloadOption = downloadOption;
        
        settings.contextInstructions = formData.get('context') || '';
        settings.selectedProvider = formData.get('provider') || 'openai';
        
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
            showStatus(`Validation errors: ${validation.errors.join(', ')}`, true);
            return;
        }
        
        await saveSettings(settings);
        
        openaiKeyInput.value = '';
        geminiKeyInput.value = '';
        
        await updateApiKeyStatus();
        showStatus('Settings saved successfully!');
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

// Keep aria-checked in sync for detail level radios
[detailComprehensive, detailNormal, detailConcise]
    .filter(Boolean)
    .forEach(radio => radio.addEventListener('change', updateDetailAria));

loadCurrentSettings();
