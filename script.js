(function() {
    // ── Persistence ──
    const STORAGE_KEY = 'proposalGameCelebrated';
    const urlParams = new URLSearchParams(window.location.search);   // ← only once
    const shouldReset = urlParams.get('reset') === 'true';

    if (shouldReset) {
        localStorage.removeItem(STORAGE_KEY);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ─── CONFIGURATION ──────────────────
    const RECIPIENT_NAME = 'Jade';   // her name
    const wordList = ['JADE', 'JEREMIAH', 'NIKE', 'COOPER', 'LOVE', 'FOREVER', 'ALWAYS'];
    const riddleData = {
        question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
        options: ["Echo", "Shadow", "Dream", "Song"],
        correct: 0
    };
    const cipherShift = 3;
    const cipherMessage = "L ORYH BRX";   // "I LOVE YOU"
    const coupons = [
        { name: "Dinner at Home", desc: "I'll cook your favorite meal.", cost: 25 },
        { name: "Movie Night", desc: "Complimentary movie + concessions at the Regal theater", cost: 50 },
        { name: "$50 Barnes & Noble Gift Card", desc: "This counts as Romantasy right?", cost: 75 },
        { name: "Breakfast in Bed", desc: "Pancakes, coffee, and covers.", cost: 25 },
        { name: "Waterway Dinner", desc: "Dinner on The Woodlands' Waterway.", cost: 100 }
    ];

    const displayName = urlParams.get('name') || urlParams.get('n') || RECIPIENT_NAME;
    let celebrationActive = localStorage.getItem(STORAGE_KEY) === 'true';

    // ── Global state ──
    let currentStep = 0;
    let affectionScore = 0;
    const completedQuests = new Set();
    const totalQuests = 5;
    const steps = document.querySelectorAll('.step');
    const heartShards = document.querySelectorAll('.heart-shard');
    const affectionDisplay = document.getElementById('affectionScore');
    const starBurst = document.getElementById('starBurst');
    const toast = document.getElementById('toast');

    function showStep(index) {
        // Clean up heart game if leaving step 4
        if (currentStep === 4 && index !== 4) {
            gameActive = false;
            clearInterval(heartsGameInterval);
            canvas.onclick = null;
            canvas.ontouchstart = null;
        }
        steps.forEach(s => s.classList.remove('active'));
        steps[index].classList.add('active');
        currentStep = index;
        if (index === 1) initWordSearch();
        if (index === 2) initPhotoGuess();
        if (index === 3) initRiddle();
        if (index === 4) initHeartsGame();
        if (index === 5) initDecoder();
        if (index === 6) initShop();
    }

    function addAffection(points) {
        affectionScore += points;
        affectionDisplay.textContent = affectionScore;
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2200);
    }

    function completeQuest(questNum) {
        if (completedQuests.has(questNum)) return;
        completedQuests.add(questNum);
        heartShards[questNum-1].textContent = '❤️';
        heartShards[questNum-1].classList.add('collected');
        starBurst.textContent = '💎';
        starBurst.classList.add('show');
        setTimeout(() => starBurst.classList.remove('show'), 800);
        showToast(`Quest ${questNum} complete!`);

        if (questNum < totalQuests) {
            setTimeout(() => showStep(questNum + 1), 800);
        }
        if (completedQuests.size === totalQuests) {
            setTimeout(() => showStep(6), 1200);
        }
    }

    // ── Quest buttons ──
    document.getElementById('finishWordSearch').addEventListener('click', () => completeQuest(1));
    document.getElementById('finishPhotoGuess').addEventListener('click', () => completeQuest(2));
    document.getElementById('finishRiddle').addEventListener('click', () => completeQuest(3));
    document.getElementById('finishHearts').addEventListener('click', () => completeQuest(4));
    document.getElementById('finishDecoder').addEventListener('click', () => completeQuest(5));

    // ── STEP 1: Word Search ──
    const gridEl = document.getElementById('wordGrid');
    let selectedCells = [];
    let foundWords = new Set();
    let foundCellsSet = new Set();
    const gridSize = 8;
    let gridLetters = [];

    // Attach word‑search pointer events ONCE, with target check
    gridEl.addEventListener('mousedown', (e) => {
        if (!e.target.classList.contains('cell')) return;
        e.preventDefault();
        startSelection(e);
    });
    gridEl.addEventListener('touchstart', (e) => {
        if (!e.target.classList.contains('cell')) return;
        e.preventDefault();
        startSelection(e.touches[0]);
    }, { passive: false });
    window.addEventListener('mousemove', (e) => { if (isSelecting) updateSelection(e); });
    window.addEventListener('touchmove', (e) => { if (isSelecting) { e.preventDefault(); updateSelection(e.touches[0]); } }, { passive: false });
    window.addEventListener('mouseup', endSelection);
    window.addEventListener('touchend', endSelection);

    function initWordSearch() {
        foundWords.clear();
        foundCellsSet.clear();
        selectedCells = [];
        generateGrid();
        renderGrid();
        renderWordList();
        document.getElementById('finishWordSearch').disabled = true;
        updateWordSearchCompletion();
    }

    // (generateGrid, canPlace, placeWord, placeWordRandomly, renderGrid, renderWordList, updateWordSearchCompletion remain unchanged)
    function generateGrid() {
        gridLetters = Array(gridSize).fill().map(() => Array(gridSize).fill(''));
        const directions = [[0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]];
        for (let word of wordList) {
            let placed = false;
            for (let attempt = 0; attempt < 100 && !placed; attempt++) {
                const dir = directions[Math.floor(Math.random() * directions.length)];
                const row = Math.floor(Math.random() * gridSize);
                const col = Math.floor(Math.random() * gridSize);
                if (canPlace(word, row, col, dir[0], dir[1])) {
                    placeWord(word, row, col, dir[0], dir[1]);
                    placed = true;
                }
            }
            if (!placed) placeWordRandomly(word);
        }
        for (let r=0; r<gridSize; r++) {
            for (let c=0; c<gridSize; c++) {
                if (!gridLetters[r][c]) gridLetters[r][c] = String.fromCharCode(65 + Math.floor(Math.random()*26));
            }
        }
    }

    function canPlace(word, r, c, dr, dc) {
        for (let i=0; i<word.length; i++) {
            const nr = r + i*dr, nc = c + i*dc;
            if (nr<0 || nr>=gridSize || nc<0 || nc>=gridSize) return false;
            if (gridLetters[nr][nc] && gridLetters[nr][nc] !== word[i]) return false;
        }
        return true;
    }

    function placeWord(word, r, c, dr, dc) {
        for (let i=0; i<word.length; i++) {
            gridLetters[r + i*dr][c + i*dc] = word[i];
        }
    }

    function placeWordRandomly(word) {
        for (let r=0; r<gridSize; r++) {
            for (let c=0; c<=gridSize-word.length; c++) {
                if (canPlace(word, r, c, 0, 1)) {
                    placeWord(word, r, c, 0, 1);
                    return;
                }
            }
        }
    }

    function renderGrid() {
        gridEl.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        for (let r=0; r<gridSize; r++) {
            for (let c=0; c<gridSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = gridLetters[r][c];
                cell.dataset.row = r;
                cell.dataset.col = c;
                if (foundCellsSet.has(`${r},${c}`)) {
                    cell.classList.add('found-cell');
                }
                gridEl.appendChild(cell);
            }
        }
    }

    function renderWordList() {
        const container = document.getElementById('wordListContainer');
        container.innerHTML = wordList.map(w => `<span class="word-item" data-word="${w}">${w}</span>`).join('');
    }

    function updateWordSearchCompletion() {
        document.getElementById('finishWordSearch').disabled = foundWords.size === 0;
    }

    let isSelecting = false;
    function startSelection(e) {
        isSelecting = true;
        document.querySelectorAll('.cell.selected').forEach(c => c.classList.remove('selected'));
        selectedCells = [];
        const cell = getCellFromPoint(e.clientX, e.clientY);
        if (cell) addCell(cell);
    }

    function updateSelection(e) {
        const cell = getCellFromPoint(e.clientX, e.clientY);
        if (cell && !selectedCells.includes(cell)) {
            if (selectedCells.length === 0 || isInStraightLine(selectedCells[selectedCells.length-1], cell)) {
                addCell(cell);
            }
        }
    }

    function endSelection() {
        isSelecting = false;
        const word = selectedCells.map(c => c.textContent).join('');
        if (wordList.includes(word) && !foundWords.has(word)) {
            foundWords.add(word);
            addAffection(10);
            document.querySelector(`.word-item[data-word="${word}"]`)?.classList.add('found');
            showToast(`Found ${word}! +10`);
            updateWordSearchCompletion();
            selectedCells.forEach(cell => {
                const row = cell.dataset.row;
                const col = cell.dataset.col;
                foundCellsSet.add(`${row},${col}`);
                cell.classList.add('found-cell');
            });
        }
        document.querySelectorAll('.cell.selected').forEach(c => c.classList.remove('selected'));
        selectedCells = [];
    }

    function getCellFromPoint(x, y) {
        const elements = document.elementsFromPoint(x, y);
        for (let el of elements) {
            if (el.classList.contains('cell')) return el;
        }
        return null;
    }

    function addCell(cell) {
        cell.classList.add('selected');
        selectedCells.push(cell);
    }

    function isInStraightLine(prevCell, newCell) {
        if (selectedCells.length < 2) {
            const dr = Math.abs(newCell.dataset.row - prevCell.dataset.row);
            const dc = Math.abs(newCell.dataset.col - prevCell.dataset.col);
            return (dr <= 1 && dc <= 1) && !(dr === 0 && dc === 0);
        }
        const first = selectedCells[0];
        const second = selectedCells[1];
        const dirRow = second.dataset.row - first.dataset.row;
        const dirCol = second.dataset.col - first.dataset.col;
        const expectedRow = parseInt(prevCell.dataset.row) + dirRow;
        const expectedCol = parseInt(prevCell.dataset.col) + dirCol;
        return parseInt(newCell.dataset.row) === expectedRow && parseInt(newCell.dataset.col) === expectedCol;
    }

    // ── STEP 2: Photo Guess (unchanged) ──
    let photoGuessed = false;
    function initPhotoGuess() { /* exactly as before */ }

    // ── STEP 3: Riddle (unchanged) ──
    let riddleSolved = false;
    function initRiddle() { /* exactly as before */ }

    // ── STEP 4: Catch Hearts (unchanged but with cleanup in showStep) ──
    let heartsGameInterval, heartsTimer, heartsCaught, gameActive;
    const canvas = document.getElementById('heartsCanvas');
    const ctx = canvas.getContext('2d');
    let heartParticles = [];

    function initHeartsGame() {
        canvas.width = canvas.clientWidth || 300;
        canvas.height = 400;
        heartsCaught = 0;
        heartsTimer = 30;
        gameActive = true;
        document.getElementById('catchTimer').textContent = heartsTimer;
        document.getElementById('catchScore').textContent = heartsCaught;
        document.getElementById('finishHearts').disabled = true;
        heartParticles = [];
        if (heartsGameInterval) clearInterval(heartsGameInterval);
        heartsGameInterval = setInterval(gameLoop, 1000/30);
        setTimeout(endHeartsGame, 30000);
        canvas.onclick = (e) => handleCanvasClick(e.clientX, e.clientY);
        canvas.ontouchstart = (e) => { e.preventDefault(); handleCanvasClick(e.touches[0].clientX, e.touches[0].clientY); };
    }

    function handleCanvasClick(clientX, clientY) { /* unchanged */ }
    function gameLoop() { /* unchanged */ }
    function endHeartsGame() {
        gameActive = false;
        clearInterval(heartsGameInterval);
        canvas.onclick = null;
        canvas.ontouchstart = null;
        document.getElementById('finishHearts').disabled = false;
    }
    setInterval(() => {
        if (gameActive && heartsTimer > 0) {
            heartsTimer--;
            document.getElementById('catchTimer').textContent = heartsTimer;
            if (heartsTimer <= 0) endHeartsGame();
        }
    }, 1000);

    // ── STEP 5: Decoder (unchanged) ──

    // ── STEP 6: Rewards Shop (with improved layout) ──
    let purchasedCoupons = [];
    function initShop() { /* exactly as before */ }
    document.getElementById('proceedToFinal').addEventListener('click', () => showStep(7));

    // ── STEP 7: Final Proposal ──
    if (displayName) document.getElementById('greetingText').textContent = `Hey ${displayName}...`;
    let noCount = 0;
    const MAX_NO = 5;
    const btnYes = document.getElementById('btnYes');
    const btnNo = document.getElementById('btnNo');
    function updateNoButton() { /* unchanged */ }
    btnNo.addEventListener('mouseenter', () => { /* unchanged */ });
    btnNo.addEventListener('click', (e) => { e.preventDefault(); /* unchanged */ });
    btnYes.addEventListener('click', triggerCelebration);

    function triggerCelebration() {
        localStorage.setItem(STORAGE_KEY, 'true');
        document.getElementById('initialContent').style.display = 'none';
        document.getElementById('celebrationContent').classList.remove('hidden');
        const now = new Date();
        document.getElementById('celebrationDate').textContent = now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) + ' 💫';
        if (displayName) document.getElementById('celebrationMessage').textContent = `I found my hidden gem 💎 ${displayName}.`;
        else document.getElementById('celebrationMessage').textContent = 'I found my hidden gem 💎';
        launchConfetti();
        spawnHearts();
        if (navigator.vibrate) navigator.vibrate([30,60,30]);
    }

    // ── Confetti & hearts (unchanged) ──

    // Inject mobile‑friendly styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .cell.found-cell { background: var(--accent-gold); color: #fff; }
        .floating-heart{position:fixed;pointer-events:none;z-index:45;font-size:1.6rem;animation:heartRise 4s ease-out forwards;opacity:0;}
        @keyframes heartRise{0%{opacity:1;transform:translateY(0)scale(0.6)rotate(0deg);}40%{opacity:1;transform:translateY(-180px)scale(1.1)rotate(15deg);}100%{opacity:0;transform:translateY(-400px)scale(0.3)rotate(-25deg);}}
        .btn-no.surrendered{background:var(--button-yes-bg);color:#fff;border:none;box-shadow:0 8px 32px rgba(193,125,106,0.35);}
        /* Mobile tap optimisation */
        .btn, button, .song, .photo-card, .quiz-option, .coupon-card button, .cell {
            touch-action: manipulation;
        }
        #confetti-canvas {
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(styleEl);

    // ── Celebration persistence ──
    if (celebrationActive) {
        document.addEventListener('DOMContentLoaded', () => {
            showStep(7);
            document.getElementById('initialContent').style.display = 'none';
            document.getElementById('celebrationContent').classList.remove('hidden');
            const now = new Date();
            document.getElementById('celebrationDate').textContent = now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) + ' 💫';
            if (displayName) document.getElementById('celebrationMessage').textContent = `I found my hidden gem 💎 ${displayName}.`;
            else document.getElementById('celebrationMessage').textContent = 'I found my hidden gem 💎';
            launchConfetti();
            spawnHearts();
        });
    }

    // Start
    document.getElementById('startBtn').addEventListener('click', () => showStep(1));
    showStep(0);

    // Reset trigger
    const resetBtn = document.getElementById('resetTrigger');
    let resetClicks = 0;
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetClicks++;
            if (resetClicks >= 5) {
                localStorage.removeItem(STORAGE_KEY);
                alert('Celebration reset! Reload the page.');
                resetClicks = 0;
            }
            setTimeout(() => { resetClicks = 0; }, 2000);
        });
    }
})();