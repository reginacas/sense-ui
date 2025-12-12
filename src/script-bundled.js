/**
 * SenseUI Main Script - Bundled Version
 * This file contains all functionality needed for the popup to work
 * without requiring ES6 module imports
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    API: {
        OPENAI: {
            ENDPOINT: 'https://api.openai.com/v1/chat/completions',
            MODEL: 'gpt-4o-mini',
            MAX_TOKENS: 2000,
            TEMPERATURE: 0.3
        },
        GEMINI: {
            ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models',
            // Using gemini-flash-latest - automatically points to the latest stable Flash model
            // This alias is updated by Google when new versions are released (with 2 weeks notice)
            MODEL: 'gemini-flash-latest',
            MAX_TOKENS: 4000,
            TEMPERATURE: 0.3
        }
    },
    STORAGE_KEYS: {
        OPENAI_API_KEY: 'senseui_openai_key',
        GEMINI_API_KEY: 'senseui_gemini_key',
        SELECTED_PROVIDER: 'senseui_provider',
        USER_SETTINGS: 'senseui_settings',
        CHAT_HISTORY: 'senseui_chat_history'
    },
    PROMPTS: {
        SYSTEM: `You are a web design assistant helping a blind developer analyze the current webpage. Answer their questions clearly and concisely based on the screenshot, HTML, and CSS provided.

FORMATTING RULES:
- NEVER use HTML tags in your response (e.g., don't write "<h1>" or "<div>")
- When referring to HTML elements, use plain text: "h1 element", "div with class container", "submit button"
- Use markdown for formatting: ### for headings, #### for subheadings, - for lists
- Do NOT use bold (**text**), italic formatting or emojis
- Convert all RGB colors to hex format and mention them by name first and hex code second (e.g., "blue (#0000FF)")

CSS ANALYSIS RULES:
- ONLY report CSS properties that are actually applied and visible in the screenshot
- Ignore strikethrough/overridden CSS rules
- When describing an element's appearance, verify it matches what you see in the screenshot
- If CSS and screenshot don't match, trust the screenshot
- When mentioning sizes or colors, quote the actual value you see (e.g., "h1 font-size: 20px" or "heading color: #123456") and avoid recommending a change that already meets the guidance
- If you cannot find a value in the provided CSS or screenshot, say you cannot verify it instead of guessing

KEY PRINCIPLES:
- Be direct and concise when asked short, simple questions
- Prioritize accessibility (WCAG 2.2) and usability when giving design advice
- Only report what you can verify from the provided HTML, CSS, or screenshot
- Do not offer code unless specifically requested
- If information is uncertain or not visible, state the limitation clearly`,

        DESCRIBE: `Provide a spatial visual design description of what's currently visible using the screenshot taken. Help create a mental map of the layout using directional and positional language. Use terminology familiar to programmers. Be specific but brief.

IMPORTANT RULES:
1. You are analyzing a SCREENSHOT of the current viewport - this may show any part of the page (top, middle, bottom, or footer). DO NOT assume this is the "hero section" unless you can clearly see it's the top of the page with the main header/navigation.

2. ONLY report measurements you can verify from the provided CSS or HTML:
   - If font sizes/spacing values are in the CSS, cite them
   - If NOT in the CSS, describe relatively ("large heading", "small body text", "tight spacing") - do NOT make up px/rem values
   - For colors, extract from CSS or estimate from screenshot (but note if estimated)

3. Format all bullet points as complete single-line statements. NEVER create nested or indented bullets. A bullet point should never end with a colon (":")

4. Fully describe each element and section with all its details before moving to the next section. Never return to a previously described element or section.

RESPONSE STRUCTURE:
Start with an h3 heading: "Visual Design Description of [Website Name]"
Then include these h4 subsections:

#### Overall Aesthetic and Mood
What's the immediate visual impression? Describe the aesthetic (minimalist/professional/modern/traditional/playful/corporate/etc.) and the overall mood and feeling it creates.

#### Spatial Layout Description
Describe the all the elements of the layout from top to bottom, using clear positional language:

- Start with what's at the very top (header/navigation area)
- For each element, specify: position (top-left, top-center, top-right, etc.), color (hex codes), size, content, alignment of text/images, and spacing
- Use directional language: "directly below", "to the right of", "aligned with", "centered between"
- Describe spacing between elements: "with large spacing below" or "tightly grouped with"
- Note alignment: left-aligned, centered, right-aligned
- Continue down the page until you reach the bottom of the visible screenshot

End with: "Want me to analyze a specific element in more detail?"`,

        ISSUES: `Identify design and accessibility issues on the current webpage and provide actionable solutions.

IMPORTANT: Only report issues you can actually verify from the HTML, CSS, and screenshot. If the page has no significant issues, say so - do NOT invent problems that don't exist. You may provide recommendations for improvement even when no critical issues are present.

CRITICAL FORMATTING RULES:
- NEVER write HTML tags in your response (e.g., don't write "<h1>" or "<div>" or "<button>")
- Instead, refer to elements as: "the h1 element", "the main heading", "div with class hero", "the submit button"
- When citing CSS selectors, write them as: .class-name or #id-name (without angle brackets)
- Use markdown for your response structure: ### for section headings, - for bullet lists
- Convert all RGB colors to hex format (e.g., rgb(255, 87, 51) → #FF5733)

ANALYZE FOR:
- Visual hierarchy problems (unclear heading structure, poor emphasis)
- Layout issues (misalignments, inconsistent spacing, overflow problems)
- Readability concerns (font sizes, line heights, text density, line lengths, text alignments, low contrast with background)
- Inconsistencies (spacing, font sizes, color scheme deviations)
- Accessibility violations (contrast ratios - verify from CSS colors)

REQUIREMENTS:
- Only report issues you can verify from the provided HTML/CSS/ or screenshot
- Cite specific CSS selectors and current values
- Provide exact recommended values (not generic suggestions)

HALLUCINATION GUARDRAILS:
- Do not suggest changing a font size, color, or spacing if the current value already meets or exceeds your recommendation
- Quote the exact value you are basing the suggestion on (e.g., ".hero-title font-size: 20px") before recommending a change
- If you cannot find a value in the provided CSS or screenshot, explicitly say "value not found" and do not guess

EXAMPLES OF BAD vs GOOD SOLUTIONS:
BAD: "Use a bolder color" (vague, no actionable code)
GOOD: "Change .hero-title color from #999999 to #333333 for better contrast"

BAD: "The spacing feels cramped" (subjective, no specifics)
GOOD: "Increase .card-content padding from 8px to 16px for improved readability"

BAD: "Make the button more prominent" (unclear what to change)
GOOD: "Increase .primary-btn font-size from 14px to 16px and add padding: 12px 24px". `

    },

    LIMITS: {
        MAX_HTML_LENGTH: 100000,
        MAX_CSS_LENGTH: 50000,
        SCREENSHOT_QUALITY: 0.8,
        SCREENSHOT_FORMAT: 'jpeg'
    }
};

// Parse command from user input
function parseCommand(userInput) {
    const trimmed = userInput.trim();
    if (trimmed.startsWith('/describe')) {
        return { command: '/describe', text: trimmed.replace('/describe', '').trim() };
    }
    if (trimmed.startsWith('/issues')) {
        return { command: '/issues', text: trimmed.replace('/issues', '').trim() };
    }
    return { command: null, text: trimmed };
}

// Get prompt for command
function getPromptForCommand(command) {
    switch (command) {
        case '/describe':
            return CONFIG.PROMPTS.DESCRIBE;
        case '/issues':
            return CONFIG.PROMPTS.ISSUES;
        default:
            return ''; // No additional prompt - just use SYSTEM
    }
}

// Detail level prompts for tailoring verbosity
const DETAIL_PROMPTS = {
    concise: 'Provide straightforward, brief answers without detailed explanations. Focus on direct, actionable feedback suitable for someone who needs speed.',
    normal: 'Provide balanced feedback with context and rationale. Explain issues and design suggestions clearly with short reasoning.',
    comprehensive: 'Provide detailed explanations with learning opportunities about visual design and accessibility best practices. Include the reasoning behind each design suggestion and flagged issue so the user can learn.'
};

function getDetailPrompt(level) {
    return DETAIL_PROMPTS[level] || DETAIL_PROMPTS.normal;
}

async function getUserSettings() {
    const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.USER_SETTINGS);
    const settings = result[CONFIG.STORAGE_KEYS.USER_SETTINGS] || {};
    return {
        detailLevel: settings.detailLevel || 'normal',
        downloadOption: settings.downloadOption || 'all',
        contextInstructions: settings.contextInstructions || ''
    };
}

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
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv }, key, encryptedData
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedData);
    } catch (error) {
        console.error('Error retrieving API key:', error);
        return null;
    }
}

// ============================================================================
// RESPONSE FORMATTER
// ============================================================================
function markdownToHTML(markdown) {
    if (!markdown) return '';

    console.log('🔍 ORIGINAL MARKDOWN:', markdown.substring(0, 200));
    let html = markdown;

    // Process headings FIRST (before anything else that might interfere)
    // Using \s* to allow optional spaces after # and .* to match the rest of the line
    html = html.replace(/^####\s*(.*)$/gim, '<h4>$1</h4>');
    html = html.replace(/^###\s*(.*)$/gim, '<h3>$1</h3>');
    html = html.replace(/^##\s*(.*)$/gim, '<h2>$1</h2>');
    html = html.replace(/^#\s*(.*)$/gim, '<h2>$1</h2>');

    console.log('🔍 AFTER HEADING CONVERSION:', html.substring(0, 200));

    // Process lists
    html = html.replace(/^(?!<h[1-6]>)\s*[-*]\s+(.+)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Remove bold/strong markdown (no semantic value for screen readers - just visual)
    html = html.replace(/\*\*(.+?)\*\*/g, '$1');
    html = html.replace(/__(.+?)__/g, '$1');

    console.log('🔍 AFTER BOLD REMOVAL:', html.substring(0, 200));

    // Process italic/emphasis
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Process links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Split into lines and wrap paragraphs intelligently
    const lines = html.split('\n');
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) continue;

        // Don't wrap headings or lists in paragraphs
        if (line.startsWith('<h') || line.startsWith('<li>') || line.startsWith('<ul>') || line.startsWith('</ul>')) {
            processedLines.push(line);
        } else {
            // Wrap plain text in paragraph tags
            processedLines.push(`<p>${line}</p>`);
        }
    }

    html = processedLines.join('\n');

    console.log('🔍 FINAL HTML:', html.substring(0, 200));
    return html;
}

function formatResponse(responseText, options = {}) {
    const {
        includeHeading = true,
        headingText = 'SenseUI Response',
        addCopyButton = true,
        addFavoriteButton = true,
        responseId = `response-${Date.now()}`
    } = options;

    const contentHTML = markdownToHTML(responseText);
    let html = '<div class="system-response" role="article">';

    if (includeHeading) {
        html += `<h2>${headingText}</h2>`;
    }

    html += `<div class="response-content" id="${responseId}">${contentHTML}</div>`;
    html += '<div class="response-actions">';

    if (addCopyButton) {
        html += `<button class="copy-button" data-target="${responseId}" aria-label="Copy response to clipboard">
            Copy to clipboard
        </button>`;
    }

    if (addFavoriteButton) {
        html += `<button class="favorite-button" data-target="${responseId}" aria-label="Mark this response as favorite">
            Mark as favorite
        </button>`;
    }

    html += '</div></div>';
    return html;
}

function attachResponseActions(container) {
    const copyButtons = container.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const targetId = button.getAttribute('data-target');
            const content = document.getElementById(targetId);
            if (content) {
                const text = content.innerText || content.textContent;
                try {
                    await navigator.clipboard.writeText(text);
                    button.textContent = 'Copied!';
                    setTimeout(() => { button.textContent = 'Copy to clipboard'; }, 2000);
                } catch (err) {
                    console.error('Failed to copy:', err);
                }
            }
        });
    });

    const favoriteButtons = container.querySelectorAll('.favorite-button');
    favoriteButtons.forEach(button => {
        button.addEventListener('click', () => {
            const isFavorited = button.classList.toggle('favorited');
            button.textContent = isFavorited ? 'Remove from favorites' : 'Mark as favorite';
        });
    });
}

// ============================================================================
// SCREENSHOT CAPTURE
// ============================================================================
async function captureScreenshot() {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab) throw new Error('No active tab found');

        // Capture whatever is currently visible in the viewport
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
            format: CONFIG.LIMITS.SCREENSHOT_FORMAT,
            quality: Math.round(CONFIG.LIMITS.SCREENSHOT_QUALITY * 100)
        });

        return dataUrl;
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        return null;
    }
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================
const contentExtractorCode = `
(function() {
    function extractHTML() {
        return document.documentElement.outerHTML;
    }

    function extractCSS() {
        let cssContent = '';
        const styleSheets = Array.from(document.styleSheets);
        
        for (const sheet of styleSheets) {
            try {
                if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
                    cssContent += \`/* External stylesheet: \${sheet.href} - Unable to access due to CORS */\\n\\n\`;
                    continue;
                }
                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                for (const rule of rules) {
                    cssContent += rule.cssText + '\\n';
                }
            } catch (e) {
                console.warn('Could not access stylesheet:', sheet.href, e);
            }
        }
        return cssContent;
    }

    function extractMetadata() {
        return {
            title: document.title,
            url: window.location.href,
            viewport: { width: window.innerWidth, height: window.innerHeight },
            lang: document.documentElement.lang || 'unknown',
            charset: document.characterSet,
            description: document.querySelector('meta[name="description"]')?.content || ''
        };
    }

    return {
        html: extractHTML(),
        css: extractCSS(),
        metadata: extractMetadata()
    };
})();
`;

async function extractPageContent() {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab) return null;

        const [result] = await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: function () {
                function extractHTML() {
                    return document.documentElement.outerHTML;
                }
                function extractCSS() {
                    let cssContent = '';
                    const styleSheets = Array.from(document.styleSheets);
                    for (const sheet of styleSheets) {
                        try {
                            if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
                                cssContent += `/* External stylesheet: ${sheet.href} */\\n`;
                                continue;
                            }
                            const rules = Array.from(sheet.cssRules || sheet.rules || []);
                            for (const rule of rules) {
                                cssContent += rule.cssText + '\\n';
                            }
                        } catch (e) { }
                    }
                    return cssContent;
                }
                function extractMetadata() {
                    return {
                        title: document.title,
                        url: window.location.href,
                        viewport: { width: window.innerWidth, height: window.innerHeight }
                    };
                }
                return {
                    html: extractHTML().substring(0, 100000),
                    css: extractCSS().substring(0, 50000),
                    metadata: extractMetadata()
                };
            }
        });

        return result?.result || null;
    } catch (error) {
        console.error('Error extracting content:', error);
        return null;
    }
}

// ============================================================================
// LLM CLIENT
// ============================================================================

// Helper function to list available Gemini models
async function listGeminiModels(apiKey) {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );
        if (!response.ok) {
            console.error('Failed to list models:', response.status);
            return [];
        }
        const data = await response.json();
        console.log('Available Gemini models:', data.models?.map(m => m.name));
        return data.models || [];
    } catch (error) {
        console.error('Error listing models:', error);
        return [];
    }
}

async function sendToLLM(userMessage, context, systemPrompt, provider) {
    const apiKey = await retrieveApiKey(
        provider === 'openai' ? CONFIG.STORAGE_KEYS.OPENAI_API_KEY : CONFIG.STORAGE_KEYS.GEMINI_API_KEY
    );

    if (!apiKey) {
        throw new Error('API key not configured. Please add an API key in Settings.');
    }

    // Build context text
    let contextText = '';
    if (context.metadata) {
        contextText += `\\n\\nPage: ${context.metadata.title} (${context.metadata.url})`;
    }
    if (context.html) {
        contextText += `\\n\\nHTML:\\n${context.html.substring(0, 30000)}`;
    }
    if (context.css) {
        contextText += `\\n\\nCSS:\\n${context.css.substring(0, 30000)}`;
    }

    const fullMessage = `${userMessage}${contextText}`;

    if (provider === 'openai') {
        return await sendToOpenAI(apiKey, systemPrompt, fullMessage, context.screenshot);
    } else {
        return await sendToGemini(apiKey, systemPrompt, fullMessage, context.screenshot);
    }
}

async function sendToOpenAI(apiKey, systemPrompt, userMessage, screenshot) {
    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    if (screenshot) {
        messages.push({
            role: 'user',
            content: [
                { type: 'text', text: userMessage },
                { type: 'image_url', image_url: { url: screenshot, detail: 'high' } }
            ]
        });
    } else {
        messages.push({ role: 'user', content: userMessage });
    }

    const response = await fetch(CONFIG.API.OPENAI.ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: CONFIG.API.OPENAI.MODEL,
            messages: messages,
            temperature: CONFIG.API.OPENAI.TEMPERATURE,
            max_tokens: CONFIG.API.OPENAI.MAX_TOKENS
        }),
        signal: currentAbortController?.signal
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    // OpenAI returns the actual model used in data.model
    const actualModel = data.model || CONFIG.API.OPENAI.MODEL;
    console.log(`✅ Response generated using OpenAI model: ${actualModel}`);
    return data.choices[0].message.content;
}

async function sendToGemini(apiKey, systemPrompt, userMessage, screenshot) {
    const endpoint = `${CONFIG.API.GEMINI.ENDPOINT}/${CONFIG.API.GEMINI.MODEL}:generateContent?key=${apiKey}`;

    // Combine system prompt with user message for Gemini
    const fullMessage = `${systemPrompt}\n\n${userMessage}`;
    const parts = [{ text: fullMessage }];

    if (screenshot) {
        const matches = screenshot.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            parts.push({
                inlineData: { mimeType: matches[1], data: matches[2] }
            });
        }
    }

    const requestBody = {
        contents: [{ role: 'user', parts: parts }],
        generationConfig: {
            temperature: CONFIG.API.GEMINI.TEMPERATURE,
            maxOutputTokens: CONFIG.API.GEMINI.MAX_TOKENS
        }
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: currentAbortController?.signal
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `Gemini API error: ${response.status}`;
        console.error('Gemini API Error:', errorData);

        // If model not found, list available models
        if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
            console.log('Fetching available models for your API key...');
            const models = await listGeminiModels(apiKey);
            console.log('Try changing the MODEL in script-bundled.js to one of these:',
                models.map(m => m.name.replace('models/', '')));
            throw new Error(`${errorMessage}\n\nCheck the console to see available models for your API key.`);
        }

        throw new Error(errorMessage);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('Invalid Gemini response:', data);
        throw new Error('Invalid response from Gemini API');
    }

    // Check if response was cut off due to safety filters or finish reason
    const candidate = data.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('⚠️ Gemini response ended early. Finish reason:', candidate.finishReason);
        if (candidate.finishReason === 'MAX_TOKENS') {
            console.warn('⚠️ Response hit token limit. Consider increasing MAX_TOKENS.');
        } else if (candidate.finishReason === 'SAFETY') {
            console.warn('⚠️ Response blocked by safety filters:', candidate.safetyRatings);
        }
    }

    // Log which model was used - data.usageMetadata may contain actual model info
    const actualModel = data.modelVersion || CONFIG.API.GEMINI.MODEL;
    if (CONFIG.API.GEMINI.MODEL === 'gemini-flash-latest') {
        console.log(`✅ Response generated using Gemini model: ${CONFIG.API.GEMINI.MODEL} (currently resolves to: ${actualModel})`);
    } else {
        console.log(`✅ Response generated using Gemini model: ${actualModel}`);
    }

    // Log token usage if available
    if (data.usageMetadata) {
        console.log(`📊 Tokens used - Input: ${data.usageMetadata.promptTokenCount}, Output: ${data.usageMetadata.candidatesTokenCount}, Total: ${data.usageMetadata.totalTokenCount}`);
    }

    // Safely extract text from content parts
    const contentParts = candidate.content.parts;
    if (!contentParts || !Array.isArray(contentParts) || contentParts.length === 0) {
        console.error('No text parts in Gemini response:', data);
        throw new Error('Gemini response has no content parts');
    }

    return contentParts.map(part => part.text || '').join('');
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================
async function capturePageContext() {
    const context = {};

    try {
        context.screenshot = await captureScreenshot();
        console.log('✅ Screenshot captured:', context.screenshot ? 'Yes' : 'No');
        announce('Screenshot captured');
    } catch (error) {
        console.error('Screenshot error:', error);
        announce('Screenshot capture failed');
    }

    try {
        const pageContent = await extractPageContent();
        if (pageContent) {
            context.html = pageContent.html;
            context.css = pageContent.css;
            context.metadata = pageContent.metadata;
            context.url = pageContent.metadata?.url;
            console.log('✅ Page content extracted:', pageContent.metadata?.title || 'Unknown page');
            announce('Page content extracted');
        }
    } catch (error) {
        console.error('Content extraction error:', error);
    }

    return context;
}

async function processUserInput(userInput, forceRefresh = false) {
    // Check if API key is configured
    const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.SELECTED_PROVIDER);
    const provider = result[CONFIG.STORAGE_KEYS.SELECTED_PROVIDER] || 'openai';

    // Load user settings for detail level
    const userSettings = await getUserSettings();
    const detailPrompt = getDetailPrompt(userSettings.detailLevel);
    console.log(`🧭 Detail level active: ${userSettings.detailLevel}`);

    // Parse command
    const { command, text } = parseCommand(userInput);
    const commandPrompt = command ? getPromptForCommand(command) : '';
    const systemPrompt = [CONFIG.PROMPTS.SYSTEM, detailPrompt, commandPrompt]
        .filter(Boolean)
        .join('\n\n');

    // Check if we need to capture or use cached context
    let context = {};

    // Get current page URL to detect navigation
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = activeTab?.url;

    // Use cached context if available and page hasn't changed
    if (!forceRefresh && cachedContext && currentPageUrl === pageUrl) {
        context = cachedContext;
        console.log('✅ Using cached page context');
        announce('Using cached page data');
    } else {
        // Capture fresh context
        console.log('📸 Capturing fresh page context...');
        context = await capturePageContext();
        cachedContext = context;
        currentPageUrl = pageUrl;
    }

    // Send to LLM
    const userMessage = text || userInput;
    const responseText = await sendToLLM(userMessage, context, systemPrompt, provider);

    // Format response
    const responseHTML = formatResponse(responseText, {
        headingText: 'SenseUI said:',
        includeHeading: true,
        addCopyButton: true,
        addFavoriteButton: true
    });

    const summary = responseText.substring(0, 150) + (responseText.length > 150 ? '...' : '');

    return {
        html: responseHTML,
        summary: `SenseUI said: ${summary}`,
        error: null
    };
}

// ============================================================================
// UI CODE
// ============================================================================
let sendButton;
let chatMessages;
let chatInput;
let commandDatalist;
let introSection;

// Cache for page context (captured once per session)
let cachedContext = null;
let currentPageUrl = null;

// Abort controller for cancelling requests
let currentAbortController = null;
let isGenerating = false;

// Save chat history to storage
async function saveChatHistory() {
    if (!chatMessages) return;
    const html = chatMessages.innerHTML;
    try {
        await chrome.storage.local.set({ [CONFIG.STORAGE_KEYS.CHAT_HISTORY]: html });
    } catch (error) {
        console.error('Failed to save chat history:', error);
    }
}

// Load chat history from storage
async function loadChatHistory() {
    if (!chatMessages) return;
    try {
        const result = await chrome.storage.local.get(CONFIG.STORAGE_KEYS.CHAT_HISTORY);
        const savedHtml = result[CONFIG.STORAGE_KEYS.CHAT_HISTORY];
        if (savedHtml) {
            chatMessages.innerHTML = savedHtml;
            // Reattach event listeners to restored messages
            attachResponseActions(chatMessages);
            // Hide intro if there are messages
            if (introSection && savedHtml.trim()) {
                introSection.style.display = 'none';
            }
            console.log('✅ Chat history restored');
        }
    } catch (error) {
        console.error('Failed to load chat history:', error);
    }
}

// Clear chat history from storage
async function clearChatHistory() {
    try {
        await chrome.storage.local.remove(CONFIG.STORAGE_KEYS.CHAT_HISTORY);
        console.log('✅ Chat history cleared from storage');
    } catch (error) {
        console.error('Failed to clear chat history:', error);
    }
}

function announce(msg) {
    const live = document.createElement('div');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.className = 'sr-only';
    live.textContent = msg;
    document.body.appendChild(live);
    setTimeout(() => live.remove(), 1500);
}

window.addEventListener('DOMContentLoaded', async () => {
    sendButton = document.querySelector('.chat-send');
    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    commandDatalist = document.getElementById('command-list');
    introSection = document.querySelector('.intro');

    // Load saved chat history
    await loadChatHistory();

    announce('SenseUI opened.');

    if (chatInput) {
        chatInput.focus();
        if (chatInput.hasAttribute('list')) {
            chatInput.removeAttribute('list');
        }
        setupCommandSuggestions();
        setupEventListeners();
    }
});

function setupCommandSuggestions() {
    if (!chatInput || !commandDatalist) return;

    const allOptions = Array.from(commandDatalist.querySelectorAll('option')).map(o => o.value);
    let lastAnnouncedCount = null;
    let previousValue = '';

    function countFilteredOptions(query) {
        if (!query) return allOptions.length;
        return allOptions.filter(opt => opt.toLowerCase().includes(query.toLowerCase())).length;
    }

    chatInput._resetCommandState = () => {
        if (chatInput.hasAttribute('list')) chatInput.removeAttribute('list');
        lastAnnouncedCount = null;
        previousValue = '';
    };

    chatInput.addEventListener('input', () => {
        const val = chatInput.value;
        if (val === '/' && previousValue === '') {
            chatInput.setAttribute('list', 'command-list');
            announce(`Commands menu available. ${allOptions.length} options.`);
            lastAnnouncedCount = allOptions.length;
        } else if (val.startsWith('/') && val.length > 1) {
            if (!chatInput.hasAttribute('list')) chatInput.setAttribute('list', 'command-list');
            const count = countFilteredOptions(val);
            if (count !== lastAnnouncedCount) {
                announce(count === 0 ? 'No matching commands' : count === 1 ? '1 command available' : `${count} commands available`);
                lastAnnouncedCount = count;
            }
        } else if (!val.startsWith('/') && previousValue.startsWith('/')) {
            if (chatInput.hasAttribute('list')) chatInput.removeAttribute('list');
            lastAnnouncedCount = null;
        }
        previousValue = val;
    });

    chatInput.addEventListener('change', () => {
        if (chatInput.value.startsWith('/')) announce(`Selected: ${chatInput.value}`);
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && chatInput.value.startsWith('/')) {
            announce('Commands closed');
            if (chatInput.hasAttribute('list')) chatInput.removeAttribute('list');
            lastAnnouncedCount = null;
        }
    });
}

function setupEventListeners() {
    if (sendButton) sendButton.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Download chat history button
    const downloadButton = document.getElementById('download-chat');
    if (downloadButton) {
        downloadButton.addEventListener('click', downloadChatHistory);
    }
}

function downloadChatHistory() {
    if (!chatMessages || !chatMessages.innerHTML.trim()) {
        announce('No chat history to download');
        return;
    }

    // Get plain text version of chat
    const chatText = chatMessages.innerText || chatMessages.textContent;

    // Get current page info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const pageUrl = tabs[0]?.url || 'Unknown page';
        const pageTitle = tabs[0]?.title || 'Unknown title';

        // Add metadata
        const timestamp = new Date().toISOString();
        const header = `SenseUI Chat History
Date: ${timestamp}
Page: ${pageTitle}
URL: ${pageUrl}
${'='.repeat(70)}

`;
        const fullText = header + chatText;

        // Create download
        const blob = new Blob([fullText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `senseui-chat-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        announce('Chat history downloaded');
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeElement = document.activeElement;
        if (activeElement &&
            (activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}, true);

async function sendMessage() {
    // If currently generating, stop it
    if (isGenerating && currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        isGenerating = false;

        // Reset button
        if (sendButton) {
            sendButton.textContent = 'Send';
            sendButton.setAttribute('aria-label', 'Send message');
        }

        announce('Generation stopped');
        return;
    }

    const userInput = chatInput.value.trim();
    if (!userInput) return;

    if (userInput === '/clear') {
        chatMessages.innerHTML = '';
        chatInput.value = '';
        if (typeof chatInput._resetCommandState === 'function') {
            chatInput._resetCommandState();
        }
        // Clear from storage
        await clearChatHistory();
        // Announce for screen readers
        announce('Chat cleared.');
        const systemEvent = document.createElement('div');
        systemEvent.className = 'system-response';
        systemEvent.innerHTML = `<h2>System</h2><p>Chat cleared.</p>`;
        chatMessages.appendChild(systemEvent);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        // Save the system message
        await saveChatHistory();
        return;
    }

    if (userInput === '/refresh') {
        chatInput.value = '';
        if (typeof chatInput._resetCommandState === 'function') {
            chatInput._resetCommandState();
        }

        // Clear cache and show loading message
        cachedContext = null;
        currentPageUrl = null;

        const refreshDiv = document.createElement('div');
        refreshDiv.className = 'system-response loading-response';
        refreshDiv.innerHTML = `<h2>System</h2><div class="loading-content"><p>Refreshing page data...</p></div>`;
        chatMessages.appendChild(refreshDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        announce('Refreshing page data...');

        try {
            // Capture fresh context
            await capturePageContext();
            refreshDiv.remove();

            const systemEvent = document.createElement('div');
            systemEvent.className = 'system-response';
            systemEvent.innerHTML = `<h2>System</h2><p>Page data refreshed successfully.</p>`;
            chatMessages.appendChild(systemEvent);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            announce('Page data refreshed.');
            // Save to history
            await saveChatHistory();
        } catch (error) {
            refreshDiv.remove();
            const errorDiv = document.createElement('div');
            errorDiv.className = 'system-response error-response';
            errorDiv.innerHTML = `<h2>Error</h2><p>Failed to refresh page data: ${error.message}</p>`;
            chatMessages.appendChild(errorDiv);
            announce('Refresh failed.');
            // Save error to history
            await saveChatHistory();
        }
        return;
    }

    if (introSection) introSection.style.display = 'none';

    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.innerHTML = `<h2>You said:</h2><p>${userInput}</p>`;
    chatMessages.appendChild(userMessage);

    // Check if this is a /describe command to show time estimate
    const isDescribeCommand = userInput.trim().startsWith('/describe');

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'system-response loading-response';
    const loadingMessage = isDescribeCommand
        ? '<p>Analyzing page... This may take 10-15 seconds.</p>'
        : '<p>Analyzing page...</p>';
    loadingDiv.innerHTML = `<h2>SenseUI</h2><div class="loading-content">${loadingMessage}</div>`;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    chatInput.value = '';
    if (typeof chatInput._resetCommandState === 'function') {
        chatInput._resetCommandState();
    }

    const announceMessage = isDescribeCommand
        ? 'Analyzing page... This may take 10 to 15 seconds.'
        : 'Analyzing page...';
    announce(announceMessage);

    // Create abort controller and update button
    currentAbortController = new AbortController();
    isGenerating = true;
    if (sendButton) {
        sendButton.textContent = 'Stop';
        sendButton.setAttribute('aria-label', 'Stop generation');
    }

    try {
        const response = await processUserInput(userInput);
        loadingDiv.remove();

        const responseDiv = document.createElement('div');
        responseDiv.setAttribute('role', 'article');
        responseDiv.innerHTML = response.html;
        chatMessages.appendChild(responseDiv);
        attachResponseActions(responseDiv);
        announce('Response received');

        // Save chat history after successful response
        await saveChatHistory();

    } catch (error) {
        console.error('Error:', error);
        loadingDiv.remove();

        // Check if it was aborted
        if (error.name === 'AbortError') {
            const abortDiv = document.createElement('div');
            abortDiv.className = 'system-response';
            abortDiv.innerHTML = `<h2>System</h2><p>Generation stopped by user.</p>`;
            chatMessages.appendChild(abortDiv);
            announce('Generation stopped');
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'system-response error-response';
            errorDiv.innerHTML = `
                <h2>Error</h2>
                <p>${error.message}</p>
                ${error.message.includes('API key') ?
                    '<p>Please visit <a href="settings.html">Settings</a> to configure your API key.</p>' :
                    '<p>Please try again or check the console for more details.</p>'}
            `;
            chatMessages.appendChild(errorDiv);
            announce(`Error: ${error.message}`);
        }

        // Save chat history even with errors
        await saveChatHistory();
    } finally {
        // Reset button and state
        currentAbortController = null;
        isGenerating = false;
        if (sendButton) {
            sendButton.textContent = 'Send';
            sendButton.setAttribute('aria-label', 'Send message');
        }
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}
