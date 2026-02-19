class Store {
    constructor() {
        this.data = JSON.parse(localStorage.getItem('workoutTrackerData')) || {
            weeks: [{ id: Date.now(), name: 'Week 1', workoutIds: [] }],
            workouts: {}, // workoutId -> { id, date, title, exercises: [] }
            templates: [
                { name: 'Push', exercises: [] },
                { name: 'Pull', exercises: [] },
                { name: 'Legs', exercises: [] }
            ],
            weights: [] // { date: 'YYYY-MM-DD', weight: number }
        };
        this.save();
    }

    save() {
        localStorage.setItem('workoutTrackerData', JSON.stringify(this.data));
    }

    getWeeks() {
        return this.data.weeks;
    }

    addWeek() {
        const nextWeekNum = this.data.weeks.length + 1;
        const newWeek = {
            id: Date.now(),
            name: `Week ${nextWeekNum}`,
            workoutIds: []
        };
        this.data.weeks.push(newWeek);
        this.save();
        return newWeek;
    }

    getWorkout(id) {
        return this.data.workouts[id];
    }

    getWorkouts() {
        return Object.values(this.data.workouts);
    }

    addWorkout(weekId, workout) {
        const id = Date.now();
        workout.id = id;
        this.data.workouts[id] = workout;
        const week = this.data.weeks.find(w => w.id === weekId);
        if (week) {
            week.workoutIds.push(id);
        }
        this.save();
        return workout;
    }

    updateWorkout(workout) {
        this.data.workouts[workout.id] = workout;
        this.save();
    }

    getTemplates() {
        return this.data.templates;
    }

    addTemplate(template) {
        this.data.templates.push(template);
        this.save();
    }

    addWeight(date, weight) {
        const existingIndex = this.data.weights.findIndex(w => w.date === date);
        if (existingIndex !== -1) {
            this.data.weights[existingIndex].weight = weight;
        } else {
            this.data.weights.push({ date, weight });
        }
        this.data.weights.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.save();
    }

    getWeights() {
        return this.data.weights;
    }

    getWeightForDate(date) {
        return this.data.weights.find(w => w.date === date);
    }
}

const store = new Store();

class App {
    constructor() {
        this.activeTab = 'week'; // 'week', 'weight', 'calendar'
        this.activeWeekId = store.getWeeks()[0].id;
        this.editingWorkout = null;
        this.currentCalendarDate = new Date();

        this.weekTabsContainer = document.getElementById('week-tabs');
        this.addWeekBtn = document.getElementById('add-week-btn');
        this.weightTabBtn = document.getElementById('weight-tab-btn');
        this.calendarTabBtn = document.getElementById('calendar-tab-btn');
        this.contentArea = document.getElementById('content-area');

        this.init();
    }

    init() {
        this.addWeekBtn.addEventListener('click', () => {
            const newWeek = store.addWeek();
            this.activeWeekId = newWeek.id;
            this.activeTab = 'week';
            this.render();
        });

        this.weightTabBtn.addEventListener('click', () => {
            this.activeTab = 'weight';
            this.render();
        });

        this.calendarTabBtn.addEventListener('click', () => {
            this.activeTab = 'calendar';
            this.render();
        });

        this.render();
    }

    render() {
        this.renderTabs();
        this.renderContent();
    }

    renderTabs() {
        this.weekTabsContainer.innerHTML = '';
        store.getWeeks().forEach(week => {
            const btn = document.createElement('button');
            btn.className = `tab-btn ${this.activeTab === 'week' && this.activeWeekId === week.id ? 'active' : ''}`;
            btn.textContent = week.name;
            btn.onclick = () => {
                this.activeTab = 'week';
                this.activeWeekId = week.id;
                this.editingWorkout = null;
                this.render();
            };
            this.weekTabsContainer.appendChild(btn);
        });

        this.weightTabBtn.className = `tab-btn ${this.activeTab === 'weight' ? 'active' : ''}`;
        this.calendarTabBtn.className = `tab-btn ${this.activeTab === 'calendar' ? 'active' : ''}`;
    }

    renderContent() {
        this.contentArea.innerHTML = '';
        if (this.editingWorkout) {
            this.renderWorkoutEditor();
        } else if (this.activeTab === 'week') {
            this.renderWeekContent();
        } else if (this.activeTab === 'weight') {
            this.renderWeightContent();
        } else if (this.activeTab === 'calendar') {
            this.renderCalendarContent();
        }
    }

    renderWeekContent() {
        const week = store.getWeeks().find(w => w.id === this.activeWeekId);
        const header = document.createElement('div');
        header.innerHTML = `
            <h1>${week.name}</h1>
            <div class="workout-controls">
                <button class="primary-btn" id="create-workout-btn">Create Workout for Today</button>
            </div>
            <div id="week-workouts-list"></div>
        `;
        this.contentArea.appendChild(header);

        const list = document.getElementById('week-workouts-list');
        week.workoutIds.forEach(id => {
            const workout = store.getWorkout(id);
            const item = document.createElement('div');
            item.className = 'exercise-block';
            item.innerHTML = `
                <div class="exercise-header">
                    <span class="exercise-title">${workout.title} (${workout.date})</span>
                    <button class="secondary-btn" onclick="app.editWorkout(${workout.id})">View/Edit</button>
                </div>
            `;
            list.appendChild(item);
        });

        document.getElementById('create-workout-btn').onclick = () => this.createNewWorkout();
    }

    createNewWorkout() {
        this.editingWorkout = {
            id: null,
            title: 'New Workout',
            date: new Date().toISOString().split('T')[0],
            exercises: []
        };
        this.render();
    }

    editWorkout(id) {
        this.editingWorkout = JSON.parse(JSON.stringify(store.getWorkout(id)));
        this.render();
    }

    renderWorkoutEditor() {
        const templates = store.getTemplates();
        let templateOptions = templates.map(t => `<option value="${t.name}">${t.name}</option>`).join('');

        this.contentArea.innerHTML = `
            <header>
                <div class="workout-controls">
                    <input type="text" id="workout-title-input" value="${this.editingWorkout.title}" placeholder="Workout Title">
                    <input type="date" id="workout-date-input" value="${this.editingWorkout.date}">
                </div>
                ${!this.editingWorkout.id ? `
                <div class="template-selector">
                    <label>Start from template:</label>
                    <select id="template-select">
                        <option value="">-- Custom --</option>
                        ${templateOptions}
                    </select>
                </div>
                ` : ''}
            </header>
            <div id="exercises-container"></div>
            <div class="workout-controls">
                <button class="secondary-btn" id="add-exercise-btn">Add Exercise</button>
                <button class="primary-btn" id="save-workout-btn">Save Workout</button>
                <button class="secondary-btn" id="save-template-btn-action">Save as Template</button>
                <button class="danger-btn" id="cancel-edit-btn">Cancel</button>
            </div>
        `;

        const container = document.getElementById('exercises-container');
        this.editingWorkout.exercises.forEach((ex, exIdx) => {
            const exBlock = document.createElement('div');
            exBlock.className = 'exercise-block';
            exBlock.innerHTML = `
                <div class="exercise-header">
                    <input type="text" class="exercise-title-input" value="${ex.name}" placeholder="Exercise Name" data-idx="${exIdx}">
                    <button class="danger-btn" onclick="app.removeExercise(${exIdx})">Remove</button>
                </div>
                <div class="sets-list" data-idx="${exIdx}"></div>
                <button class="secondary-btn" onclick="app.addSet(${exIdx})">Add Set</button>
                <button class="secondary-btn" onclick="app.toggle1RMGraph(${exIdx})">Toggle 1RM Graph</button>
                <div class="graph-container" id="graph-ex-${exIdx}" style="display:none">
                    <canvas id="chart-ex-${exIdx}"></canvas>
                </div>
            `;
            container.appendChild(exBlock);

            const setsList = exBlock.querySelector('.sets-list');
            ex.sets.forEach((set, setIdx) => {
                const setRow = document.createElement('div');
                setRow.className = 'set-row';
                setRow.innerHTML = `
                    <label>Set ${setIdx + 1}</label>
                    <input type="number" placeholder="Weight" value="${set.weight}" onchange="app.updateSet(${exIdx}, ${setIdx}, 'weight', this.value)">
                    <input type="number" placeholder="Reps" value="${set.reps}" onchange="app.updateSet(${exIdx}, ${setIdx}, 'reps', this.value)">
                    <button class="danger-btn" onclick="app.removeSet(${exIdx}, ${setIdx})">×</button>
                `;
                setsList.appendChild(setRow);
            });
        });

        document.getElementById('workout-title-input').onchange = (e) => this.editingWorkout.title = e.target.value;
        document.getElementById('workout-date-input').onchange = (e) => this.editingWorkout.date = e.target.value;
        document.querySelectorAll('.exercise-title-input').forEach(input => {
            input.onchange = (e) => this.editingWorkout.exercises[e.target.dataset.idx].name = e.target.value;
        });

        if (!this.editingWorkout.id) {
            document.getElementById('template-select').onchange = (e) => this.applyTemplate(e.target.value);
        }

        document.getElementById('add-exercise-btn').onclick = () => this.addExercise();
        document.getElementById('save-workout-btn').onclick = () => this.saveWorkout();
        document.getElementById('save-template-btn-action').onclick = () => this.saveAsTemplate();
        document.getElementById('cancel-edit-btn').onclick = () => {
            this.editingWorkout = null;
            this.render();
        };
    }

    applyTemplate(templateName) {
        if (!templateName) return;
        const template = store.getTemplates().find(t => t.name === templateName);
        if (template) {
            this.editingWorkout.title = template.name;
            this.editingWorkout.exercises = JSON.parse(JSON.stringify(template.exercises));
            this.render();
        }
    }

    addExercise() {
        this.editingWorkout.exercises.push({ name: '', sets: [{ weight: '', reps: '' }] });
        this.render();
    }

    removeExercise(idx) {
        this.editingWorkout.exercises.splice(idx, 1);
        this.render();
    }

    addSet(exIdx) {
        const sets = this.editingWorkout.exercises[exIdx].sets;
        const lastSet = sets[sets.length - 1] || { weight: '', reps: '' };
        sets.push({ ...lastSet });
        this.render();
    }

    updateSet(exIdx, setIdx, field, value) {
        this.editingWorkout.exercises[exIdx].sets[setIdx][field] = parseFloat(value) || 0;
    }

    removeSet(exIdx, setIdx) {
        this.editingWorkout.exercises[exIdx].sets.splice(setIdx, 1);
        this.render();
    }

    saveWorkout() {
        if (this.editingWorkout.id) {
            store.updateWorkout(this.editingWorkout);
        } else {
            store.addWorkout(this.activeWeekId, this.editingWorkout);
        }
        this.editingWorkout = null;
        this.render();
    }

    saveAsTemplate() {
        const name = prompt('Enter template name:', this.editingWorkout.title);
        if (name) {
            const template = {
                name: name,
                exercises: JSON.parse(JSON.stringify(this.editingWorkout.exercises)).map(ex => {
                    return ex;
                })
            };
            store.addTemplate(template);
            alert('Template saved!');
            this.render();
        }
    }

    renderWeightContent() {
        this.contentArea.innerHTML = `
            <h1>Weight Tracking</h1>
            <div class="weight-tracking-container">
                <div class="exercise-block">
                    <h3>Log Weight</h3>
                    <div class="workout-controls">
                        <input type="date" id="weight-date-input" value="${new Date().toISOString().split('T')[0]}">
                        <input type="number" id="weight-value-input" placeholder="Weight">
                        <button class="primary-btn" id="save-weight-btn">Log Weight</button>
                    </div>
                </div>
                <div class="graph-container">
                    <canvas id="weight-chart"></canvas>
                </div>
                <div id="weight-history">
                    <h3>History</h3>
                    <ul id="weight-list"></ul>
                </div>
            </div>
        `;

        const weightList = document.getElementById('weight-list');
        store.getWeights().forEach(w => {
            const li = document.createElement('li');
            li.textContent = `${w.date}: ${w.weight}`;
            weightList.appendChild(li);
        });

        document.getElementById('save-weight-btn').onclick = () => {
            const date = document.getElementById('weight-date-input').value;
            const weight = parseFloat(document.getElementById('weight-value-input').value);
            if (date && weight) {
                store.addWeight(date, weight);
                this.render();
            }
        };

        this.renderWeightGraph();
    }

    calculateTrendLine(data) {
        if (data.length < 2) return null;
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        data.forEach((p, i) => {
            sumX += i;
            sumY += p;
            sumXY += i * p;
            sumXX += i * i;
        });
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        return data.map((_, i) => slope * i + intercept);
    }

    renderWeightGraph() {
        const weights = store.getWeights();
        if (weights.length === 0) return;

        const canvas = document.getElementById('weight-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const labels = weights.map(w => w.date);
        const data = weights.map(w => w.weight);
        const trendLine = this.calculateTrendLine(data);

        const datasets = [{
            label: 'Weight',
            data: data,
            borderColor: '#bb86fc',
            tension: 0.1,
            fill: false
        }];

        if (trendLine) {
            datasets.push({
                label: 'Trend',
                data: trendLine,
                borderColor: '#03dac6',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            });
        }

        new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: '#333' }, ticks: { color: '#e0e0e0' } },
                    x: { grid: { color: '#333' }, ticks: { color: '#e0e0e0' } }
                },
                plugins: {
                    legend: { labels: { color: '#e0e0e0' } }
                }
            }
        });
    }

    renderCalendarContent() {
        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.currentCalendarDate);

        this.contentArea.innerHTML = `
            <div class="calendar-header">
                <button class="secondary-btn" id="prev-month">&lt;</button>
                <h1>${monthName} ${year}</h1>
                <button class="secondary-btn" id="next-month">&gt;</button>
            </div>
            <div class="calendar-grid">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div class="calendar-grid" id="calendar-days"></div>
        `;

        document.getElementById('prev-month').onclick = () => {
            this.currentCalendarDate.setMonth(month - 1);
            this.render();
        };
        document.getElementById('next-month').onclick = () => {
            this.currentCalendarDate.setMonth(month + 1);
            this.render();
        };

        const daysContainer = document.getElementById('calendar-days');
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day';
            daysContainer.appendChild(empty);
        }

        const workouts = store.getWorkouts();
        const todayStr = new Date().toISOString().split('T')[0];

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;

            if (dateStr === todayStr) dayEl.classList.add('today');

            const hasWorkout = workouts.some(w => w.date === dateStr);
            if (hasWorkout) {
                dayEl.classList.add('workout-done');
            } else if (dateStr < todayStr) {
                dayEl.classList.add('workout-missed');
            }

            dayEl.onclick = () => this.showDayDetails(dateStr);
            daysContainer.appendChild(dayEl);
        }
    }

    showDayDetails(date) {
        const workout = store.getWorkouts().find(w => w.date === date);
        const weight = store.getWeightForDate(date);

        const modal = document.getElementById('day-modal');
        const modalDate = document.getElementById('modal-date');
        const modalBody = document.getElementById('modal-body');

        modalDate.textContent = date;
        modalBody.innerHTML = '';

        if (workout) {
            const wInfo = document.createElement('div');
            wInfo.innerHTML = `<h3>Workout: ${workout.title}</h3>`;
            workout.exercises.forEach(ex => {
                const exInfo = document.createElement('div');
                exInfo.innerHTML = `<strong>${ex.name}</strong>: ${ex.sets.length} sets`;
                wInfo.appendChild(exInfo);
            });
            modalBody.appendChild(wInfo);
        } else {
            modalBody.innerHTML += '<p>No workout recorded.</p>';
        }

        if (weight) {
            modalBody.innerHTML += `<p><strong>Weight:</strong> ${weight.weight}</p>`;
        } else {
            modalBody.innerHTML += '<p>No weight recorded.</p>';
        }

        modal.style.display = 'flex';
    }

    calculate1RM(weight, reps) {
        if (reps === 1) return weight;
        return weight * (1 + reps / 30);
    }

    get1RMHistory(exerciseName) {
        const workouts = store.getWorkouts();
        const history = [];
        workouts.forEach(w => {
            const exercise = w.exercises.find(ex => ex.name.toLowerCase() === exerciseName.toLowerCase());
            if (exercise) {
                let max1RM = 0;
                exercise.sets.forEach(set => {
                    const oneRM = this.calculate1RM(set.weight, set.reps);
                    if (oneRM > max1RM) max1RM = oneRM;
                });
                if (max1RM > 0) {
                    history.push({ date: w.date, oneRM: max1RM });
                }
            }
        });
        return history.sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    toggle1RMGraph(exIdx) {
        const container = document.getElementById(`graph-ex-${exIdx}`);
        if (container.style.display === 'none') {
            container.style.display = 'block';
            this.render1RMGraph(exIdx);
        } else {
            container.style.display = 'none';
        }
    }

    render1RMGraph(exIdx) {
        const exercise = this.editingWorkout.exercises[exIdx];
        if (!exercise.name) return;

        const history = this.get1RMHistory(exercise.name);
        if (history.length === 0) {
            // Include current workout's potential 1RM if not saved yet
            let currentMax1RM = 0;
            exercise.sets.forEach(set => {
                const oneRM = this.calculate1RM(set.weight, set.reps);
                if (oneRM > currentMax1RM) currentMax1RM = oneRM;
            });
            if (currentMax1RM > 0) {
                history.push({ date: this.editingWorkout.date, oneRM: currentMax1RM });
            }
        }

        if (history.length === 0) return;

        const ctx = document.getElementById(`chart-ex-${exIdx}`).getContext('2d');
        const labels = history.map(h => h.date);
        const data = history.map(h => h.oneRM);
        const trendLine = this.calculateTrendLine(data);

        const datasets = [{
            label: 'Estimated 1RM',
            data: data,
            borderColor: '#bb86fc',
            tension: 0.1,
            fill: false
        }];

        if (trendLine) {
            datasets.push({
                label: 'Trend',
                data: trendLine,
                borderColor: '#03dac6',
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false
            });
        }

        new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: '#333' }, ticks: { color: '#e0e0e0' } },
                    x: { grid: { color: '#333' }, ticks: { color: '#e0e0e0' } }
                },
                plugins: {
                    legend: { labels: { color: '#e0e0e0' } }
                }
            }
        });
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
