/**
 * SenseUI Export/Import Utilities
 * Provides serialization, validation, and deserialization for chats and projects.
 */

function generateProjectId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeProject(rawProject, idGenerator = generateProjectId) {
    if (!rawProject || typeof rawProject !== 'object') return null;

    const name = String(rawProject.name || '').trim();
    if (!name) return null;

    return {
        id: rawProject.id ? String(rawProject.id) : idGenerator(),
        name,
        frameworks: rawProject.frameworks
            ? String(rawProject.frameworks).trim()
            : '',
        aesthetic: String(rawProject.aesthetic || '').trim(),
        purpose: String(rawProject.purpose || '').trim(),
        createdAt: rawProject.createdAt || new Date().toISOString(),
    };
}

function extractImportedProjects(parsed, idGenerator = generateProjectId) {
    if (!parsed) return null;

    let rawList = null;
    if (Array.isArray(parsed)) {
        rawList = parsed;
    } else if (typeof parsed === 'object') {
        if (Array.isArray(parsed.projects)) {
            rawList = parsed.projects;
        } else if (parsed.project && typeof parsed.project === 'object') {
            rawList = [parsed.project];
        } else if (parsed.name && typeof parsed.name === 'string') {
            rawList = [parsed];
        }
    }

    if (!rawList) return null;

    return rawList.map((p) => normalizeProject(p, idGenerator)).filter(Boolean);
}

function mergeProjects(
    existingProjects = [],
    importedProjects = [],
    idGenerator = generateProjectId,
) {
    const existingIds = new Set(existingProjects.map((p) => p.id));
    const normalizedImported = (importedProjects || [])
        .map((p) => normalizeProject(p, idGenerator))
        .filter(Boolean)
        .map((p) => {
            if (existingIds.has(p.id)) {
                return { ...p, id: idGenerator() };
            }
            return p;
        });

    return [...existingProjects, ...normalizedImported];
}

function buildHtmlFromMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return '';

    return messages
        .map((msg, index) => {
            const role = msg.role || 'assistant';
            const textContent = msg.content || msg.text || '';
            const htmlContent = msg.html || `<p>${escapeHtml(textContent)}</p>`;

            if (role === 'user') {
                return `<div class="user-message"><h2>You said:</h2><p>${escapeHtml(textContent)}</p></div>`;
            } else if (role === 'system') {
                return `<div class="system-response">${htmlContent}</div>`;
            } else {
                const responseId = `imported-response-${Date.now()}-${index}`;
                return `<div role="article"><div class="system-response"><div id="${responseId}">${htmlContent}</div><div class="response-actions"><button type="button" class="btn-tertiary copy-button" data-target="${responseId}">Copy to clipboard</button><button type="button" class="btn-tertiary download-button" data-target="${responseId}">Download message</button></div></div></div>`;
            }
        })
        .join('');
}

function extractStructuredMessages(container) {
    const messages = [];
    if (!container || !container.children) return messages;

    for (const child of container.children) {
        if (child.classList?.contains('user-message')) {
            const p = child.querySelector ? child.querySelector('p') : null;
            messages.push({
                role: 'user',
                content: p ? p.textContent.trim() : child.textContent.trim(),
            });
        } else if (child.getAttribute?.('role') === 'article') {
            const clone = child.cloneNode ? child.cloneNode(true) : child;
            if (clone.querySelectorAll) {
                const actions = clone.querySelectorAll(
                    '.response-actions, .copy-button, .download-button',
                );
                actions.forEach((a) => a.remove());
            }
            messages.push({
                role: 'assistant',
                content: clone.textContent ? clone.textContent.trim() : '',
                html: clone.innerHTML ? clone.innerHTML.trim() : '',
            });
        } else if (child.classList?.contains('system-response')) {
            if (child.classList.contains('loading-response')) continue;
            const clone = child.cloneNode ? child.cloneNode(true) : child;
            if (clone.querySelectorAll) {
                const actions = clone.querySelectorAll(
                    '.response-actions, .copy-button, .download-button',
                );
                actions.forEach((a) => a.remove());
            }
            messages.push({
                role: 'system',
                content: clone.textContent ? clone.textContent.trim() : '',
                html: clone.innerHTML ? clone.innerHTML.trim() : '',
            });
        }
    }
    return messages;
}

function formatChatExport({
    page = {},
    project = null,
    chatHistory = '',
    messages = [],
    screenshots = {},
}) {
    return {
        version: 1,
        type: 'senseui_chat',
        exportedAt: new Date().toISOString(),
        page: {
            title: page.title || 'Unknown title',
            url: page.url || 'Unknown page',
        },
        project: project || null,
        chatHistory: chatHistory || '',
        messages: Array.isArray(messages) ? messages : [],
        screenshots: {
            before: screenshots.before || null,
            beforeUrl: screenshots.beforeUrl || null,
            beforeTitle: screenshots.beforeTitle || null,
            after: screenshots.after || null,
            afterUrl: screenshots.afterUrl || null,
            afterTitle: screenshots.afterTitle || null,
        },
    };
}

function formatProjectsExport(projects = []) {
    return {
        version: 1,
        type: 'senseui_projects',
        exportedAt: new Date().toISOString(),
        projects: Array.isArray(projects) ? projects : [],
    };
}

function formatDataExport({ projects = [], activeProject = null, chat = {} }) {
    return {
        version: 1,
        type: 'senseui_data',
        exportedAt: new Date().toISOString(),
        projects: Array.isArray(projects) ? projects : [],
        activeProject: activeProject || null,
        chat: {
            page: chat.page || null,
            project: chat.project || activeProject || null,
            chatHistory: chat.chatHistory || '',
            messages: Array.isArray(chat.messages) ? chat.messages : [],
            screenshots: chat.screenshots || {},
        },
    };
}

function validateAndExtractImportData(parsed, idGenerator = generateProjectId) {
    if (!parsed || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
        return {
            isValid: false,
            error: 'Invalid JSON content. Expected an object or array.',
        };
    }

    const projects = extractImportedProjects(parsed, idGenerator);

    let chatHistory = null;
    let messages = null;
    let screenshots = null;
    let activeProject = null;

    if (typeof parsed.chatHistory === 'string' && parsed.chatHistory.trim()) {
        chatHistory = parsed.chatHistory;
    } else if (typeof parsed.chatHtml === 'string' && parsed.chatHtml.trim()) {
        chatHistory = parsed.chatHtml;
    } else if (
        parsed.chat &&
        typeof parsed.chat === 'object' &&
        typeof parsed.chat.chatHistory === 'string' &&
        parsed.chat.chatHistory.trim()
    ) {
        chatHistory = parsed.chat.chatHistory;
    } else if (
        parsed.chat &&
        typeof parsed.chat === 'object' &&
        typeof parsed.chat.chatHtml === 'string' &&
        parsed.chat.chatHtml.trim()
    ) {
        chatHistory = parsed.chat.chatHtml;
    }

    if (Array.isArray(parsed.messages)) {
        messages = parsed.messages;
    } else if (parsed.chat && Array.isArray(parsed.chat.messages)) {
        messages = parsed.chat.messages;
    }

    if (!chatHistory && messages && messages.length > 0) {
        chatHistory = buildHtmlFromMessages(messages);
    }

    if (parsed.screenshots && typeof parsed.screenshots === 'object') {
        screenshots = parsed.screenshots;
    } else if (
        parsed.chat &&
        parsed.chat.screenshots &&
        typeof parsed.chat.screenshots === 'object'
    ) {
        screenshots = parsed.chat.screenshots;
    }

    if (parsed.activeProject && typeof parsed.activeProject === 'object') {
        activeProject = normalizeProject(parsed.activeProject, idGenerator);
    } else if (parsed.project && typeof parsed.project === 'object') {
        activeProject = normalizeProject(parsed.project, idGenerator);
    } else if (
        parsed.chat &&
        parsed.chat.project &&
        typeof parsed.chat.project === 'object'
    ) {
        activeProject = normalizeProject(parsed.chat.project, idGenerator);
    }

    const hasProjects = Array.isArray(projects) && projects.length > 0;
    const hasChat =
        typeof chatHistory === 'string' && chatHistory.trim().length > 0;

    if (!hasProjects && !hasChat) {
        return {
            isValid: false,
            error: 'No recognizable chat history or project data found in file.',
        };
    }

    return {
        isValid: true,
        hasProjects,
        hasChat,
        projects: hasProjects ? projects : [],
        activeProject,
        chatHistory: hasChat ? chatHistory : '',
        messages: Array.isArray(messages) ? messages : [],
        screenshots: screenshots || null,
    };
}

// Support Node.js testing environments while maintaining browser script compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateProjectId,
        escapeHtml,
        normalizeProject,
        extractImportedProjects,
        mergeProjects,
        buildHtmlFromMessages,
        extractStructuredMessages,
        formatChatExport,
        formatProjectsExport,
        formatDataExport,
        validateAndExtractImportData,
    };
}
