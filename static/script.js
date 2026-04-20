let homeworks = [];
let currentFilter = 'all';

function logAction(action) {
    console.log(`%c[ACTION] ${new Date().toLocaleTimeString()}: ${action}`, "color: #4f46e5; font-weight: bold;");
}

function logError(msg, err = "") {
    console.error(`%c[ERROR] ${new Date().toLocaleTimeString()}: ${msg}`, "color: #ef4444; font-weight: bold;", err);
}


async function api(method, url, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': CSRF_TOKEN,   // injected by the Django template
        },
        credentials: 'same-origin',
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

function render() {
    const listEl = document.getElementById('homeworkList');
    if (!listEl) return;

    listEl.innerHTML = '';

    let filtered = [...homeworks];
    if (currentFilter === 'active')    filtered = filtered.filter(h => !h.completed);
    if (currentFilter === 'completed') filtered = filtered.filter(h =>  h.completed);

    filtered.sort((a, b) => b.urgent - a.urgent || (a.date || '').localeCompare(b.date || ''));

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-12 text-slate-400">
                <div class="text-4xl mb-2">📭</div>
                <p class="font-semibold">No tasks here!</p>
            </div>`;
    }

    filtered.forEach((hw) => {
        const item = document.createElement('div');
        item.className = `group flex items-center justify-between p-5 bg-white rounded-3xl transition-all hover:shadow-md border-2
            ${hw.urgent && !hw.completed ? 'urgent-pulse border-red-100' : 'border-transparent'}
            ${hw.completed ? 'completed' : ''}`;

        item.innerHTML = `
            <div class="flex items-center gap-4 text-left">
                <button onclick="toggleTask(${hw.id})" class="w-8 h-8 rounded-full border-2 border-indigo-200 flex items-center justify-center hover:bg-indigo-50 transition flex-shrink-0">
                    ${hw.completed ? '✅' : ''}
                </button>
                <div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-black uppercase text-indigo-400">${hw.subject}</span>
                        ${hw.urgent ? '<span class="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">URGENT</span>' : ''}
                    </div>
                    <div class="font-bold text-slate-800 text-lg leading-tight">${hw.task}</div>
                    <div class="text-xs font-bold text-slate-400 mt-1 italic">Due: ${hw.date || 'No Date'}</div>
                </div>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onclick="editTask(${hw.id})" class="p-2 text-slate-300 hover:text-indigo-500 transition">📝</button>
                <button onclick="deleteTask(${hw.id})" class="p-2 text-slate-300 hover:text-red-500 transition">🗑️</button>
            </div>`;

        listEl.appendChild(item);
    });

    updateStats();
}

function updateStats() {
    const statsEl = document.getElementById('stats');
    if (!statsEl) return;
    const total = homeworks.length;
    const done  = homeworks.filter(h => h.completed).length;
    statsEl.innerText = total === 0
        ? `No tasks yet, ${CURRENT_USER}`
        : `${done} of ${total} tasks completed`;
}

async function addTask() {
    const taskInput    = document.getElementById('taskInput');
    const dateInput    = document.getElementById('dateInput');
    const subjectInput = document.getElementById('subjectInput');
    const urgentInput  = document.getElementById('urgentInput');

    const taskText = taskInput.value.trim();
    if (!taskText) {
        taskInput.focus();
        taskInput.classList.add('ring-2', 'ring-red-400');
        setTimeout(() => taskInput.classList.remove('ring-2', 'ring-red-400'), 1500);
        return;
    }

    try {
        const newTask = await api('POST', '/api/tasks/', {
            task:    taskText,
            date:    dateInput.value || null,
            subject: subjectInput.value,
            urgent:  urgentInput.checked,
        });

        homeworks.push(newTask);
        logAction(`CREATED: [${newTask.subject}] ${newTask.task}`);

        taskInput.value       = '';
        urgentInput.checked   = false;
    } catch (err) {
        logError('Failed to add task', err);
        alert('Could not save task. Please try again.');
    }

    render();
}

async function toggleTask(id) {
    const hw = homeworks.find(h => h.id === id);
    if (!hw) return logError(`Task ${id} not found for toggle`);

    const newCompleted = !hw.completed;
    try {
        const updated = await api('PATCH', `/api/tasks/${id}/`, { completed: newCompleted });
        Object.assign(hw, updated);
        logAction(`${hw.completed ? 'COMPLETED' : 'REOPENED'}: ${hw.task}`);
    } catch (err) {
        logError('Failed to toggle task', err);
    }

    render();
}

async function deleteTask(id) {
    const hw = homeworks.find(h => h.id === id);
    if (!hw) return logError(`Task ${id} not found for deletion`);

    try {
        await api('DELETE', `/api/tasks/${id}/`);
        homeworks = homeworks.filter(h => h.id !== id);
        logAction(`DELETED: ${hw.task}`);
    } catch (err) {
        logError('Failed to delete task', err);
    }

    render();
}

async function editTask(id) {
    const hw = homeworks.find(h => h.id === id);
    if (!hw) return logError(`Task ${id} not found for edit`);

    const newText = prompt('Update task description:', hw.task);
    if (newText === null || newText.trim() === '') return;

    try {
        const updated = await api('PATCH', `/api/tasks/${id}/`, { task: newText.trim() });
        Object.assign(hw, updated);
        logAction(`EDITED: "${hw.task}"`);
    } catch (err) {
        logError('Failed to edit task', err);
    }

    render();
}

async function clearCompleted() {
    const count = homeworks.filter(h => h.completed).length;
    if (count === 0) return;

    try {
        await api('POST', '/api/tasks/', { action: 'clear_completed' });
        homeworks = homeworks.filter(h => !h.completed);
        logAction(`CLEARED: Removed ${count} completed tasks`);
    } catch (err) {
        logError('Failed to clear completed', err);
    }

    render();
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.getElementById(`filter-${filter}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400');
        activeBtn.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
    }
    render();
}

async function init() {
    logAction(`System Online — user: ${CURRENT_USER}`);
    try {
        homeworks = await api('GET', '/api/tasks/');
        logAction(`Loaded ${homeworks.length} tasks from server`);
    } catch (err) {
        logError('Failed to load tasks', err);
        homeworks = [];
    }
    render();
}

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }
    init();
});
