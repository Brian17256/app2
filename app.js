// State Management
let habits = JSON.parse(localStorage.getItem('habits')) || [];

// DOM Elements
const habitList = document.getElementById('habit-list');
const addHabitBtn = document.getElementById('add-habit-btn');
const modalContainer = document.getElementById('modal-container');
const modalContent = document.getElementById('modal-content');

// Constants
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GOAL_DAYS = 90;

// Initialize
function init() {
    renderHabits();
    setInterval(updateClocks, 1000);
}

// Logic Functions
function calculateProgress(habit) {
    const now = Date.now();
    const elapsedMs = now - habit.lastResetAt;
    const elapsedDays = Math.floor(elapsedMs / MS_PER_DAY);
    const currentCounter = habit.manualDays + elapsedDays;
    
    // Remaining time for micro-clock
    const remainingMs = elapsedMs % MS_PER_DAY;
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
    
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Update Racha dynamically
    if (currentCounter > habit.racha) {
        habit.racha = currentCounter;
        saveHabits();
    }
    
    return {
        counter: currentCounter,
        timeStr: timeStr,
        percent: Math.min((currentCounter / GOAL_DAYS) * 100, 100)
    };
}

function saveHabits() {
    localStorage.setItem('habits', JSON.stringify(habits));
}

function renderHabits() {
    habitList.innerHTML = '';
    // Sort by order
    const sortedHabits = [...habits].sort((a, b) => a.order - b.order);
    
    sortedHabits.forEach((habit, index) => {
        const { counter, timeStr, percent } = calculateProgress(habit);
        const isGoalReached = counter >= GOAL_DAYS;
        
        const card = document.createElement('div');
        card.className = 'habit-card';
        card.dataset.id = habit.id;
        
        card.innerHTML = `
            <div class="habit-header">
                <div class="habit-info">
                    <div class="habit-title-row">
                        ${habit.image ? `<img src="${habit.image}" class="habit-thumb">` : `<div class="habit-thumb-placeholder"></div>`}
                        <h2>${habit.name}</h2>
                    </div>
                </div>
                <div class="habit-controls">
                    <button class="btn-icon move-up" onclick="moveHabit('${habit.id}', -1)">↑</button>
                    <button class="btn-icon move-down" onclick="moveHabit('${habit.id}', 1)">↓</button>
                    <button class="btn-icon delete-habit" onclick="confirmDelete('${habit.id}')">🗑️</button>
                </div>
            </div>
            
            <div class="progress-container">
                <div class="progress-bar" style="width: ${percent}%"></div>
            </div>
            
            <div class="counter-display">
                <span class="day-count">${counter}</span>
                <span class="day-label">DÍAS</span>
                <span class="micro-clock ${isGoalReached ? 'hidden-clock' : ''}" id="clock-${habit.id}">${timeStr}</span>
                ${isGoalReached ? '<div class="milestone-msg">Hábito de mejor tiempo alcanzado - 3 Meses</div>' : ''}
            </div>
            
            <div class="racha-badge">
                <span>Racha:</span>
                <span class="racha-value">${habit.racha} días</span>
            </div>
            
            <div class="card-actions">
                <button class="btn btn-fallo" onclick="handleFallo('${habit.id}')">Fallo</button>
                <button class="btn btn-editar" onclick="openEditModal('${habit.id}')">Editar</button>
            </div>
        `;
        
        habitList.appendChild(card);
    });
}

function updateClocks() {
    habits.forEach(habit => {
        const { counter, timeStr } = calculateProgress(habit);
        const clockEl = document.getElementById(`clock-${habit.id}`);
        if (clockEl) {
            clockEl.textContent = timeStr;
            // Also update the counter if it flipped
            const card = document.querySelector(`.habit-card[data-id="${habit.id}"]`);
            if (card) {
                const countEl = card.querySelector('.day-count');
                if (countEl && parseInt(countEl.textContent) !== counter) {
                    renderHabits(); // Re-render to update UI states (milestones, bars)
                }
            }
        }
    });
}

// Actions
function handleFallo(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    const { counter } = calculateProgress(habit);
    let penalty = 0;
    
    // Calculate penalty for display and logic
    if (habit.racha > 3) {
        if (counter === 0) penalty = 4;
        else if (counter === 1) penalty = 3;
        else if (counter === 2) penalty = 2;
        else if (counter === 3) penalty = 1;
    }

    showModal(`
        <h2 style="margin-bottom: 15px; font-family: 'Outfit'; color: #ef4444;">¿Confirmar Fallo?</h2>
        <p style="color: var(--text-secondary); margin-bottom: 20px; line-height: 1.5;">
            Esto reiniciará tu contador actual a 0.<br><br>
            <span style="color: #ffffff; font-weight: bold;">Penalización de Racha:</span> 
            <span style="color: ${penalty > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;">
                ${penalty > 0 ? `-${penalty} días` : '0 días (Sin penalización)'}
            </span>
        </p>
        <div class="modal-actions">
            <button class="btn btn-fallo" onclick="executeFallo('${id}', ${penalty})">Confirmar Fallo</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        </div>
    `);
}

function executeFallo(id, penalty) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    // Apply penalty
    habit.racha = Math.max(0, habit.racha - penalty);
    
    // Reset counter
    habit.manualDays = 0;
    habit.lastResetAt = Date.now();
    
    saveHabits();
    renderHabits();
    closeModal();
}

function moveHabit(id, direction) {
    const index = habits.findIndex(h => h.id === id);
    if (index < 0) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= habits.length) return;
    
    // Swap orders
    const temp = habits[index].order;
    habits[index].order = habits[newIndex].order;
    habits[newIndex].order = temp;
    
    // Re-sort and save
    habits.sort((a, b) => a.order - b.order);
    // Assign clean indices to order
    habits.forEach((h, i) => h.order = i);
    
    saveHabits();
    renderHabits();
}

function confirmDelete(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este hábito?')) {
        habits = habits.filter(h => h.id !== id);
        saveHabits();
        renderHabits();
    }
}

// Modal Handlers
addHabitBtn.onclick = () => {
    tempImageData = null;
    showModal(`
        <h2 style="margin-bottom: 20px; font-family: 'Outfit';">Nuevo Hábito</h2>
        
        <div class="image-upload-section">
            <div class="image-preview-container" onclick="document.getElementById('image-input').click()">
                <img id="edit-image-preview" src="" class="hidden">
                <div id="image-placeholder">
                    <span>📷</span>
                    <p>Añadir Foto</p>
                </div>
            </div>
            <input type="file" id="image-input" accept="image/*" class="hidden" onchange="processImage(this)">
        </div>

        <div class="input-group">
            <label>Nombre del hábito</label>
            <input type="text" id="new-habit-name" placeholder="Ej: Ejercicio, Lectura..." autofocus>
        </div>
        <div class="modal-actions">
            <button class="btn btn-primary" onclick="createHabit()">Crear</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        </div>
    `);
};

function createHabit() {
    const nameInput = document.getElementById('new-habit-name');
    const name = nameInput.value.trim();
    if (!name) return;
    
    const newHabit = {
        id: Date.now().toString(),
        name: name,
        createdAt: Date.now(),
        lastResetAt: Date.now(),
        racha: 0,
        manualDays: 0,
        image: tempImageData,
        order: habits.length
    };
    
    tempImageData = null;
    habits.push(newHabit);
    saveHabits();
    renderHabits();
    closeModal();
}

function openEditModal(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    tempImageData = null;
    const { counter } = calculateProgress(habit);
    
    showModal(`
        <h2 style="margin-bottom: 20px; font-family: 'Outfit';">Editar Hábito</h2>
        
        <div class="image-upload-section">
            <div class="image-preview-container" onclick="document.getElementById('image-input').click()">
                <img id="edit-image-preview" src="${habit.image || ''}" class="${habit.image ? '' : 'hidden'}">
                <div id="image-placeholder" class="${habit.image ? 'hidden' : ''}">
                    <span>📷</span>
                    <p>Subir Imagen</p>
                </div>
            </div>
            <input type="file" id="image-input" accept="image/*" class="hidden" onchange="processImage(this)">
            ${habit.image ? `<button class="btn-remove-img" onclick="removeHabitImage('${id}')">Eliminar Imagen</button>` : ''}
        </div>

        <div class="input-group">
            <label>Nombre del hábito</label>
            <input type="text" id="edit-name" value="${habit.name}">
        </div>

        <div class="input-group">
            <label>Días actuales</label>
            <input type="number" id="edit-days" value="${counter}" min="${counter}" oninput="cleanNumberInput(this)">
            <p style="font-size: 0.8rem; color: #666; margin-top: 5px;">*Solo puedes aumentar o mantener los días.</p>
        </div>
        <div class="modal-actions">
            <button class="btn btn-primary" onclick="updateHabit('${id}')">Guardar</button>
            <button class="btn btn-fallo" onclick="resetHabit('${id}')">Reset</button>
            <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
        </div>
    `);
}

let tempImageData = null;

function processImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Resize using Canvas
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 300;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                tempImageData = canvas.toDataURL('image/jpeg', 0.7);
                
                // Update Preview
                document.getElementById('edit-image-preview').src = tempImageData;
                document.getElementById('edit-image-preview').classList.remove('hidden');
                document.getElementById('image-placeholder').classList.add('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function updateHabit(id) {
    const habit = habits.find(h => h.id === id);
    const newName = document.getElementById('edit-name').value.trim();
    const newDays = parseInt(document.getElementById('edit-days').value);
    const { counter } = calculateProgress(habit);

    if (!newName) return;
    if (isNaN(newDays) || newDays < counter) {
        alert("No se puede disminuir el contador manualmente.");
        return;
    }

    habit.name = newName;
    if (newDays !== counter) {
        habit.manualDays = newDays;
        habit.lastResetAt = Date.now();
    }
    
    if (tempImageData) {
        habit.image = tempImageData;
        tempImageData = null;
    }

    if (habit.manualDays > habit.racha) habit.racha = habit.manualDays;

    saveHabits();
    renderHabits();
    closeModal();
}

function removeHabitImage(id) {
    const habit = habits.find(h => h.id === id);
    habit.image = null;
    tempImageData = null;
    saveHabits();
    renderHabits();
    closeModal();
}

function resetHabit(id) {
    const habit = habits.find(h => h.id === id);
    habit.manualDays = 0;
    habit.lastResetAt = Date.now();
    habit.racha = 0; // Wipe card to original 0 state
    
    saveHabits();
    renderHabits();
    closeModal();
}

function showModal(content) {
    modalContent.innerHTML = content;
    modalContainer.classList.remove('hidden');
}

function closeModal() {
    modalContainer.classList.add('hidden');
}

// UI Helper to remove leading zeros
function cleanNumberInput(el) {
    if (el.value.length > 1 && el.value.startsWith('0')) {
        el.value = el.value.replace(/^0+/, '');
    }
    if (el.value === '') el.value = '0';
}

// Helper to close modal on background click
modalContainer.onclick = (e) => {
    if (e.target === modalContainer) closeModal();
};

// Start the app
init();
