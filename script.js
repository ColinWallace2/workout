document.addEventListener('DOMContentLoaded', () => {
    const addSetBtn = document.getElementById('add-set-btn');
    const setsContainer = document.getElementById('sets-container');
    let setCounter = 0;

    function addSet() {
        setCounter++;
        const setRow = document.createElement('div');
        setRow.className = 'set-row';
        setRow.innerHTML = `
            <label>Set ${setCounter}</label>
            <input type="number" class="reps-input" placeholder="Reps" min="0">
        `;
        setsContainer.appendChild(setRow);
    }

    addSetBtn.addEventListener('click', addSet);

    // Add an initial set
    addSet();
});
