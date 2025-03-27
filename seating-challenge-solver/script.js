document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const GRID_SIZE = 4;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    const MAX_CIRCLES = 8;
    // Make COLORS easily accessible for class removal
    const COLORS = ['uncolored', 'red', 'green', 'blue', 'purple'];

    // --- State Variables ---
    let currentPhase = 'placement'; // 'placement' or 'coloring'
    let hwState = 'init'; // global variable to track Homework button state
    let placedCircles = new Array(TOTAL_CELLS).fill(false); // Tracks if cell index has a circle
    let circleColors = {}; // Tracks color of circle at cell index { cellIndex: 'color' }
    let placedCircleIndices = []; // Stores cell indices (0-15) where circles are placed
    let adjacencyMap = {}; // Dynamic adjacency { placedCircleSequentialIndex: [neighborSequentialIndices...] }
    let feedbackTimeout;

    // --- DOM References ---
    const gridContainer = document.getElementById('grid-container');
    const instructionsDisplay = document.getElementById('instructions');
    const feedbackDisplay = document.getElementById('feedback-area');
    const confirmButton = document.getElementById('confirm-button');
    const checkButton = document.getElementById('check-button');
    const resetButton = document.getElementById('reset-button');
    const resultsSpans = {
        rule1: document.querySelector('#rule-1 .status'),
        rule2: document.querySelector('#rule-2 .status'),
        rule3: document.querySelector('#rule-3 .status'),
        rule4: document.querySelector('#rule-4 .status'),
        rule5: document.querySelector('#rule-5 .status'),
        rule6: document.querySelector('#rule-6 .status'),
    };
    const resultsItems = {
        rule1: document.getElementById('rule-1'),
        rule2: document.getElementById('rule-2'),
        rule3: document.getElementById('rule-3'),
        rule4: document.getElementById('rule-4'),
        rule5: document.getElementById('rule-5'),
        rule6: document.getElementById('rule-6'),
    }
    let gridCells = [];
    const homeworkButton = document.getElementById('homework-button'); // Moved outside setupHomeworkButton

    // --- Initialization ---
    function init() {
        createGrid();
        addEventListeners();
        setPhase('placement');
        clearResults();
        setupHomeworkButton(); // Add Homework button functionality
    }

    function setupHomeworkButton() {
        // Removed: const homeworkButton = document.getElementById('homework-button'); 

        homeworkButton.addEventListener('click', () => {
            if (hwState === 'init') {
                setPhase('placement'); // ADDED: ensure we are in placement phase
                // Set uncolored Homework layout
                placedCircles.fill(false);
                circleColors = {};
                const homeworkIndices = [1, 4, 5, 6, 7, 9, 10, 14];
                homeworkIndices.forEach(i => {
                    placedCircles[i] = true;
                    circleColors[i] = 'uncolored';
                });
                gridCells.forEach((_, i) => updateCellVisual(i));
                generateAdjacencyMap();
                handleConfirm(); 
                homeworkButton.textContent = 'Show Answer';
                hwState = 'uncolored';
            } else if (hwState === 'uncolored') {
                // Removed: const userAnswer = prompt('Which machine sends documents using a phone line?');
                showAnswerModal();
            } else if (hwState === 'answer') {
                // Revert back to the uncolored Homework layout
                placedCircles.fill(false);
                circleColors = {};
                const homeworkIndices = [1, 4, 5, 6, 7, 9, 10, 14];
                homeworkIndices.forEach(i => {
                    placedCircles[i] = true;
                    circleColors[i] = 'uncolored';
                });
                gridCells.forEach((_, i) => updateCellVisual(i));
                generateAdjacencyMap();
                handleConfirm(); 
                homeworkButton.textContent = 'Show Answer';
                hwState = 'uncolored';
            }
        });
    }

    // New functions for custom answer modal
    const answerModal = document.getElementById('answer-modal');
    const answerInput = document.getElementById('answer-input');
    const answerSubmit = document.getElementById('answer-submit');
    const answerCancel = document.getElementById('answer-cancel');

    function showAnswerModal() {
        answerModal.classList.remove('hidden');
        answerInput.value = '';
        answerInput.focus();
    }

    answerSubmit.addEventListener('click', () => {
        const userAnswer = answerInput.value.trim().toLowerCase();
        answerModal.classList.add('hidden');
        if (userAnswer === 'fax') {
            // Set final arrangement with colors
            placedCircles.fill(false);
            circleColors = {};
            placedCircles[1] = true;  circleColors[1]  = 'green';
            placedCircles[4] = true;  circleColors[4]  = 'purple';
            placedCircles[5] = true;  circleColors[5]  = 'purple';
            placedCircles[6] = true;  circleColors[6]  = 'red';
            placedCircles[7] = true;  circleColors[7]  = 'purple';
            placedCircles[9] = true;  circleColors[9]  = 'green';
            placedCircles[10] = true; circleColors[10] = 'blue';
            placedCircles[14] = true; circleColors[14] = 'green';

            gridCells.forEach((_, i) => updateCellVisual(i));
            generateAdjacencyMap();
            handleCheck();
            homeworkButton.textContent = 'Homework';
            hwState = 'answer';
        } else {
            showFeedback('Wrong answer');
        }
    });

    answerCancel.addEventListener('click', () => {
        answerModal.classList.add('hidden');
        showFeedback('Action canceled');
    });

    // --- Grid Creation ---
    function createGrid() {
        gridContainer.innerHTML = '';
        gridCells = [];
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.index = i;

            const circlePlaceholder = document.createElement('div');
            circlePlaceholder.classList.add('circle-placeholder');
            cell.appendChild(circlePlaceholder);

            gridContainer.appendChild(cell);
            gridCells.push(cell);
        }
    }

    // --- Event Listeners ---
    function addEventListeners() {
        gridContainer.addEventListener('click', handleCellClick);
        confirmButton.addEventListener('click', handleConfirm);
        checkButton.addEventListener('click', handleCheck);
        resetButton.addEventListener('click', handleReset);
    }

    // --- Phase Management ---
    function setPhase(phase) {
        currentPhase = phase;
        clearFeedback();
        clearResults();

        if (phase === 'placement') {
            instructionsDisplay.textContent = `Phase 1: Place exactly ${MAX_CIRCLES} circles by clicking grid squares. Click again to remove.`;
            confirmButton.style.display = 'inline-block';
            checkButton.style.display = 'none';
            gridCells.forEach((cell, index) => {
                cell.classList.remove('disabled');
                updateCellVisual(index); // Update visuals based on placement state
            });
        } else if (phase === 'coloring') {
            instructionsDisplay.textContent = `Phase 2: Click circles to assign colors. Use 'Check Validity' when ready.`;
            confirmButton.style.display = 'none';
            checkButton.style.display = 'inline-block';
            gridCells.forEach((cell, index) => {
                if (!placedCircles[index]) {
                    cell.classList.add('disabled');
                } else {
                    cell.classList.remove('disabled'); // Ensure clickable
                    updateCellVisual(index); // Ensure correct color is shown
                }
            });
        }
    }

    // --- UI Update Functions ---

    // ** Refactored updateCellVisual **
    function updateCellVisual(index) {
        const cell = gridCells[index];
        const placeholder = cell.querySelector('.circle-placeholder');
        if (!cell || !placeholder) return;

        // Update cell's 'has-circle' class
        if (placedCircles[index]) {
            cell.classList.add('has-circle');
        } else {
            cell.classList.remove('has-circle');
        }

        // Update placeholder's color class using classList add/remove
        // Remove all potential color classes first
        COLORS.forEach(colorName => {
            placeholder.classList.remove(colorName);
        });

        // Add the correct color class if a circle is present
        if (placedCircles[index]) {
            const color = circleColors[index] || 'uncolored';
            placeholder.classList.add(color); // Add the current color class ('uncolored', 'red', etc.)
        }
        // Note: If no circle is placed, the placeholder is hidden by CSS via the absence
        // of '.has-circle' on the parent '.grid-cell', so placeholder classes don't matter then.
    }

    function showFeedback(message, duration = 2500) {
         clearTimeout(feedbackTimeout);
         feedbackDisplay.textContent = message;
         feedbackTimeout = setTimeout(() => {
             feedbackDisplay.textContent = '';
         }, duration);
     }

     function clearFeedback() {
         clearTimeout(feedbackTimeout);
         feedbackDisplay.textContent = '';
     }


    // --- Event Handlers ---
    function handleCellClick(event) {
        const cell = event.target.closest('.grid-cell');
        // No need to check .disabled class here if pointer-events: none is used,
        // but keeping it is harmless and acts as a backup.
        if (!cell || cell.classList.contains('disabled')) {
            // console.log('Click ignored on disabled or non-cell area');
            return;
        }
    
        const index = parseInt(cell.dataset.index, 10);
        clearFeedback();
    
        if (currentPhase === 'placement') {
            const currentCircleCount = placedCircles.filter(Boolean).length;
            if (placedCircles[index]) {
                placedCircles[index] = false;
                delete circleColors[index];
                updateCellVisual(index);
                // console.log(`Removed circle at index ${index}`);
            } else {
                if (currentCircleCount < MAX_CIRCLES) {
                    placedCircles[index] = true;
                    circleColors[index] = 'uncolored';
                    updateCellVisual(index);
                    // console.log(`Placed circle at index ${index}`);
                } else {
                    showFeedback(`Maximum ${MAX_CIRCLES} circles reached.`);
                }
            }
        } else if (currentPhase === 'coloring') {
            console.log(`Attempting color cycle at index ${index}, has circle: ${placedCircles[index]}`);
            if (placedCircles[index]) {
                // Explicitly log the current color before cycling
                console.log(`Current color before cycling: ${circleColors[index]}`);
                cycleColor(index);
                // Log the new color after cycling
                console.log(`New color after cycling: ${circleColors[index]}`);
                clearResults();
            } else {
                console.log(`Color cycle ignored - no circle at index ${index}`);
            }
        } else {
            showFeedback("Please confirm your circle placement first.");
        }

        // ADDED: switch button text back to "Homework" if layout is no longer Homework uncolored
        if (!isHomeworkUncoloredLayout()) {
            homeworkButton.textContent = 'Homework';
            hwState = 'init';
        }
    }

    function handleConfirm() {
        if (currentPhase !== 'placement') return;
        const placedCount = placedCircles.filter(Boolean).length;
        if (placedCount !== MAX_CIRCLES) {
            showFeedback(`Place exactly ${MAX_CIRCLES} circles. Only ${placedCount} detected.`);
            return;
        }
        generateAdjacencyMap();
        setPhase('coloring');
        // Detect if user has created the homework layout manually
        if (isHomeworkUncoloredLayout()) {
            // If layout matches uncolored Homework, update button text/state
            homeworkButton.textContent = 'Show Answer';
            hwState = 'uncolored';
        } else {
            // Otherwise reset back to the default state
            homeworkButton.textContent = 'Homework';
            hwState = 'init';
        }
    }

    function handleCheck() {
        if (currentPhase !== 'coloring') return;
        validateRules();
    }

    function handleReset() {
        placedCircles.fill(false);
        circleColors = {};
        placedCircleIndices = [];
        adjacencyMap = {};
        // Let setPhase handle visual reset and state change
        setPhase('placement');
        clearFeedback();
    }

    // --- Core Logic Functions ---
    function cycleColor(index) {
        // Skip "uncolored" after first press
        const cycleColors = ['red', 'green', 'blue', 'purple'];
        const currentColor = circleColors[index] || 'uncolored';
        if (currentColor === 'uncolored') {
            circleColors[index] = 'red';
        } else {
            const currentIndex = cycleColors.indexOf(currentColor);
            const nextIndex = (currentIndex + 1) % cycleColors.length;
            circleColors[index] = cycleColors[nextIndex];
        }
        updateCellVisual(index);
    }

    function generateAdjacencyMap() {
        // ... (logic remains the same as previous version) ...
        adjacencyMap = {};
        placedCircleIndices = [];
        for (let i = 0; i < TOTAL_CELLS; i++) {
            if (placedCircles[i]) {
                placedCircleIndices.push(i);
            }
        }
        const gridIndexToSequentialIndex = {};
        placedCircleIndices.forEach((gridIndex, seqIndex) => {
            gridIndexToSequentialIndex[gridIndex] = seqIndex;
        });
        placedCircleIndices.forEach((gridIndex, seqIndex) => {
            adjacencyMap[seqIndex] = [];
            const row = Math.floor(gridIndex / GRID_SIZE);
            const col = gridIndex % GRID_SIZE;
            const neighborsCoords = [
                [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]
            ];
            neighborsCoords.forEach(([nr, nc]) => {
                if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                    const neighborGridIndex = nr * GRID_SIZE + nc;
                    if (placedCircles[neighborGridIndex]) {
                        const neighborSeqIndex = gridIndexToSequentialIndex[neighborGridIndex];
                        if (!adjacencyMap[seqIndex].includes(neighborSeqIndex)) {
                            adjacencyMap[seqIndex].push(neighborSeqIndex);
                        }
                    }
                }
            });
        });
        // console.log("Adj Map:", adjacencyMap); // For debugging
    }

    // --- Validation Logic ---
    function validateRules() {
        // ... (logic remains the same as previous version) ...
        clearResults();
        const numPlaced = placedCircleIndices.length;
        if (numPlaced === 0) {
             showFeedback("No circles placed to validate.");
             Object.keys(resultsSpans).forEach(key => updateResult(key, false));
             return;
        }
        const currentState = placedCircleIndices.map(gridIndex => circleColors[gridIndex] || 'uncolored');

        // Rule 1
        const counts = { red: 0, green: 0, blue: 0, purple: 0, uncolored: 0 };
        currentState.forEach(color => { if (counts.hasOwnProperty(color)) counts[color]++; });
        const rule1Honored = counts.red >= 1 && counts.green >= 1 && counts.blue === 1 && counts.purple >= 1;
        updateResult('rule1', rule1Honored);

        // Rule 2
        let rule2Honored = true;
        for (let i = 0; i < numPlaced; i++) {
            for (const j of (adjacencyMap[i] || [])) {
                if (j > i) {
                    if ((currentState[i] === 'red' && currentState[j] === 'green') || (currentState[i] === 'green' && currentState[j] === 'red')) {
                        rule2Honored = false; break;
                    }
                }
            } if (!rule2Honored) break;
        }
        updateResult('rule2', rule2Honored);

        // Rule 3
        let rule3Honored = true;
        for (let i = 0; i < numPlaced; i++) {
             for (const j of (adjacencyMap[i] || [])) {
                if (j > i) {
                    if ((currentState[i] === 'blue' && currentState[j] === 'purple') || (currentState[i] === 'purple' && currentState[j] === 'blue')) {
                        rule3Honored = false; break;
                    }
                }
            } if (!rule3Honored) break;
        }
        updateResult('rule3', rule3Honored);

        // Rule 4
        let rule4Honored = true;
        const redSeqIndices = currentState.reduce((acc, c, i) => c === 'red' ? [...acc, i] : acc, []);
        if (redSeqIndices.length > 0) {
            for (const i of redSeqIndices) {
                const purpleNeighborCount = (adjacencyMap[i] || []).filter(j => currentState[j] === 'purple').length;
                if (purpleNeighborCount < 2) { rule4Honored = false; break; }
            }
        } // else rule is true if no red
        updateResult('rule4', rule4Honored);

        // Rule 5
        let rule5Honored = false;
        const purpleSeqIndices = currentState.reduce((acc, c, i) => c === 'purple' ? [...acc, i] : acc, []);
        for (const i of purpleSeqIndices) {
            const greenNeighborCount = (adjacencyMap[i] || []).filter(j => currentState[j] === 'green').length;
            if (greenNeighborCount >= 2) { rule5Honored = true; break; }
        }
        updateResult('rule5', rule5Honored);

        // Rule 6
        let rule6Honored = false;
        for (let i = 0; i < numPlaced; i++) {
            if (currentState[i] === 'purple') {
                for (const j of (adjacencyMap[i] || [])) {
                    if (currentState[j] === 'purple') { rule6Honored = true; break; }
                }
            } if (rule6Honored) break;
        }
        updateResult('rule6', rule6Honored);
    }

    // --- Helper Functions ---
    function updateResult(ruleKey, isHonored) {
        // ... (logic remains the same as previous version) ...
         const span = resultsSpans[ruleKey];
        const item = resultsItems[ruleKey];
        if (!span || !item) return;
        const icon = isHonored ? '✔️' : '❌';
        const existingIcon = item.querySelector('.icon');
        if (existingIcon) existingIcon.remove();
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.textContent = icon;
        item.insertBefore(iconSpan, span);
        span.textContent = isHonored ? 'Good' : 'Not Good';
        span.className = `status ${isHonored ? 'honored' : 'violated'}`;
    }

    function clearResults() {
        // ... (logic remains the same as previous version) ...
         Object.keys(resultsSpans).forEach(ruleKey => {
            const span = resultsSpans[ruleKey];
            const item = resultsItems[ruleKey];
            if (span) {
                span.textContent = '(Pending)';
                span.className = 'status pending';
            }
            if (item) {
                const existingIcon = item.querySelector('.icon');
                if (existingIcon) existingIcon.remove();
            }
        });
    }

    function isHomeworkUncoloredLayout() {
        // Check if exactly [1,4,5,6,7,9,10,14] are true and uncolored, all others false
        const hwIndices = [1, 4, 5, 6, 7, 9, 10, 14];
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const shouldBeTrue = hwIndices.includes(i);
            if (placedCircles[i] !== shouldBeTrue) return false;
            if (shouldBeTrue && circleColors[i] !== 'uncolored') return false;
        }
        return true;
    }

    // Initialize the app
    init();
});
