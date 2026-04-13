let homeworks = [];
try {
    const savedData = localStorage.getItem('hw_v4_split');
    homeworks = savedData ? JSON.parse(savedData) : [];
} catch (e) {
    console.error("[CRITICAL ERROR] Failed to parse localStorage data:", e);
    homeworks = [];
}

let currentFilter = 'all';

// --- LOGGING UTILS ---
function logAction(action) {
    console.log(`%c[ACTION] ${new Date().toLocaleTimeString()}: ${action}`, "color: #4f46e5; font-weight: bold;");
}

function logError(msg, err = "") {
    console.error(`%c[ERROR] ${new Date().toLocaleTimeString()}: ${msg}`, "color: #ef4444; font-weight: bold;", err);
}

function render() {
    try {
        const listEl = document.getElementById('homeworkList');
        if (!listEl) throw new Error("List container not found in DOM");
        
        listEl.innerHTML = '';
        
        let filtered = homeworks;
        if (currentFilter === 'active') filtered = homeworks.filter(h => !h.completed);
        if (currentFilter === 'completed') filtered = homeworks.filter(h => h.completed);

        filtered.sort((a, b) => b.urgent - a.urgent || new Date(a.date) - new Date(b.date));

        filtered.forEach((hw) => {
            const item = document.createElement('div');
            item.className = `group flex items-center justify-between p-5 bg-white rounded-3xl transition-all hover:shadow-md border-2 ${hw.urgent && !hw.completed ? 'urgent-pulse border-red-100' : 'border-transparent'} ${hw.completed ? 'completed' : ''}`;
            
            item.innerHTML = `
                <div class="flex items-center gap-4 text-left">
                    <button onclick="toggleHw(${hw.id})" class="w-8 h-8 rounded-full border-2 border-indigo-200 flex items-center justify-center hover:bg-indigo-50 transition">
                        ${hw.completed ? '✅' : ''}
                    </button>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black uppercase text-indigo-400">${hw.subject}</span>
                            ${hw.urgent ? '<span class="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">URGENT</span>' : ''}
                        </div>
                        <div class="font-bold text-slate-800 text-lg leading-tight">${hw.task}</div>
                        <div class="text-xs font-bold text-slate-400 mt-1 italic">Due: ${hw.date || 'No Date'}</div>
                    </div>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onclick="editHw(${hw.id})" class="p-2 text-slate-300 hover:text-indigo-500 transition">📝</button>
                    <button onclick="deleteHw(${hw.id})" class="p-2 text-slate-300 hover:text-red-500 transition">🗑️</button>
                </div>
            `;
            listEl.appendChild(item);
        });

        updateStats();
        
        try {
            localStorage.setItem('hw_v4_split', JSON.stringify(homeworks));
        } catch (e) {
            logError("Could not save to localStorage", e);
        }

    } catch (renderErr) {
        logError("Render loop failed", renderErr);
    }
}

function addHomework() {
    const taskInput = document.getElementById('taskInput');
    const dateInput = document.getElementById('dateInput');
    const subjectInput = document.getElementById('subjectInput');
    const urgentInput = document.getElementById('urgentInput');

    if (!taskInput || !taskInput.value.trim()) {
        logError("Validation failed: Task name is empty");
        return;
    }

    const newHw = { 
        id: Date.now(), 
        task: taskInput.value.trim(), 
        date: dateInput.value, 
        subject: subjectInput.value, 
        urgent: urgentInput.checked, 
        completed: false 
    };

    homeworks.push(newHw);
    logAction(`CREATED: [${newHw.subject}] ${newHw.task}`);
    
    taskInput.value = '';
    urgentInput.checked = false;
    render();
}

function toggleHw(id) {
    const hw = homeworks.find(h => h.id === id);
    if (!hw) return logError(`Task ${id} not found for toggle`);
    
    hw.completed = !hw.completed;
    logAction(`${hw.completed ? 'COMPLETED' : 'REOPENED'}: ${hw.task}`);
    render();
}

function deleteHw(id) {
    const hw = homeworks.find(h => h.id === id);
    if (!hw) return logError(`Task ${id} not found for deletion`);
    
    logAction(`DELETED: ${hw.task}`);
    homeworks = homeworks.filter(h => h.id !== id);
    render();
}

function editHw(id) {
    const hw = homeworks.find(h => h.id === id);
    if (!hw) return logError(`Task ${id} not found for edit`);
    
    const newTask = prompt("Update task description:", hw.task);
    if (newTask !== null && newTask.trim() !== "") {
        hw.task = newTask.trim();
        logAction(`EDITED: New name is "${hw.task}"`);
        render();
    }
}

function clearCompleted() {
    const count = homeworks.filter(h => h.completed).length;
    homeworks = homeworks.filter(h => !h.completed);
    logAction(`CLEARED: Removed ${count} tasks`);
    render();
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('text-indigo-600', 'border-b-2', 'border-indigo-600');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.getElementById(`filter-${filter}`);
    if (activeBtn) activeBtn.classList.add('text-indigo-600', 'border-b-2', 'border-indigo-600');
    render();
}

function updateStats() {
    const statsEl = document.getElementById('stats');
    if (!statsEl) return;
    const total = homeworks.length;
    const done = homeworks.filter(h => h.completed).length;
    statsEl.innerText = total === 0 ? "No tasks yet" : `${done} of ${total} tasks completed`;
}

logAction("System Online");
render();