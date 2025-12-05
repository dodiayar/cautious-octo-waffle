// Dev Tasks - R1 To-Do List App for Software Development

// ===========================================
// State Management
// ===========================================

let tasks = [];
let projects = [];
let organizations = [];
let currentSortMode = 'date'; // 'date' or 'project'
let isListening = false;
let currentTaskDraft = {
    task: '',
    project: '',
    organization: '',
    dueDate: ''
};
let editingTaskId = null;

// ===========================================
// Initialization
// ===========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dev Tasks app initialized');
    
    // Load saved data
    await loadData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Render initial view
    renderTasks();
    
    // Keyboard fallback for development
    if (typeof PluginMessageHandler === 'undefined') {
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent('sideClick'));
            }
        });
    }
});

// ===========================================
// Data Persistence
// ===========================================

async function saveData() {
    const data = {
        tasks,
        projects,
        organizations,
        currentSortMode
    };
    
    if (window.creationStorage) {
        try {
            const encoded = btoa(JSON.stringify(data));
            await window.creationStorage.plain.setItem('dev_tasks_data', encoded);
            console.log('Data saved');
        } catch (e) {
            console.error('Error saving data:', e);
        }
    } else {
        localStorage.setItem('dev_tasks_data', JSON.stringify(data));
    }
}

async function loadData() {
    let data = null;
    
    if (window.creationStorage) {
        try {
            const stored = await window.creationStorage.plain.getItem('dev_tasks_data');
            if (stored) {
                data = JSON.parse(atob(stored));
            }
        } catch (e) {
            console.error('Error loading data:', e);
        }
    } else {
        const stored = localStorage.getItem('dev_tasks_data');
        if (stored) {
            data = JSON.parse(stored);
        }
    }
    
    if (data) {
        tasks = data.tasks || [];
        projects = data.projects || [];
        organizations = data.organizations || [];
        currentSortMode = data.currentSortMode || 'date';
    }
}

// ===========================================
// Event Listeners Setup
// ===========================================

function setupEventListeners() {
    // Main view buttons
    document.getElementById('addBtn').addEventListener('click', showAddView);
    document.getElementById('sortBtn').addEventListener('click', toggleSort);
    
    // Add view buttons
    document.getElementById('cancelAddBtn').addEventListener('click', cancelAdd);
    document.getElementById('confirmTaskBtn').addEventListener('click', confirmTask);
    
    // Edit view buttons
    document.getElementById('cancelEditBtn').addEventListener('click', cancelEdit);
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);
    document.getElementById('deleteTaskBtn').addEventListener('click', deleteTask);
    
    // Side button for voice input
    window.addEventListener('sideClick', handleSideClick);
}

// ===========================================
// View Management
// ===========================================

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
}

function showAddView() {
    resetTaskDraft();
    showView('addView');
    updateTaskPreview();
}

function showEditView(taskId) {
    editingTaskId = taskId;
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
        document.getElementById('editTaskInput').value = task.task;
        
        // Populate project dropdown
        populateEditDropdown('editProjectSelect', projects, task.project);
        
        // Populate org dropdown
        populateEditDropdown('editOrgSelect', organizations, task.organization);
        
        // Set due date
        document.getElementById('editDueInput').value = task.dueDate || '';
        
        showView('editView');
    }
}

function populateEditDropdown(selectId, items, selectedValue) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">None</option>';
    
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        if (item === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Add "New..." option
    const newOption = document.createElement('option');
    newOption.value = '__new__';
    newOption.textContent = '+ New...';
    select.appendChild(newOption);
}

function cancelAdd() {
    resetTaskDraft();
    showView('mainView');
}

function cancelEdit() {
    editingTaskId = null;
    showView('mainView');
}

// ===========================================
// Side Button Handler
// ===========================================

function handleSideClick() {
    const currentView = document.querySelector('.view.active').id;

    if (currentView === 'addView') {
        // Start/stop voice input
        if (!isListening) {
            startVoiceInput();
        } else {
            stopVoiceInput();
        }
    }
}

// ===========================================
// Voice Input
// ===========================================

function startVoiceInput() {
    isListening = true;
    
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceText = document.getElementById('voiceText');
    
    voiceStatus.classList.add('listening');
    voiceText.textContent = 'Listening... Describe your task';
    
    // Send voice prompt to LLM
    if (typeof PluginMessageHandler !== 'undefined') {
        const prompt = `Extract task information from the user's voice input. They will describe a software development task.
        
Extract these fields:
- task: The task description
- project: Project name (if mentioned)
- organization: Organization name (if mentioned)
- dueDate: Due date in YYYY-MM-DD format (if mentioned, interpret relative dates like "tomorrow", "next week", "in 3 days")

Current date: ${new Date().toISOString().split('T')[0]}

Respond ONLY with valid JSON in this exact format:
{"task":"description","project":"name or empty","organization":"name or empty","dueDate":"YYYY-MM-DD or empty"}

Now listen for the user's task description.`;

        PluginMessageHandler.postMessage(JSON.stringify({
            message: prompt,
            useLLM: true,
            wantsR1Response: false
        }));
    } else {
        // Browser fallback - simulate voice input
        setTimeout(() => {
            simulateVoiceInput();
        }, 2000);
    }
}

function stopVoiceInput() {
    isListening = false;

    const voiceStatus = document.getElementById('voiceStatus');
    const voiceText = document.getElementById('voiceText');

    voiceStatus.classList.remove('listening');
    voiceText.textContent = 'Recording stopped. Press side button to speak again';

    // Reset after a short delay
    setTimeout(() => {
        voiceText.textContent = 'Press side button to speak';
    }, 2000);
}

function simulateVoiceInput() {
    // For browser testing
    const mockResponse = {
        task: 'Implement user authentication',
        project: 'WebApp',
        organization: 'TechCorp',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    processVoiceResponse(mockResponse);
}

function processVoiceResponse(data) {
    isListening = false;
    
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceText = document.getElementById('voiceText');
    
    voiceStatus.classList.remove('listening');
    voiceText.textContent = 'Task captured!';
    
    // Update draft
    if (data.task) currentTaskDraft.task = data.task;
    if (data.project) currentTaskDraft.project = data.project;
    if (data.organization) currentTaskDraft.organization = data.organization;
    if (data.dueDate) currentTaskDraft.dueDate = data.dueDate;
    
    updateTaskPreview();
    
    // Enable confirm button if task is present
    const confirmBtn = document.getElementById('confirmTaskBtn');
    confirmBtn.disabled = !currentTaskDraft.task;
    
    // Reset voice status after delay
    setTimeout(() => {
        voiceText.textContent = 'Press side button to speak again';
    }, 2000);
}

// ===========================================
// Message Handler
// ===========================================

window.onPluginMessage = function(data) {
    console.log('Received message:', data);
    
    if (isListening) {
        let parsedData = null;
        
        // Try to parse from data.data or data.message
        if (data.data) {
            try {
                parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            } catch (e) {
                console.log('Could not parse data.data as JSON');
            }
        }
        
        if (!parsedData && data.message) {
            try {
                parsedData = JSON.parse(data.message);
            } catch (e) {
                console.log('Could not parse data.message as JSON');
            }
        }
        
        if (parsedData && parsedData.task) {
            processVoiceResponse(parsedData);
        }
    }
};

// ===========================================
// Task Management
// ===========================================

function resetTaskDraft() {
    currentTaskDraft = {
        task: '',
        project: '',
        organization: '',
        dueDate: ''
    };
    
    const voiceText = document.getElementById('voiceText');
    voiceText.textContent = 'Press side button to speak';
    
    const voiceStatus = document.getElementById('voiceStatus');
    voiceStatus.classList.remove('listening');
    
    const confirmBtn = document.getElementById('confirmTaskBtn');
    confirmBtn.disabled = true;
}

function updateTaskPreview() {
    document.getElementById('previewTask').textContent = currentTaskDraft.task || '—';
    document.getElementById('previewProject').textContent = currentTaskDraft.project || '—';
    document.getElementById('previewOrg').textContent = currentTaskDraft.organization || '—';
    document.getElementById('previewDue').textContent = currentTaskDraft.dueDate ? formatDate(currentTaskDraft.dueDate) : '—';
}

function confirmTask() {
    if (!currentTaskDraft.task) return;
    
    // Add to projects/orgs lists if new
    if (currentTaskDraft.project && !projects.includes(currentTaskDraft.project)) {
        projects.push(currentTaskDraft.project);
    }
    
    if (currentTaskDraft.organization && !organizations.includes(currentTaskDraft.organization)) {
        organizations.push(currentTaskDraft.organization);
    }
    
    // Create task
    const newTask = {
        id: Date.now(),
        task: currentTaskDraft.task,
        project: currentTaskDraft.project,
        organization: currentTaskDraft.organization,
        dueDate: currentTaskDraft.dueDate,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    
    // Save and return to main view
    saveData();
    renderTasks();
    showView('mainView');
}

function saveEdit() {
    if (!editingTaskId) return;
    
    const task = tasks.find(t => t.id === editingTaskId);
    if (!task) return;
    
    const newTask = document.getElementById('editTaskInput').value.trim();
    let newProject = document.getElementById('editProjectSelect').value;
    let newOrg = document.getElementById('editOrgSelect').value;
    const newDue = document.getElementById('editDueInput').value;
    
    if (!newTask) {
        alert('Task description is required');
        return;
    }
    
    // Handle "New..." selections
    if (newProject === '__new__') {
        newProject = prompt('Enter new project name:');
        if (newProject && !projects.includes(newProject)) {
            projects.push(newProject);
        }
    }
    
    if (newOrg === '__new__') {
        newOrg = prompt('Enter new organization name:');
        if (newOrg && !organizations.includes(newOrg)) {
            organizations.push(newOrg);
        }
    }
    
    // Update task
    task.task = newTask;
    task.project = newProject || '';
    task.organization = newOrg || '';
    task.dueDate = newDue;
    
    // Save and return
    saveData();
    renderTasks();
    showView('mainView');
}

function deleteTask() {
    if (!editingTaskId) return;
    
    if (confirm('Delete this task?')) {
        tasks = tasks.filter(t => t.id !== editingTaskId);
        saveData();
        renderTasks();
        showView('mainView');
    }
}

function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveData();
        renderTasks();
    }
}

// ===========================================
// Sorting
// ===========================================

function toggleSort() {
    currentSortMode = currentSortMode === 'date' ? 'project' : 'date';
    
    const sortBtn = document.getElementById('sortBtn');
    sortBtn.textContent = currentSortMode === 'date' ? '📅' : '📁';
    
    saveData();
    renderTasks();
}

function sortTasks() {
    if (currentSortMode === 'date') {
        return [...tasks].sort((a, b) => {
            // Sort by due date (tasks with dates first, then by date)
            if (!a.dueDate && !b.dueDate) return b.createdAt.localeCompare(a.createdAt);
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        });
    } else {
        return [...tasks].sort((a, b) => {
            // Sort by project, then by due date
            if (a.project !== b.project) {
                if (!a.project) return 1;
                if (!b.project) return -1;
                return a.project.localeCompare(b.project);
            }
            if (!a.dueDate && !b.dueDate) return b.createdAt.localeCompare(a.createdAt);
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        });
    }
}

// ===========================================
// Rendering
// ===========================================

function renderTasks() {
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    
    if (tasks.length === 0) {
        taskList.innerHTML = '';
        emptyState.classList.add('visible');
        return;
    }
    
    emptyState.classList.remove('visible');
    
    const sortedTasks = sortTasks();
    
    taskList.innerHTML = sortedTasks.map(task => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
        
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" 
                 onclick="showEditView(${task.id})"
                 data-task-id="${task.id}">
                <div class="task-title">${escapeHtml(task.task)}</div>
                <div class="task-meta">
                    ${task.project ? `<span class="task-tag project">📁 ${escapeHtml(task.project)}</span>` : ''}
                    ${task.organization ? `<span class="task-tag org">🏢 ${escapeHtml(task.organization)}</span>` : ''}
                    ${task.dueDate ? `<span class="task-tag due ${isOverdue ? 'overdue' : ''}">📅 ${formatDate(task.dueDate)}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===========================================
// Utility Functions
// ===========================================

function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    const options = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== today.getFullYear()) {
        options.year = 'numeric';
    }
    
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('Dev Tasks app ready!');
