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
    const RECIPIENT_NAME = 'Jade';
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

    // ── STEP 2: Photo Guess ──
    let photoGuessed = false;
    function initPhotoGuess() {
        photoGuessed = false;
        document.getElementById('photoFeedback').textContent = '';
        document.getElementById('finishPhotoGuess').disabled = true;
        document.querySelectorAll('.photo-card').forEach(card => {
            card.classList.remove('selected');
            card.onclick = () => {
                if (photoGuessed) return;
                photoGuessed = true;
                document.querySelectorAll('.photo-card').forEach(c => c.style.pointerEvents = 'none');
                card.classList.add('selected');
                const isFav = card.dataset.favorite === 'true';
                if (isFav) {
                    addAffection(50);
                    document.getElementById('photoFeedback').textContent = 'Yes! That’s my favorite ❤️ +50';
                } else {
                    addAffection(10);
                    document.getElementById('photoFeedback').textContent = 'Almost! Good to know I can keep you guessing! ;)';
                }
                document.getElementById('finishPhotoGuess').disabled = false;
            };
        });
    }

    // ── STEP 3: Riddle ──
    let riddleSolved = false;
    function initRiddle() {
        riddleSolved = false;
        document.getElementById('riddleQuestion').textContent = riddleData.question;
        const optionsDiv = document.getElementById('riddleOptions');
        optionsDiv.innerHTML = '';
        riddleData.options.forEach((opt, i) => {
            const div = document.createElement('div');
            div.className = 'quiz-option';
            div.textContent = opt;
            div.addEventListener('click', () => {
                if (riddleSolved) return;
                riddleSolved = true;
                document.querySelectorAll('#riddleOptions .quiz-option').forEach(o => o.style.pointerEvents = 'none');
                if (i === riddleData.correct) {
                    div.classList.add('correct');
                    addAffection(40);
                    document.getElementById('riddleFeedback').textContent = 'Correct! +40';
                } else {
                    div.classList.add('wrong');
                    addAffection(0);
                    document.getElementById('riddleFeedback').textContent = 'Not quite, but you still earn the quest.';
                }
                document.getElementById('finishRiddle').disabled = false;
            });
            optionsDiv.appendChild(div);
        });
        document.getElementById('riddleFeedback').textContent = '';
        document.getElementById('finishRiddle').disabled = true;
    }

    // ── STEP 4: Catch Hearts ──
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

    function handleCanvasClick(clientX, clientY) {
        if (!gameActive) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        for (let i = heartParticles.length-1; i >= 0; i--) {
            const h = heartParticles[i];
            const dist = Math.hypot(x - h.x, y - h.y);
            if (dist < 25) {
                heartParticles.splice(i,1);
                heartsCaught++;
                addAffection(5);
                document.getElementById('catchScore').textContent = heartsCaught;
                break;
            }
        }
    }

    function gameLoop() {
        if (!gameActive) return;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        if (Math.random() < 0.05) {
            heartParticles.push({
                x: Math.random() * canvas.width,
                y: -20,
                speed: 1.5 + Math.random() * 2,
                size: 20 + Math.random() * 15
            });
        }
        for (let i = heartParticles.length-1; i>=0; i--) {
            const h = heartParticles[i];
            h.y += h.speed;
            ctx.font = `${h.size}px serif`;
            ctx.fillText('❤️', h.x, h.y);
            if (h.y > canvas.height + 30) heartParticles.splice(i,1);
        }
    }

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

    // ── STEP 5: Decoder ──
    function initDecoder() {
        document.getElementById('encodedMsg').textContent = cipherMessage;
        document.getElementById('decoderInput').value = '';
        document.getElementById('decoderFeedback').textContent = '';
        document.getElementById('finishDecoder').disabled = true;
    }
    document.getElementById('submitDecoder').addEventListener('click', () => {
        const input = document.getElementById('decoderInput').value.trim().toUpperCase();
        const correct = cipherMessage.split('').map(ch => {
            if (ch === ' ') return ' ';
            const code = ch.charCodeAt(0) - cipherShift;
            return String.fromCharCode(code < 65 ? code + 26 : code);
        }).join('');
        if (input === correct) {
            addAffection(40);
            document.getElementById('decoderFeedback').textContent = 'Decoded! +40';
            document.getElementById('finishDecoder').disabled = false;
        } else {
            document.getElementById('decoderFeedback').textContent = 'Not quite, try again.';
        }
    });

    // ── STEP 6: Rewards Shop ──
    let purchasedCoupons = [];
    function initShop() {
        document.getElementById('shopPoints').textContent = affectionScore;
        const container = document.getElementById('shopContainer');
        container.innerHTML = '';
        coupons.forEach((c, index) => {
            const card = document.createElement('div');
            card.className = 'coupon-card';
            card.innerHTML = `
                <div class="coupon-info">
                    <span class="coupon-name">${c.name}</span>
                    <span class="coupon-desc">${c.desc}</span>
                </div>
                <div class="coupon-action">
                    <span class="coupon-cost">${c.cost} pts</span>
                    <button data-index="${index}">Buy</button>
                </div>
            `;
            container.appendChild(card);
        });
        container.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const idx = e.target.dataset.index;
                const coupon = coupons[idx];
                if (affectionScore >= coupon.cost && !purchasedCoupons.includes(idx)) {
                    affectionScore -= coupon.cost;
                    purchasedCoupons.push(idx);
                    document.getElementById('shopPoints').textContent = affectionScore;
                    e.target.disabled = true;
                    e.target.textContent = 'Owned';
                    showToast(`You got: ${coupon.name}!`);
                } else if (purchasedCoupons.includes(idx)) {
                    showToast('Already owned!');
                } else {
                    showToast('Not enough points 😔');
                }
            }
        });
    }
    document.getElementById('proceedToFinal').addEventListener('click', () => showStep(7));

    // ── STEP 7: Final Proposal ──
    if (displayName) document.getElementById('greetingText').textContent = `Hey ${displayName}...`;
    let noCount = 0;
    const MAX_NO = 5;
    const btnYes = document.getElementById('btnYes');
    const btnNo = document.getElementById('btnNo');
    function updateNoButton() {
        if (noCount >= MAX_NO) {
            btnNo.textContent = 'Okay fine... Yes! 💕';
            btnNo.style.transform = 'scale(1.05)';
            btnNo.onclick = triggerCelebration;
        } else {
            btnYes.style.transform = `scale(${1+noCount*0.1})`;
            const moveX = (Math.random() - 0.5) * 40;
            const moveY = (Math.random() - 0.5) * 30;
            btnNo.style.transform = `translate(${moveX}px, ${moveY}px) scale(0.9)`;
        }
    }
    btnNo.addEventListener('mouseenter', () => {
        if (noCount >= MAX_NO) return;
        noCount++;
        updateNoButton();
        showToast(`Dodge #${noCount}!`);
    });
    btnNo.addEventListener('click', (e) => {
        e.preventDefault();
        if (noCount >= MAX_NO) return;
        noCount++;
        updateNoButton();
    });
    btnYes.addEventListener('click', triggerCelebration);

    function triggerCelebration() {
        localStorage.setItem(STORAGE_KEY, 'true');
        document.getElementById('initialContent').style.display = 'none';
        document.getElementById('celebrationContent').classList.remove('hidden');
        const now = new Date();
        document.getElementById('celebrationDate').textContent = now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) + ' 💫';
        document.getElementById('celebrationMessage').textContent = displayName 
            ? `I found my hidden gem 💎 ${displayName}.` 
            : 'I found my hidden gem 💎';
        launchConfetti();
        spawnHearts();
        if (navigator.vibrate) navigator.vibrate([30,60,30]);
    }

    // ── Confetti & hearts ──
    const confettiCanvas = document.getElementById('confetti-canvas');
    const confettiCtx = confettiCanvas.getContext('2d');
    let particles = [];
    function resizeCanvas(){ confettiCanvas.width=window.innerWidth; confettiCanvas.height=window.innerHeight; }
    window.addEventListener('resize',resizeCanvas); resizeCanvas();
    const colors=['#e8c4b8','#d4a08c','#c9a96e','#f5f0eb','#c17d6a'];
    function particle(){ return { x:confettiCanvas.width/2+(Math.random()-0.5)*200, y:confettiCanvas.height/2-40, vx:(Math.random()-0.5)*14, vy:(Math.random()-0.5)*16-6, size:Math.random()*9+4, color:colors[Math.floor(Math.random()*colors.length)], rot:Math.random()*360, rotSp:(Math.random()-0.5)*10, shape:Math.random()>0.5?'rect':'circle', op:1, life:0, maxLife:180 }; }
    function launchConfetti(){ for(let i=0;i<120;i++) particles.push(particle()); setTimeout(()=>{for(let i=0;i<60;i++) particles.push(particle());},400); confettiCanvas.classList.add('active'); if(!window._animId) animateConfetti(); }
    function animateConfetti(){ confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height); for(let i=particles.length-1;i>=0;i--){ let p=particles[i]; p.life++; p.vy+=0.18; p.vx*=0.985; p.vy*=0.985; p.x+=p.vx; p.y+=p.vy; p.rot+=p.rotSp; p.op=1-p.life/p.maxLife; if(p.life>=p.maxLife||p.op<=0){particles.splice(i,1);continue;} confettiCtx.save(); confettiCtx.globalAlpha=p.op; confettiCtx.translate(p.x,p.y); confettiCtx.rotate(p.rot*Math.PI/180); confettiCtx.fillStyle=p.color; if(p.shape==='rect') confettiCtx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2); else{confettiCtx.beginPath();confettiCtx.arc(0,0,p.size/2,0,Math.PI*2);confettiCtx.fill();} confettiCtx.restore(); } if(particles.length===0){confettiCanvas.classList.remove('active');window._animId=null;} else window._animId=requestAnimationFrame(animateConfetti); }
    function spawnHearts(){ const hs=['💖','💕','✨','💫','🫶','💗']; for(let i=0;i<18;i++){ setTimeout(()=>{ let h=document.createElement('span'); h.className='floating-heart'; h.textContent=hs[Math.floor(Math.random()*hs.length)]; h.style.left=(20+Math.random()*60)+'%'; h.style.top=(40+Math.random()*35)+'%'; h.style.fontSize=(1.2+Math.random()*2.2)+'rem'; document.body.appendChild(h); setTimeout(()=>h.remove(),4500); },i*80); } }

    // Inject styles for mobile & permanent highlights
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .cell.found-cell { background: var(--accent-gold); color: #fff; }
        .floating-heart{position:fixed;pointer-events:none;z-index:45;font-size:1.6rem;animation:heartRise 4s ease-out forwards;opacity:0;}
        @keyframes heartRise{0%{opacity:1;transform:translateY(0)scale(0.6)rotate(0deg);}40%{opacity:1;transform:translateY(-180px)scale(1.1)rotate(15deg);}100%{opacity:0;transform:translateY(-400px)scale(0.3)rotate(-25deg);}}
        .btn-no.surrendered{background:var(--button-yes-bg);color:#fff;border:none;box-shadow:0 8px 32px rgba(193,125,106,0.35);}
        /* Mobile tap instant response */
        .btn, button, .song, .photo-card, .quiz-option, .coupon-card button, .cell {
            touch-action: manipulation;
        }
        #confetti-canvas {
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(styleEl);

    // ── Handle persistent celebration (if she already said yes) ──
    if (celebrationActive) {
        document.addEventListener('DOMContentLoaded', () => {
            showStep(7);
            document.getElementById('initialContent').style.display = 'none';
            document.getElementById('celebrationContent').classList.remove('hidden');
            const now = new Date();
            document.getElementById('celebrationDate').textContent = now.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) + ' 💫';
            document.getElementById('celebrationMessage').textContent = displayName 
                ? `I found my hidden gem 💎 ${displayName}.` 
                : 'I found my hidden gem 💎';
            launchConfetti();
            spawnHearts();
        });
    } else {
        // Normal start – make sure the Begin Adventure button works
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('startBtn').addEventListener('click', () => showStep(1));
            // Ensure step 0 is visible (it already is via the active class)
            showStep(0);
        });
    }

    // Reset trigger (tap invisible corner 5 times)
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