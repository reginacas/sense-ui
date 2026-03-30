/**
 * SenseUI Projects Management - Bundled Version
 * Handles project CRUD operations and UI interactions
 */

// ============================================================================
// CONFIGURATION & STORAGE
// ============================================================================
const STORAGE_KEYS = {
    PROJECTS: 'senseui_projects',
    ACTIVE_PROJECT: 'senseui_active_project',
};

// ============================================================================
// PROJECT STORAGE FUNCTIONS
// ============================================================================

/**
 * Get all projects from storage
 * @returns {Promise<Array>} Array of project objects
 */
async function getAllProjects() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.PROJECTS);
        return result[STORAGE_KEYS.PROJECTS] || [];
    } catch (error) {
        console.error('Error getting projects:', error);
        return [];
    }
}

/**
 * Save a new project or update an existing one
 * @param {Object} project - Project object with name, aesthetic, purpose
 * @param {string} projectId - Optional ID for updating existing project
 * @returns {Promise<Object>} The saved project with ID
 */
async function saveProject(project, projectId = null) {
    try {
        console.log('💾 Attempting to save project:', { project, projectId });
        const projects = await getAllProjects();
        console.log('📋 Current projects count:', projects.length);

        if (projectId) {
            // Update existing project - preserve existing fields like createdAt
            const index = projects.findIndex((p) => p.id === projectId);
            if (index !== -1) {
                projects[index] = { ...projects[index], ...project };
                console.log('✏️ Updated existing project at index:', index);
            }
        } else {
            // Create new project
            const newProject = {
                ...project,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
            };
            projects.push(newProject);
            console.log('➕ Created new project with ID:', newProject.id);
        }

        await chrome.storage.local.set({ [STORAGE_KEYS.PROJECTS]: projects });
        console.log('✅ Project saved successfully to storage');
        return projectId
            ? projects.find((p) => p.id === projectId)
            : projects[projects.length - 1];
    } catch (error) {
        console.error('❌ Error saving project:', error);
        console.error('Error details:', error.message, error.stack);
        throw error;
    }
}

/**
 * Delete a project
 * @param {string} projectId - ID of the project to delete
 * @returns {Promise<void>}
 */
async function deleteProject(projectId) {
    try {
        const projects = await getAllProjects();
        const filtered = projects.filter((p) => p.id !== projectId);
        await chrome.storage.local.set({ [STORAGE_KEYS.PROJECTS]: filtered });

        // Clear active project if it was deleted
        const activeProject = await getActiveProject();
        if (activeProject && activeProject.id === projectId) {
            await setActiveProject(null);
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        throw error;
    }
}

/**
 * Get the currently active project
 * @returns {Promise<Object|null>} Active project object or null
 */
async function getActiveProject() {
    try {
        const result = await chrome.storage.local.get(
            STORAGE_KEYS.ACTIVE_PROJECT,
        );
        return result[STORAGE_KEYS.ACTIVE_PROJECT] || null;
    } catch (error) {
        console.error('Error getting active project:', error);
        return null;
    }
}

/**
 * Set the active project
 * @param {Object|null} project - Project object or null to clear
 * @returns {Promise<void>}
 */
async function setActiveProject(project) {
    try {
        if (project === null) {
            await chrome.storage.local.remove(STORAGE_KEYS.ACTIVE_PROJECT);
        } else {
            await chrome.storage.local.set({
                [STORAGE_KEYS.ACTIVE_PROJECT]: project,
            });
        }
    } catch (error) {
        console.error('Error setting active project:', error);
        throw error;
    }
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

let projectToDelete = null;
let projectsPendingExport = [];
let pendingImportMode = 'merge';

function generateProjectId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeProject(rawProject) {
    if (!rawProject || typeof rawProject !== 'object') return null;

    const name = String(rawProject.name || '').trim();
    if (!name) return null;

    return {
        id: generateProjectId(),
        name,
        aesthetic: String(rawProject.aesthetic || '').trim(),
        purpose: String(rawProject.purpose || '').trim(),
        createdAt: new Date().toISOString(),
    };
}

function extractImportedProjects(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray(parsed.projects)
    ) {
        return parsed.projects;
    }
    return null;
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

function getProjectsExportFilename() {
    const date = new Date().toISOString().slice(0, 10);
    return `senseui-projects-${date}.json`;
}

function getSelectedProjectsForExport() {
    if (projectsPendingExport.length <= 1) return [...projectsPendingExport];

    const selectedIds = new Set(
        Array.from(
            document.querySelectorAll(
                'input[name="export-project-selection"]:checked',
            ),
        ).map((input) => input.value),
    );

    return projectsPendingExport.filter((project) =>
        selectedIds.has(project.id),
    );
}

function closeExportProjectsDialog() {
    const dialog = document.getElementById('export-projects-dialog');
    if (dialog) {
        dialog.close();
    }
    projectsPendingExport = [];
}

function closeImportProjectsDialog() {
    const dialog = document.getElementById('import-projects-dialog');
    if (dialog) {
        dialog.close();
    }
}

async function openExportProjectsDialog() {
    const projects = await getAllProjects();
    if (projects.length === 0) {
        announceToScreenReader('There are no projects to export.');
        return;
    }

    projectsPendingExport = [...projects].sort((a, b) =>
        a.name.localeCompare(b.name),
    );

    const dialog = document.getElementById('export-projects-dialog');
    const dialogText = document.getElementById('export-projects-dialog-text');
    const fieldset = document.getElementById('export-projects-fieldset');
    const checkboxList = document.getElementById(
        'export-projects-checkbox-list',
    );

    if (!dialog || !dialogText || !fieldset || !checkboxList) {
        announceToScreenReader('Unable to open export dialog.');
        return;
    }

    checkboxList.innerHTML = '';

    if (projectsPendingExport.length > 1) {
        dialogText.textContent = 'Select the projects you want to export.';
        fieldset.style.display = '';

        projectsPendingExport.forEach((project) => {
            const wrapper = document.createElement('div');

            const label = document.createElement('label');
            label.setAttribute('for', `export-project-${project.id}`);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `export-project-${project.id}`;
            checkbox.name = 'export-project-selection';
            checkbox.value = project.id;
            checkbox.checked = true;

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` ${project.name}`));
            wrapper.appendChild(label);
            checkboxList.appendChild(wrapper);
        });
    } else {
        const onlyProject = projectsPendingExport[0];
        dialogText.textContent = `Export project "${onlyProject.name}"?`;
        fieldset.style.display = 'none';
    }

    dialog.showModal();
    setTimeout(() => dialogText.focus(), 100);
}

function confirmExportProjects() {
    if (!projectsPendingExport.length) {
        closeExportProjectsDialog();
        return;
    }

    const selectedProjects = getSelectedProjectsForExport();
    if (selectedProjects.length === 0) {
        announceToScreenReader('Select at least one project to export.');
        return;
    }

    const exportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        projects: selectedProjects,
    };

    downloadJsonFile(
        JSON.stringify(exportPayload, null, 2),
        getProjectsExportFilename(),
    );
    announceToScreenReader(
        `${selectedProjects.length} project${selectedProjects.length === 1 ? '' : 's'} exported successfully.`,
    );
    closeExportProjectsDialog();
}

function openImportProjectsDialog() {
    const dialog = document.getElementById('import-projects-dialog');
    const dialogText = document.getElementById('import-projects-dialog-text');
    if (!dialog || !dialogText) {
        announceToScreenReader('Unable to open import dialog.');
        return;
    }

    dialog.showModal();
    setTimeout(() => dialogText.focus(), 100);
}

function confirmImportProjectsMode() {
    const selectedMode = document.querySelector(
        'input[name="import-mode"]:checked',
    );
    pendingImportMode = selectedMode?.value === 'replace' ? 'replace' : 'merge';

    closeImportProjectsDialog();

    const importInput = document.getElementById('import-projects-input');
    if (!importInput) {
        announceToScreenReader('Import input is unavailable.');
        return;
    }
    importInput.value = '';
    importInput.click();
}

async function handleProjectsImportFileChange(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const importedRawProjects = extractImportedProjects(parsed);

        if (!importedRawProjects) {
            announceToScreenReader(
                'Invalid file format. Expected a projects array.',
            );
            return;
        }

        const importedProjects = importedRawProjects
            .map(normalizeProject)
            .filter(Boolean);

        if (importedProjects.length === 0) {
            announceToScreenReader(
                'No valid projects found in the selected file.',
            );
            return;
        }

        if (pendingImportMode === 'replace') {
            await chrome.storage.local.set({
                [STORAGE_KEYS.PROJECTS]: importedProjects,
            });
            await setActiveProject(importedProjects[0] || null);
            announceToScreenReader(
                `${importedProjects.length} project${importedProjects.length === 1 ? '' : 's'} imported and existing projects replaced.`,
            );
        } else {
            const existingProjects = await getAllProjects();
            const mergedProjects = [...existingProjects, ...importedProjects];
            await chrome.storage.local.set({
                [STORAGE_KEYS.PROJECTS]: mergedProjects,
            });
            announceToScreenReader(
                `${importedProjects.length} project${importedProjects.length === 1 ? '' : 's'} imported and added to your current projects.`,
            );
        }

        await renderProjectsList();
        resetForm();
    } catch (error) {
        console.error('Error importing projects:', error);
        announceToScreenReader(
            `Error importing projects: ${error.message}. Please try again.`,
        );
    } finally {
        const importInput = document.getElementById('import-projects-input');
        if (importInput) {
            importInput.value = '';
        }
        pendingImportMode = 'merge';
    }
}

/**
 * Render the list of projects
 */
async function renderProjectsList() {
    const projects = await getAllProjects();
    const projectsList = document.getElementById('projects-list');

    if (!projectsList) {
        console.error('❌ projects-list element not found in DOM');
        return;
    }

    // Clear the list
    projectsList.innerHTML = '';

    if (projects.length === 0) {
        const noProjectsMessage = document.createElement('p');
        noProjectsMessage.id = 'no-projects-message';
        noProjectsMessage.textContent =
            'No projects yet. Create your first project below.';
        projectsList.appendChild(noProjectsMessage);
        return;
    }

    // Sort projects alphabetically by name
    projects.sort((a, b) => a.name.localeCompare(b.name));

    projects.forEach((project) => {
        const projectItem = document.createElement('div');
        projectItem.className = 'project-item';
        projectItem.role = 'listitem';

        const projectInfo = document.createElement('div');
        projectInfo.className = 'project-info';

        const projectName = document.createElement('h3');
        projectName.textContent = project.name;
        projectInfo.appendChild(projectName);

        // Create collapsible details section
        const detailsElement = document.createElement('details');
        detailsElement.className = 'project-details-toggle';

        const summary = document.createElement('summary');
        summary.textContent = 'Details';

        const projectDetails = document.createElement('div');
        projectDetails.className = 'project-details-content';
        projectDetails.innerHTML = `<p><strong>Aesthetic:</strong> ${project.aesthetic}</p>
                                    <p><strong>Purpose:</strong> ${project.purpose}</p>`;

        detailsElement.appendChild(summary);
        detailsElement.appendChild(projectDetails);
        projectInfo.appendChild(detailsElement);

        const projectActions = document.createElement('div');
        projectActions.className = 'project-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-secondary';
        editBtn.textContent = 'Edit';
        editBtn.setAttribute('aria-label', `Edit ${project.name}`);
        editBtn.onclick = () => editProject(project);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-secondary';
        deleteBtn.textContent = 'Delete';
        deleteBtn.setAttribute('aria-label', `Delete ${project.name}`);
        deleteBtn.onclick = () => showDeleteDialog(project);

        projectActions.appendChild(editBtn);
        projectActions.appendChild(deleteBtn);

        projectItem.appendChild(projectInfo);
        projectItem.appendChild(projectActions);

        projectsList.appendChild(projectItem);
    });
}

/**
 * Edit a project - populate form with project data
 */
function editProject(project) {
    document.getElementById('project-name').value = project.name;
    document.getElementById('project-aesthetic').value = project.aesthetic;
    document.getElementById('project-purpose').value = project.purpose;
    document.getElementById('edit-project-id').value = project.id;

    // Update form heading and button text
    document.getElementById('project-form-heading').textContent =
        'Edit Project';
    document.getElementById('save-project-btn').textContent = 'Save Changes';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';

    // Scroll to form and move focus to the first field
    document
        .getElementById('project-form')
        .scrollIntoView({ behavior: 'smooth' });
    document.getElementById('project-name').focus();

    // Announce to screen readers
    announceToScreenReader('Editing project: ' + project.name);
}

/**
 * Cancel editing and reset form
 */
function cancelEdit() {
    resetForm();
    announceToScreenReader('Edit cancelled');
}

/**
 * Reset the project form
 */
function resetForm() {
    const stayOnPageCheckbox = document.getElementById('stay-on-page');
    const keepStayOnPageChecked = !!stayOnPageCheckbox?.checked;

    document.getElementById('project-form').reset();

    if (stayOnPageCheckbox) {
        stayOnPageCheckbox.checked = keepStayOnPageChecked;
    }
    document.getElementById('edit-project-id').value = '';
    document.getElementById('project-form-heading').textContent =
        'Create New Project';
    document.getElementById('save-project-btn').textContent = 'Create Project';
    document.getElementById('cancel-edit-btn').style.display = 'none';
}

/**
 * Show delete confirmation dialog
 */
function showDeleteDialog(project) {
    projectToDelete = project;
    const dialog = document.getElementById('delete-dialog');
    const dialogText = document.getElementById('delete-dialog-text');
    dialogText.textContent = `Are you sure you want to delete "${project.name}"? This action cannot be undone.`;
    dialog.showModal();

    // Focus on the dialog text for screen reader announcement
    setTimeout(() => dialogText.focus(), 100);
}

/**
 * Handle project deletion
 */
async function handleDelete() {
    if (!projectToDelete) return;

    try {
        await deleteProject(projectToDelete.id);
        const dialog = document.getElementById('delete-dialog');
        dialog.close();

        announceToScreenReader(
            `Project "${projectToDelete.name}" deleted successfully`,
        );
        projectToDelete = null;

        await renderProjectsList();
    } catch (error) {
        announceToScreenReader('Error deleting project. Please try again.');
    }
}

/**
 * Cancel deletion
 */
function cancelDelete() {
    const dialog = document.getElementById('delete-dialog');
    dialog.close();
    projectToDelete = null;
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('project-name').value.trim();
    const aesthetic = document.getElementById('project-aesthetic').value.trim();
    const purpose = document.getElementById('project-purpose').value.trim();
    const editId = document.getElementById('edit-project-id').value;

    // Validation - only project name is required
    if (!name) {
        announceToScreenReader('Please enter a project name');
        return;
    }

    const project = { name, aesthetic, purpose };

    try {
        console.log('📝 Form submitted with data:', {
            name,
            aesthetic,
            purpose,
            editId,
        });
        const savedProject = await saveProject(project, editId || null);

        if (editId) {
            announceToScreenReader(`Project "${name}" updated successfully`);
            // Update active project if it was the one edited
            const activeProject = await getActiveProject();
            if (activeProject && activeProject.id === editId) {
                await setActiveProject(savedProject);
            }
            const stayOnPage = document.getElementById('stay-on-page')?.checked;
            if (!stayOnPage) {
                window.location.href = 'index.html#active-project-select';
                return;
            }
        } else {
            announceToScreenReader(`Project "${name}" created successfully`);
            await setActiveProject(savedProject);
            const stayOnPage = document.getElementById('stay-on-page')?.checked;
            if (!stayOnPage) {
                window.location.href = 'index.html#active-project-select';
                return;
            }
        }

        resetForm();
        await renderProjectsList();
    } catch (error) {
        console.error('❌ Error in handleFormSubmit:', error);
        console.error('Error details:', error.message, error.stack);
        announceToScreenReader(
            `Error saving project: ${error.message}. Please try again.`,
        );
    }
}

/**
 * Announce message to screen readers
 */
function announceToScreenReader(message) {
    const status = document.getElementById('project-status');
    status.textContent = message;
    status.classList.remove('visually-hidden');

    // Clear after a delay
    setTimeout(() => {
        status.textContent = '';
        status.classList.add('visually-hidden');
    }, 3000);
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

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize combobox components
    var comboboxes = document.querySelectorAll('.combobox-list');
    for (var i = 0; i < comboboxes.length; i++) {
        var combobox = comboboxes[i];
        var comboboxNode = combobox.querySelector('input');
        var buttonNode = combobox.querySelector('button');
        var listboxNode = combobox.querySelector('[role="listbox"]');
        new ComboboxAutocomplete(comboboxNode, buttonNode, listboxNode);
    }

    // Render initial projects list
    await renderProjectsList();

    // Set up event listeners
    document
        .getElementById('project-form')
        .addEventListener('submit', handleFormSubmit);
    document
        .getElementById('cancel-edit-btn')
        .addEventListener('click', cancelEdit);
    document
        .getElementById('confirm-delete')
        .addEventListener('click', handleDelete);
    document
        .getElementById('cancel-delete')
        .addEventListener('click', cancelDelete);
    document
        .getElementById('export-projects-btn')
        .addEventListener('click', openExportProjectsDialog);
    document
        .getElementById('confirm-export-projects')
        .addEventListener('click', confirmExportProjects);
    document
        .getElementById('cancel-export-projects')
        .addEventListener('click', closeExportProjectsDialog);
    document
        .getElementById('import-projects-btn')
        .addEventListener('click', openImportProjectsDialog);
    document
        .getElementById('confirm-import-projects')
        .addEventListener('click', confirmImportProjectsMode);
    document
        .getElementById('cancel-import-projects')
        .addEventListener('click', closeImportProjectsDialog);
    document
        .getElementById('import-projects-input')
        .addEventListener('change', handleProjectsImportFileChange);

    // Close dialog on ESC key
    document
        .getElementById('delete-dialog')
        .addEventListener('cancel', cancelDelete);
    document
        .getElementById('export-projects-dialog')
        .addEventListener('cancel', closeExportProjectsDialog);
    document
        .getElementById('import-projects-dialog')
        .addEventListener('cancel', closeImportProjectsDialog);
});
