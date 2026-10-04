const test = require('node:test');
const assert = require('node:assert/strict');
const {
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
} = require('../src/export-import-utils.js');

test('generateProjectId returns a unique non-empty string', () => {
    const id1 = generateProjectId();
    const id2 = generateProjectId();
    assert.ok(id1 && typeof id1 === 'string');
    assert.ok(id2 && typeof id2 === 'string');
    assert.notEqual(id1, id2);
});

test('escapeHtml properly sanitizes text', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(
        escapeHtml('<div>"Hello" & \'World\'</div>'),
        '&lt;div&gt;&quot;Hello&quot; &amp; &#39;World&#39;&lt;/div&gt;',
    );
});

test('normalizeProject validates and normalizes project fields', () => {
    assert.equal(normalizeProject(null), null);
    assert.equal(normalizeProject({}), null);
    assert.equal(normalizeProject({ name: '   ' }), null);

    const fixedIdGen = () => 'test-id-123';
    const normalized = normalizeProject(
        {
            name: '  Portfolio Website  ',
            aesthetic: 'Minimalist',
            purpose: 'Showcase work',
            frameworks: 'React, CSS',
        },
        fixedIdGen,
    );

    assert.equal(normalized.id, 'test-id-123');
    assert.equal(normalized.name, 'Portfolio Website');
    assert.equal(normalized.aesthetic, 'Minimalist');
    assert.equal(normalized.purpose, 'Showcase work');
    assert.equal(normalized.frameworks, 'React, CSS');
    assert.ok(normalized.createdAt);
});

test('extractImportedProjects extracts projects from various formats', () => {
    assert.equal(extractImportedProjects(null), null);
    assert.equal(extractImportedProjects({}), null);

    // Array format
    const fromArray = extractImportedProjects([
        { name: 'Proj 1', aesthetic: 'Clean' },
        { name: 'Proj 2' },
    ]);
    assert.equal(fromArray.length, 2);
    assert.equal(fromArray[0].name, 'Proj 1');

    // Object with projects array
    const fromObj = extractImportedProjects({
        version: 1,
        projects: [{ name: 'Proj 3' }],
    });
    assert.equal(fromObj.length, 1);
    assert.equal(fromObj[0].name, 'Proj 3');

    // Object with single project
    const fromSingle = extractImportedProjects({
        project: { name: 'Proj 4' },
    });
    assert.equal(fromSingle.length, 1);
    assert.equal(fromSingle[0].name, 'Proj 4');

    // Standalone single project object
    const fromDirect = extractImportedProjects({
        name: 'Proj 5',
        aesthetic: 'Modern',
    });
    assert.equal(fromDirect.length, 1);
    assert.equal(fromDirect[0].name, 'Proj 5');
});

test('mergeProjects avoids ID collisions with existing projects', () => {
    const existing = [
        { id: 'id-1', name: 'Existing 1' },
        { id: 'id-2', name: 'Existing 2' },
    ];
    let counter = 100;
    const mockIdGen = () => `generated-${++counter}`;

    const imported = [
        { id: 'id-2', name: 'Imported Collision' },
        { id: 'id-3', name: 'Imported Unique' },
    ];

    const merged = mergeProjects(existing, imported, mockIdGen);
    assert.equal(merged.length, 4);
    assert.equal(merged[0].id, 'id-1');
    assert.equal(merged[1].id, 'id-2');
    assert.equal(merged[2].id, 'generated-101'); // collided, so regenerated
    assert.equal(merged[2].name, 'Imported Collision');
    assert.equal(merged[3].id, 'id-3');
    assert.equal(merged[3].name, 'Imported Unique');
});

test('buildHtmlFromMessages creates accessible HTML with action buttons', () => {
    const messages = [
        { role: 'user', content: 'What is the color contrast?' },
        { role: 'assistant', content: 'The contrast is 4.5:1.' },
        { role: 'system', content: 'Project selected' },
    ];

    const html = buildHtmlFromMessages(messages);
    assert.ok(html.includes('class="user-message"'));
    assert.ok(html.includes('What is the color contrast?'));
    assert.ok(html.includes('role="article"'));
    assert.ok(html.includes('copy-button'));
    assert.ok(html.includes('download-button'));
    assert.ok(html.includes('The contrast is 4.5:1.'));
    assert.ok(html.includes('class="system-response"'));
});

test('extractStructuredMessages parses mock DOM correctly', () => {
    // Mock minimal DOM container
    const mockContainer = {
        children: [
            {
                classList: {
                    contains: (c) => c === 'user-message',
                },
                querySelector: (sel) =>
                    sel === 'p' ? { textContent: 'Hello SenseUI' } : null,
                textContent: 'You said: Hello SenseUI',
            },
            {
                getAttribute: (attr) => (attr === 'role' ? 'article' : null),
                cloneNode: () => ({
                    querySelectorAll: () => [],
                    textContent: 'Here is the analysis',
                    innerHTML: '<p>Here is the analysis</p>',
                }),
            },
        ],
    };

    const messages = extractStructuredMessages(mockContainer);
    assert.equal(messages.length, 2);
    assert.equal(messages[0].role, 'user');
    assert.equal(messages[0].content, 'Hello SenseUI');
    assert.equal(messages[1].role, 'assistant');
    assert.equal(messages[1].content, 'Here is the analysis');
});

test('formatChatExport generates correct JSON structure', () => {
    const exported = formatChatExport({
        page: { title: 'Test Page', url: 'https://example.com' },
        project: { name: 'Test Proj' },
        chatHistory: '<p>Chat history</p>',
        messages: [{ role: 'user', content: 'Question' }],
        screenshots: { before: 'data:image/png;base64,123' },
    });

    assert.equal(exported.version, 1);
    assert.equal(exported.type, 'senseui_chat');
    assert.equal(exported.page.title, 'Test Page');
    assert.equal(exported.page.url, 'https://example.com');
    assert.equal(exported.project.name, 'Test Proj');
    assert.equal(exported.chatHistory, '<p>Chat history</p>');
    assert.equal(exported.messages.length, 1);
    assert.equal(exported.screenshots.before, 'data:image/png;base64,123');
    assert.ok(exported.exportedAt);
});

test('formatProjectsExport generates correct JSON structure', () => {
    const projects = [{ id: '1', name: 'Alpha' }];
    const exported = formatProjectsExport(projects);

    assert.equal(exported.version, 1);
    assert.equal(exported.type, 'senseui_projects');
    assert.equal(exported.projects.length, 1);
    assert.equal(exported.projects[0].name, 'Alpha');
    assert.ok(exported.exportedAt);
});

test('formatDataExport generates combined JSON structure', () => {
    const exported = formatDataExport({
        projects: [{ name: 'Project X' }],
        activeProject: { name: 'Project X' },
        chat: { chatHistory: '<p>Conversation</p>' },
    });

    assert.equal(exported.version, 1);
    assert.equal(exported.type, 'senseui_data');
    assert.equal(exported.projects.length, 1);
    assert.equal(exported.activeProject.name, 'Project X');
    assert.equal(exported.chat.chatHistory, '<p>Conversation</p>');
    assert.ok(exported.exportedAt);
});

test('validateAndExtractImportData validates chat, projects, and combined exports', () => {
    // Invalid
    assert.equal(validateAndExtractImportData(null).isValid, false);
    assert.equal(validateAndExtractImportData({}).isValid, false);
    assert.equal(
        validateAndExtractImportData({ someRandomField: 123 }).isValid,
        false,
    );

    // Chat export
    const chatExport = formatChatExport({
        page: { title: 'Doc' },
        chatHistory: '<div class="user-message"><p>Hi</p></div>',
    });
    const chatResult = validateAndExtractImportData(chatExport);
    assert.equal(chatResult.isValid, true);
    assert.equal(chatResult.hasChat, true);
    assert.ok(chatResult.chatHistory.includes('Hi'));

    // Projects export
    const projectsExport = formatProjectsExport([{ name: 'Test Proj' }]);
    const projResult = validateAndExtractImportData(projectsExport);
    assert.equal(projResult.isValid, true);
    assert.equal(projResult.hasProjects, true);
    assert.equal(projResult.projects.length, 1);

    // Combined export
    const combinedExport = formatDataExport({
        projects: [{ name: 'Proj A' }],
        chat: { chatHistory: '<div>Chat</div>' },
    });
    const combinedResult = validateAndExtractImportData(combinedExport);
    assert.equal(combinedResult.isValid, true);
    assert.equal(combinedResult.hasProjects, true);
    assert.equal(combinedResult.hasChat, true);
    assert.equal(combinedResult.projects[0].name, 'Proj A');
    assert.equal(combinedResult.chatHistory, '<div>Chat</div>');

    // Messages-only format (auto-builds chatHistory)
    const messagesOnly = {
        messages: [{ role: 'user', content: 'What about layout?' }],
    };
    const messagesResult = validateAndExtractImportData(messagesOnly);
    assert.equal(messagesResult.isValid, true);
    assert.equal(messagesResult.hasChat, true);
    assert.ok(messagesResult.chatHistory.includes('What about layout?'));
});
