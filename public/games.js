/* ============================================================
   CAPILLARY PLAYGROUND — games.js
   All 5 game engines: Cashflow Chase, Trigger Time,
   Match Matrix, Risk vs Reward, Campaign Launch
   ============================================================ */

'use strict';

// ── Game Registry ─────────────────────────────────────────────
const GAME_ENGINES = {};

/* ============================================================
   1. CASHFLOW CHASE — Pac-Man style maze game
   Player = Capillary logo, collect 💰, avoid ❌
   ============================================================ */
GAME_ENGINES.cashflow = (function () {
  const TILE = 32;
  const COLS = 21;
  const ROWS = 19;

  // Maze: 0=path, 1=wall, 2=coin, 3=empty(no coin)
  const MAP_TEMPLATE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
    [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,3,3,1,3,3,1,1,1,2,1,1,1,1],
    [1,1,1,1,2,1,3,3,3,3,3,3,3,3,3,1,2,1,1,1,1],
    [1,1,1,1,2,1,3,1,1,3,1,3,1,1,3,1,2,1,1,1,1],
    [1,1,1,1,2,3,3,1,3,3,3,3,3,1,3,3,2,1,1,1,1],
    [1,1,1,1,2,1,3,1,1,1,1,1,1,1,3,1,2,1,1,1,1],
    [1,1,1,1,2,1,3,3,3,3,3,3,3,3,3,1,2,1,1,1,1],
    [1,1,1,1,2,1,3,3,1,1,1,1,1,3,3,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
    [1,2,2,1,2,2,2,2,2,2,3,2,2,2,2,2,2,1,2,2,1],
    [1,1,2,2,2,1,2,1,1,1,1,1,1,1,2,1,2,2,2,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];

  let state, ctx, canvas, logoImg, animId;
  let keys = {};

  function init(_canvas, onScore, onEnd) {
    canvas = _canvas;
    ctx = canvas.getContext('2d');
    canvas.width  = COLS * TILE;
    canvas.height = ROWS * TILE;

    // Clone map
    const map = MAP_TEMPLATE.map(r => [...r]);
    let totalCoins = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (map[r][c] === 2) totalCoins++;

    state = {
      map,
      totalCoins,
      coinsLeft: totalCoins,
      player: { c: 10, r: 16, dx: 0, dy: 0, px: 10*TILE, py: 16*TILE, speed: 8, moving: false },
      enemies: [
        { c: 9,  r: 9,  px: 9*TILE,  py: 9*TILE,  dx: 1, dy: 0, color: '#ff4545', move: 0 },
        { c: 11, r: 9,  px: 11*TILE, py: 9*TILE,  dx: -1,dy: 0, color: '#a855f7', move: 0 },
        { c: 10, r: 10, px: 10*TILE, py: 10*TILE, dx: 0, dy: 1, color: '#4a9eff', move: 0 },
      ],
      score: 0,
      lives: 3,
      frame: 0,
      onScore,
      onEnd,
      gameOver: false,
      won: false,
      moveTimer: 0,
    };

    // Load logo image
    logoImg = new Image();
    logoImg.src = typeof LOGO_B64 !== 'undefined' ? LOGO_B64 : '';

    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', offKey);

    loop();
  }

  function onKey(e) {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)) {
      e.preventDefault();
      keys[e.key] = true;
    }
  }
  function offKey(e) { keys[e.key] = false; }

  function getDir() {
    if (keys['ArrowUp']    || keys['w']) return {dx:0,  dy:-1};
    if (keys['ArrowDown']  || keys['s']) return {dx:0,  dy:1};
    if (keys['ArrowLeft']  || keys['a']) return {dx:-1, dy:0};
    if (keys['ArrowRight'] || keys['d']) return {dx:1,  dy:0};
    return null;
  }

  function canMove(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
    return state.map[r][c] !== 1;
  }

  function updatePlayer() {
    const p = state.player;
    const dir = getDir();
    if (dir) { p.dx = dir.dx; p.dy = dir.dy; }

    // Pixel-level movement — move toward next cell
    const targetPx = p.c * TILE;
    const targetPy = p.r * TILE;
    const distX = targetPx - p.px;
    const distY = targetPy - p.py;

    if (Math.abs(distX) < p.speed && Math.abs(distY) < p.speed) {
      // Snap to grid
      p.px = targetPx;
      p.py = targetPy;
      // Eat coin
      if (state.map[p.r][p.c] === 2) {
        state.map[p.r][p.c] = 0;
        state.coinsLeft--;
        state.score += 10;
        state.onScore(state.score);
      }
      // Try to move in current direction
      const nc = p.c + p.dx;
      const nr = p.r + p.dy;
      if ((p.dx !== 0 || p.dy !== 0) && canMove(nc, nr)) {
        p.c = nc;
        p.r = nr;
      }
    } else {
      p.px += Math.sign(distX) !== 0 ? Math.sign(distX) * p.speed : 0;
      p.py += Math.sign(distY) !== 0 ? Math.sign(distY) * p.speed : 0;
    }
  }

  function updateEnemies() {
    const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}];
    state.enemies.forEach(e => {
      e.move++;
      if (e.move < 12) return; // slowed enemies
      e.move = 0;

      // Try to keep direction, else random turn
      const nc = e.c + e.dx;
      const nr = e.r + e.dy;
      if (canMove(nc, nr) && Math.random() > 0.25) {
        e.c = nc; e.r = nr;
      } else {
        const shuffled = [...dirs].sort(() => Math.random()-0.5);
        for (const d of shuffled) {
          const nnc = e.c + d.dx;
          const nnr = e.r + d.dy;
          if (canMove(nnc, nnr)) {
            e.c = nnc; e.r = nnr;
            e.dx = d.dx; e.dy = d.dy;
            break;
          }
        }
      }
      e.px = e.c * TILE;
      e.py = e.r * TILE;
    });
  }

  function checkCollisions() {
    const p = state.player;
    for (const e of state.enemies) {
      const dx = (p.px + TILE/2) - (e.px + TILE/2);
      const dy = (p.py + TILE/2) - (e.py + TILE/2);
      if (Math.sqrt(dx*dx+dy*dy) < TILE * 0.65) {
        state.lives--;
        if (state.lives <= 0) {
          state.gameOver = true;
          return;
        }
        // Reset player
        p.c = 10; p.r = 16;
        p.px = p.c*TILE; p.py = p.r*TILE;
        p.dx = 0; p.dy = 0;
      }
    }
  }

  function draw() {
    const { map, player: p, enemies, frame } = state;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#0a0b0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Map
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * TILE, y = r * TILE;
        if (map[r][c] === 1) {
          ctx.fillStyle = '#1a1d2e';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(74,158,255,0.15)';
          ctx.strokeRect(x+0.5, y+0.5, TILE-1, TILE-1);
        } else if (map[r][c] === 2) {
          // Coin
          const pulse = 0.85 + 0.15 * Math.sin(frame * 0.1 + c + r);
          ctx.fillStyle = `rgba(255,204,0,${pulse})`;
          ctx.beginPath();
          ctx.arc(x + TILE/2, y + TILE/2, 4, 0, Math.PI*2);
          ctx.fill();
        }
      }
    }

    // Enemies
    enemies.forEach(e => {
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❌', e.px + TILE/2, e.py + TILE/2);
    });

    // Player (logo or fallback)
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.px + TILE/2, p.py + TILE/2, TILE/2 - 2, 0, Math.PI*2);
      ctx.clip();
      ctx.drawImage(logoImg, p.px + 2, p.py + 2, TILE - 4, TILE - 4);
      ctx.restore();
      // Glow
      ctx.shadowColor = 'rgba(255,107,43,0.6)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(p.px + TILE/2, p.py + TILE/2, TILE/2 - 2, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,107,43,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#ff6b2b';
      ctx.beginPath();
      ctx.arc(p.px + TILE/2, p.py + TILE/2, TILE/2 - 3, 0, Math.PI*2);
      ctx.fill();
    }
  }

  function loop() {
    if (!state || state.gameOver || state.won) return;
    state.frame++;
    updatePlayer();
    updateEnemies();
    checkCollisions();

    if (state.coinsLeft <= 0) {
      state.won = true;
      draw();
      state.onEnd(true, state.score);
      return;
    }
    if (state.gameOver) {
      draw();
      state.onEnd(false, state.score);
      return;
    }
    draw();
    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keyup', offKey);
    state = null;
    keys = {};
  }

  return { init, destroy };
})();


/* ============================================================
   2. TRIGGER TIME — Reaction test game
   5 rounds, click on green flash, score = avg reaction ms
   ============================================================ */
GAME_ENGINES.reaction = (function () {
  let state = null;
  let container = null;
  let padEl, labelEl, progressEl;

  function init(_canvas, onScore, onEnd) {
    // Use DOM layer instead of canvas
    const wrap = document.getElementById('game-canvas-wrap');
    container = document.createElement('div');
    container.className = 'reaction-area';
    container.id = 'reaction-container';

    padEl = document.createElement('div');
    padEl.className = 'reaction-pad waiting';

    const iconEl = document.createElement('div');
    iconEl.style.fontSize = '3rem';
    iconEl.textContent = '⚡';
    padEl.appendChild(iconEl);

    labelEl = document.createElement('div');
    labelEl.className = 'reaction-label';
    labelEl.textContent = 'Click when it turns GREEN!';
    padEl.appendChild(labelEl);

    progressEl = document.createElement('div');
    progressEl.className = 'reaction-progress';

    container.appendChild(padEl);
    container.appendChild(progressEl);

    document.getElementById('game-canvas').style.display = 'none';
    wrap.appendChild(container);

    state = {
      round: 0,
      totalRounds: 5,
      times: [],
      waiting: false,
      ready: false,
      flashTime: null,
      timer: null,
      onScore,
      onEnd,
    };

    container.addEventListener('click', handleClick);
    startRound();
  }

  function renderProgress() {
    progressEl.innerHTML = '';
    for (let i = 0; i < state.totalRounds; i++) {
      const dot = document.createElement('div');
      dot.className = 'rp-dot' + (i < state.round ? ' done' : '');
      progressEl.appendChild(dot);
    }
  }

  function startRound() {
    if (state.round >= state.totalRounds) { finish(); return; }
    renderProgress();
    padEl.className = 'reaction-pad waiting';
    labelEl.textContent = 'Wait for it…';
    state.ready = false;
    state.waiting = true;

    const delay = 1500 + Math.random() * 3000;
    state.timer = setTimeout(() => {
      if (!state) return;
      padEl.className = 'reaction-pad ready';
      labelEl.textContent = 'CLICK NOW!';
      state.flashTime = performance.now();
      state.ready = true;
      state.waiting = false;
    }, delay);
  }

  function handleClick() {
    if (!state) return;
    if (state.waiting) {
      // Too early
      clearTimeout(state.timer);
      padEl.className = 'reaction-pad too-early';
      labelEl.textContent = 'Too early! Wait for GREEN…';
      state.waiting = false;
      setTimeout(() => { if (state) startRound(); }, 1200);
      return;
    }
    if (state.ready) {
      const rt = performance.now() - state.flashTime;
      state.times.push(rt);
      state.round++;
      const score = Math.round(rt);
      state.onScore(score);
      padEl.className = 'reaction-pad waiting';
      labelEl.textContent = `${Math.round(rt)} ms!`;
      state.ready = false;
      setTimeout(() => { if (state) startRound(); }, 900);
    }
  }

  function finish() {
    if (!state) return;
    const avg = state.times.reduce((a,b) => a+b, 0) / state.times.length;
    // Score: lower ms = higher score (max 1000)
    const score = Math.max(0, Math.round(1000 - avg));
    state.onEnd(true, score);
  }

  function destroy() {
    if (state && state.timer) clearTimeout(state.timer);
    if (container && container.parentNode) {
      container.removeEventListener('click', handleClick);
      container.parentNode.removeChild(container);
    }
    document.getElementById('game-canvas').style.display = 'block';
    state = null;
    container = null;
  }

  return { init, destroy };
})();


/* ============================================================
   3. MATCH MATRIX — Memory card game
   16 cards (8 pairs), fewer moves = higher score
   ============================================================ */
GAME_ENGINES.memory = (function () {
  const EMOJIS = ['🎯','⚡','💰','🚀','🏆','💎','🎪','🌟'];

  let state = null;
  let container = null;

  function init(_canvas, onScore, onEnd) {
    const wrap = document.getElementById('game-canvas-wrap');
    document.getElementById('game-canvas').style.display = 'none';

    container = document.createElement('div');
    container.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;overflow:auto;padding:20px;';

    const grid = document.createElement('div');
    grid.className = 'memory-grid';

    // Shuffle pairs
    const symbols = [...EMOJIS, ...EMOJIS];
    for (let i = symbols.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [symbols[i],symbols[j]] = [symbols[j],symbols[i]];
    }

    state = {
      cards: [],
      flipped: [],
      matched: 0,
      moves: 0,
      locked: false,
      onScore,
      onEnd,
    };

    symbols.forEach((sym, i) => {
      const card = document.createElement('div');
      card.className = 'mem-card';
      card.innerHTML = `
        <div class="mem-card-inner">
          <div class="mem-card-front">❓</div>
          <div class="mem-card-back">${sym}</div>
        </div>`;
      card.dataset.sym = sym;
      card.dataset.idx = i;
      card.addEventListener('click', () => flipCard(i));
      grid.appendChild(card);
      state.cards.push({ el: card, sym, matched: false });
    });

    container.appendChild(grid);
    wrap.appendChild(container);
  }

  function flipCard(idx) {
    if (!state || state.locked) return;
    const card = state.cards[idx];
    if (card.matched || card.el.classList.contains('flipped')) return;
    card.el.classList.add('flipped');
    state.flipped.push(idx);

    if (state.flipped.length === 2) {
      state.moves++;
      state.locked = true;
      const [a, b] = state.flipped;
      if (state.cards[a].sym === state.cards[b].sym) {
        state.cards[a].matched = true;
        state.cards[b].matched = true;
        state.cards[a].el.classList.add('matched');
        state.cards[b].el.classList.add('matched');
        state.matched++;
        state.flipped = [];
        state.locked = false;
        const score = Math.max(0, 800 - state.moves * 20);
        state.onScore(score);
        if (state.matched === EMOJIS.length) {
          setTimeout(() => {
            const finalScore = Math.max(0, 1000 - state.moves * 25);
            state.onEnd(true, finalScore);
          }, 500);
        }
      } else {
        setTimeout(() => {
          if (!state) return;
          state.cards[a].el.classList.remove('flipped');
          state.cards[b].el.classList.remove('flipped');
          state.flipped = [];
          state.locked = false;
        }, 900);
      }
    }
  }

  function destroy() {
    if (container && container.parentNode) container.parentNode.removeChild(container);
    document.getElementById('game-canvas').style.display = 'block';
    state = null;
    container = null;
  }

  return { init, destroy };
})();


/* ============================================================
   4. RISK VS REWARD — Mines game
   5x5 grid, 6 bombs, 1 jackpot, rest safe
   Click safe tiles to multiply score, find jackpot to win big
   ============================================================ */
GAME_ENGINES.mines = (function () {
  const GRID = 5;
  const BOMBS = 7;

  let state = null;
  let container = null;

  function init(_canvas, onScore, onEnd) {
    const wrap = document.getElementById('game-canvas-wrap');
    document.getElementById('game-canvas').style.display = 'none';

    container = document.createElement('div');
    container.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:20px;';

    // Build board
    const total = GRID * GRID;
    const cells = new Array(total).fill('safe');
    // Place bombs
    let placed = 0;
    while (placed < BOMBS) {
      const i = Math.floor(Math.random() * total);
      if (cells[i] === 'safe') { cells[i] = 'bomb'; placed++; }
    }
    // Place jackpot on a safe cell
    let jp = Math.floor(Math.random() * total);
    while (cells[jp] !== 'safe') jp = Math.floor(Math.random() * total);
    cells[jp] = 'jackpot';

    const infoEl = document.createElement('div');
    infoEl.className = 'mines-multiplier';
    infoEl.textContent = 'Multiplier: ×1 — Click safe tiles to increase it!';

    const grid = document.createElement('div');
    grid.className = 'mines-grid';

    state = {
      cells,
      tiles: [],
      safeRevealed: 0,
      multiplier: 1,
      baseScore: 50,
      gameOver: false,
      onScore,
      onEnd,
      infoEl,
    };

    cells.forEach((type, i) => {
      const tile = document.createElement('div');
      tile.className = 'mine-tile';
      tile.textContent = '';
      tile.addEventListener('click', () => revealTile(i));
      grid.appendChild(tile);
      state.tiles.push(tile);
    });

    // Cash out button
    const cashBtn = document.createElement('button');
    cashBtn.className = 'btn-secondary';
    cashBtn.style.cssText = 'width:200px;';
    cashBtn.textContent = '💰 Cash Out';
    cashBtn.addEventListener('click', () => {
      if (!state || state.gameOver) return;
      if (state.safeRevealed === 0) return;
      const score = Math.round(state.baseScore * state.multiplier);
      state.gameOver = true;
      state.onEnd(true, score);
    });

    container.appendChild(infoEl);
    container.appendChild(grid);
    container.appendChild(cashBtn);
    wrap.appendChild(container);
  }

  function revealTile(idx) {
    if (!state || state.gameOver) return;
    const tile = state.tiles[idx];
    if (tile.classList.contains('revealed')) return;

    const type = state.cells[idx];
    tile.classList.add('revealed');

    if (type === 'bomb') {
      tile.classList.add('bomb');
      tile.textContent = '❌';
      state.gameOver = true;
      // Reveal all bombs
      state.cells.forEach((t, i) => {
        if (t === 'bomb') {
          state.tiles[i].classList.add('revealed','bomb');
          state.tiles[i].textContent = '❌';
        }
      });
      const score = state.safeRevealed > 0 ? Math.round(state.baseScore * Math.max(1, state.multiplier * 0.3)) : 0;
      setTimeout(() => state && state.onEnd(false, score), 600);
    } else if (type === 'jackpot') {
      tile.classList.add('jackpot');
      tile.textContent = '💰';
      state.multiplier *= 5;
      state.safeRevealed++;
      const score = Math.round(state.baseScore * state.multiplier);
      state.gameOver = true;
      state.onScore(score);
      setTimeout(() => state && state.onEnd(true, score), 500);
    } else {
      tile.classList.add('safe');
      tile.textContent = '✅';
      state.safeRevealed++;
      state.multiplier = 1 + state.safeRevealed * 0.5;
      const currentScore = Math.round(state.baseScore * state.multiplier);
      state.onScore(currentScore);
      state.infoEl.textContent = `Multiplier: ×${state.multiplier.toFixed(1)} — Score: ${currentScore} pts`;
    }
  }

  function destroy() {
    if (container && container.parentNode) container.parentNode.removeChild(container);
    document.getElementById('game-canvas').style.display = 'block';
    state = null;
    container = null;
  }

  return { init, destroy };
})();


/* ============================================================
   5. CAMPAIGN LAUNCH — Timing bar game
   Stop the bar in the green zone, 5 rounds, accumulate score
   ============================================================ */
GAME_ENGINES.timing = (function () {
  let state = null;
  let container = null;
  let animId = null;

  function init(_canvas, onScore, onEnd) {
    const wrap = document.getElementById('game-canvas-wrap');
    document.getElementById('game-canvas').style.display = 'none';

    container = document.createElement('div');
    container.className = 'timing-wrap';

    const titleEl = document.createElement('div');
    titleEl.className = 'timing-label';
    titleEl.textContent = 'Stop the bar in the GREEN zone!';

    const roundEl = document.createElement('div');
    roundEl.className = 'timing-round-info';
    roundEl.textContent = 'Round 1 of 5';

    const track = document.createElement('div');
    track.className = 'timing-track';

    const zone = document.createElement('div');
    zone.className = 'timing-zone';

    const bar = document.createElement('div');
    bar.className = 'timing-bar-el';

    track.appendChild(zone);
    track.appendChild(bar);

    const resultEl = document.createElement('div');
    resultEl.className = 'timing-label';
    resultEl.style.minHeight = '24px';

    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.style.cssText = 'width:200px;font-size:1.1rem;';
    btn.textContent = '🚀 LAUNCH!';

    container.appendChild(titleEl);
    container.appendChild(roundEl);
    container.appendChild(track);
    container.appendChild(resultEl);
    container.appendChild(btn);
    wrap.appendChild(container);

    state = {
      round: 0,
      totalRounds: 5,
      totalScore: 0,
      barPos: 0,       // 0 to 1
      barDir: 1,
      speed: 0.008,
      zoneStart: 0.35,
      zoneWidth: 0.22,
      running: true,
      waitingClick: true,
      onScore,
      onEnd,
      track,
      zone,
      bar,
      resultEl,
      roundEl,
      titleEl,
    };

    // Position zone
    state.zone.style.left   = (state.zoneStart * 100) + '%';
    state.zone.style.width  = (state.zoneWidth * 100) + '%';

    btn.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    animate();
  }

  function handleKey(e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }

  function animate() {
    if (!state || !state.running) return;
    if (state.waitingClick) {
      // Animate bar
      state.barPos += state.barDir * state.speed;
      if (state.barPos >= 1) { state.barPos = 1; state.barDir = -1; }
      if (state.barPos <= 0) { state.barPos = 0; state.barDir = 1; }
      state.bar.style.left = (state.barPos * (100 - 2)) + '%';
    }
    animId = requestAnimationFrame(animate);
  }

  function handleClick() {
    if (!state || !state.waitingClick) return;
    state.waitingClick = false;

    const pos = state.barPos;
    const inZone = pos >= state.zoneStart && pos <= state.zoneStart + state.zoneWidth;
    const distFromCenter = Math.abs(pos - (state.zoneStart + state.zoneWidth/2));
    const maxDist = state.zoneWidth / 2;

    let roundScore = 0;
    let msg = '';
    if (inZone) {
      const accuracy = 1 - (distFromCenter / maxDist);
      roundScore = Math.round(100 + accuracy * 400);
      msg = accuracy > 0.8 ? '🎯 Perfect! +' + roundScore : '✅ Good! +' + roundScore;
      state.resultEl.style.color = '#2ddd82';
    } else {
      roundScore = 10;
      msg = '❌ Missed! +' + roundScore;
      state.resultEl.style.color = '#ff4545';
    }

    state.totalScore += roundScore;
    state.resultEl.textContent = msg;
    state.onScore(state.totalScore);
    state.round++;

    state.roundEl.textContent = `Round ${Math.min(state.round + 1, state.totalRounds)} of ${state.totalRounds}`;

    if (state.round >= state.totalRounds) {
      state.running = false;
      setTimeout(() => state && state.onEnd(true, state.totalScore), 800);
    } else {
      // Speed up slightly each round
      state.speed = 0.008 + state.round * 0.003;
      // Shrink zone slightly
      state.zoneWidth = Math.max(0.12, 0.22 - state.round * 0.02);
      state.zone.style.width = (state.zoneWidth * 100) + '%';
      setTimeout(() => {
        if (!state) return;
        state.resultEl.textContent = '';
        state.waitingClick = true;
      }, 700);
    }
  }

  function destroy() {
    state && (state.running = false);
    if (animId) cancelAnimationFrame(animId);
    document.removeEventListener('keydown', handleKey);
    if (container && container.parentNode) container.parentNode.removeChild(container);
    document.getElementById('game-canvas').style.display = 'block';
    state = null;
    container = null;
    animId = null;
  }

  return { init, destroy };
})();
