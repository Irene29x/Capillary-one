/* ============================================================
   CAPILLARY PLAYGROUND — games.js
   All 5 game engines: Cashflow Chase, Trigger Time,
   Match Matrix, Risk vs Reward, Campaign Launch
   ============================================================ */

'use strict';

// ── roundRect polyfill for older Canvas implementations ───────
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
  };
}

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
      player: { c: 10, r: 16, dx: 0, dy: 0, px: 10*TILE, py: 16*TILE, speed: 5, moving: false },
      enemies: [
        { c: 9,  r: 9,  px: 9*TILE,  py: 9*TILE,  dx: 1, dy: 0, color: '#ff4545', move: 0 },
        { c: 11, r: 9,  px: 11*TILE, py: 9*TILE,  dx: -1,dy: 0, color: '#a855f7', move: 0 },
        { c: 10, r: 10, px: 10*TILE, py: 10*TILE, dx: 0, dy: 1, color: '#4a9eff', move: 0 },
        { c: 9, r: 10, px: 9*TILE, py: 10*TILE, dx: 0, dy: -1, color: '#f59e0b', move: 0 },
      ],
      score: 0,
      lives: 2,
      frame: 0,
      onScore,
      onEnd,
      gameOver: false,
      won: false,
      moveTimer: 0,
      startTime: Date.now(),
      lastSpawnTime: Date.now(),
      spawnInterval: 7000,
      enemyDelay: 10,
      timeLimit: 120,
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
    // Spawn new ghosts over time
    const now = Date.now();
    if (now - state.lastSpawnTime >= state.spawnInterval && state.enemies.length < 15) {
      const spawnPoints = [{c:9,r:9},{c:11,r:9},{c:10,r:10},{c:9,r:10},{c:11,r:10}];
      const sp = spawnPoints[state.enemies.length % spawnPoints.length];
      const colors = ['#ff4545','#a855f7','#4a9eff','#f59e0b','#ef4444','#10b981','#ec4899','#8b5cf6','#06b6d4'];
      state.enemies.push({
        c: sp.c, r: sp.r, px: sp.c*TILE, py: sp.r*TILE,
        dx: Math.random() > 0.5 ? 1 : -1, dy: 0,
        color: colors[state.enemies.length % colors.length], move: 0,
      });
      state.lastSpawnTime = now;
      // Speed up over time
      state.spawnInterval = Math.max(3000, state.spawnInterval - 500);
    }
    // Speed up enemies gradually
    const elapsed = (now - state.startTime) / 1000;
    state.enemyDelay = Math.max(3, Math.round(10 - elapsed * 0.2));

    state.enemies.forEach(e => {
      e.move++;
      if (e.move < state.enemyDelay) return;
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

    // Timer display (countdown from timeLimit)
    const elapsedSec = Math.floor((Date.now() - state.startTime) / 1000);
    const remaining = Math.max(0, state.timeLimit - elapsedSec);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const timerStr = `${mins}:${secs.toString().padStart(2,'0')}`;

    // Background pill for HUD
    const hudY = 4;
    ctx.fillStyle = 'rgba(10,11,20,0.72)';
    ctx.beginPath();
    ctx.roundRect(canvas.width - 230, hudY, 222, 34, 8);
    ctx.fill();

    ctx.font = 'bold 18px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const hudMid = hudY + 17;
    // Timer
    ctx.fillStyle = remaining <= 15 ? '#ff4545' : '#ffffff';
    ctx.fillText(`⏱ ${timerStr}`, canvas.width - 130, hudMid);
    // Ghosts
    ctx.fillStyle = '#a855f7';
    ctx.fillText(`👻 ${state.enemies.length}`, canvas.width - 60, hudMid);
    // Lives — draw on left side
    ctx.fillStyle = 'rgba(10,11,20,0.72)';
    ctx.beginPath();
    ctx.roundRect(6, hudY, 100, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#ff4545';
    ctx.textAlign = 'left';
    ctx.fillText(`❤️  ×${state.lives}`, 12, hudMid);

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

    // Check if time ran out
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    if (elapsed >= state.timeLimit) {
      state.gameOver = true;
      draw();
      state.onEnd(false, state.score);
      return;
    }

    if (state.coinsLeft <= 0) {
      state.won = true;
      draw();
      // Final score: coins + time bonus + lives bonus + completion bonus, cap at 2500
      const remainingSec = Math.max(0, state.timeLimit - elapsed);
      const finalScore = state.score + remainingSec * 30 + state.lives * 200 + 200;
      state.onEnd(true, finalScore);
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
      cumulativeScore: 0,
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
      // Per-round score: <400ms → 400-600, ≥400ms → 200-350
      let roundPts;
      if (rt <= 400) {
        const t = Math.max(0, Math.min(1, (rt - 150) / 250));
        roundPts = Math.round(600 - t * 200); // 600 → 400
      } else {
        const t = Math.min(1, (rt - 400) / 600);
        roundPts = Math.round(350 - t * 150); // 350 → 200
      }
      state.cumulativeScore += roundPts;
      state.onScore(state.cumulativeScore);
      padEl.className = 'reaction-pad waiting';
      labelEl.textContent = `${Math.round(rt)} ms`;
      state.ready = false;
      setTimeout(() => { if (state) startRound(); }, 900);
    }
  }

  function finish() {
    if (!state) return;
    state.onEnd(true, state.cumulativeScore);
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
  const EMOJIS = ['🎯','⚡','💰','🚀','🏆','💎','🎪','🌟','🔥','🎵','🧩','💡'];

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
      wrongMoves: 0,
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
        // Correct match — no penalty, no point gain from match itself
        state.cards[a].matched = true;
        state.cards[b].matched = true;
        state.cards[a].el.classList.add('matched');
        state.cards[b].el.classList.add('matched');
        state.matched++;
        state.flipped = [];
        state.locked = false;
        const score = Math.max(50, 2500 - state.wrongMoves * 50);
        state.onScore(score);
        if (state.matched === EMOJIS.length) {
          setTimeout(() => {
            const finalScore = Math.max(50, 2500 - state.wrongMoves * 50);
            state.onEnd(true, finalScore);
          }, 500);
        }
      } else {
        // Wrong match — deduct 50 immediately and update score in real time
        state.wrongMoves++;
        const score = Math.max(50, 2500 - state.wrongMoves * 50);
        state.onScore(score);
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
   6x6 grid, 12 bombs, 1 jackpot, rest safe
   Click safe tiles to multiply score, find jackpot to win big
   ============================================================ */
GAME_ENGINES.mines = (function () {
  const GRID = 6;
  const BOMBS = 12;

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
      baseScore: 300,
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
      const score = Math.min(2500, Math.round(state.baseScore * state.multiplier));
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
      const score = state.safeRevealed > 0 ? Math.min(2500, Math.round(state.baseScore * Math.max(1, state.multiplier * 0.3))) : 0;
      setTimeout(() => state && state.onEnd(false, score), 600);
    } else if (type === 'jackpot') {
      tile.classList.add('jackpot');
      tile.textContent = '💰';
      state.multiplier *= 5;
      state.safeRevealed++;
      const currentScore = Math.min(2500, Math.round(state.baseScore * state.multiplier));
      state.onScore(currentScore);
      state.infoEl.textContent = `💰 JACKPOT! Multiplier: ×${state.multiplier.toFixed(1)} — Score: ${currentScore} pts`;
    } else {
      tile.classList.add('safe');
      tile.textContent = '✅';
      state.safeRevealed++;
      state.multiplier = state.safeRevealed;
      const currentScore = Math.min(2500, state.baseScore * state.safeRevealed);
      state.onScore(currentScore);
      state.infoEl.textContent = `Score: ${currentScore} pts — (${state.safeRevealed} safe tile${state.safeRevealed !== 1 ? 's' : ''} × 300)`;
    }

    // Check if all non-bomb tiles are revealed
    if (!state.gameOver) {
      const totalSafe = state.cells.filter(c => c !== 'bomb').length;
      if (state.safeRevealed >= totalSafe) {
        state.gameOver = true;
        const score = Math.min(2500, Math.round(state.baseScore * state.multiplier));
        setTimeout(() => state && state.onEnd(true, score), 500);
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
      speed: 0.012,
      zoneStart: 0.35,
      zoneWidth: 0.16,
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
      const accuracy = Math.min(1, 1 - (distFromCenter / maxDist));
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
      // Speed up more aggressively each round
      state.speed = 0.012 + state.round * 0.005;
      // Shrink zone more aggressively
      state.zoneWidth = Math.max(0.06, 0.16 - state.round * 0.025);
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


/* ============================================================
   6. DINO CHASE — Chrome Dino-style runner
   Tap/Space to jump over trees. Speed ramps up through Normal → Fast → Turbo → INSANE.
   Max score 5000. Game runs until collision.
   ============================================================ */
GAME_ENGINES.dino = (function () {
  let state, ctx, canvas, animId;

  const GROUND_Y_RATIO = 0.78;
  const BFLY_W = 44;
  const BFLY_H = 40;
  const GRAVITY = 0.6;
  const JUMP_FORCE = -12;
  // No score cap — score grows freely; 2500+ is just extremely difficult
  // Minimum frames between obstacles = jump duration + landing buffer
  const JUMP_FRAMES = Math.ceil(2 * Math.abs(JUMP_FORCE) / GRAVITY); // 40
  const MIN_SPAWN_GAP = JUMP_FRAMES + 10; // 50 frames — always jumpable
  const BIRD_SCORE_THRESHOLD = 3500;
  const DUCK_H = 22; // shorter hitbox while ducking

  function init(_canvas, onScore, onEnd) {
    canvas = _canvas;
    ctx = canvas.getContext('2d');
    canvas.width = 672;
    canvas.height = 320;

    const groundY = Math.floor(canvas.height * GROUND_Y_RATIO);

    state = {
      groundY,
      dino: { x: 60, y: groundY - BFLY_H, vy: 0, jumping: false, ducking: false, w: BFLY_W, h: BFLY_H },
      obstacles: [],
      birds: [],
      score: 0,
      frame: 0,
      speed: 4,
      baseSpeed: 4,
      spawnTimer: 0,
      spawnInterval: 90,
      gameOver: false,
      onScore,
      onEnd,
      legFrame: 0,
      particles: [],
      jumpCount: 0,
      wingAngle: 0,
    };

    document.addEventListener('keydown', onKeyDino);
    document.addEventListener('keyup', onKeyUpDino);
    canvas.addEventListener('click', jumpDino);
    canvas.addEventListener('touchstart', jumpDino);

    loop();
  }

  function onKeyDino(e) {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
      e.preventDefault();
      jumpDino();
    }
    if (e.key === 'ArrowDown' || e.key === 's') {
      e.preventDefault();
      if (state && !state.gameOver && !state.dino.jumping) {
        state.dino.ducking = true;
        state.dino.h = DUCK_H;
        state.dino.y = state.groundY - DUCK_H;
      }
    }
  }

  function onKeyUpDino(e) {
    if (e.key === 'ArrowDown' || e.key === 's') {
      if (state) {
        state.dino.ducking = false;
        state.dino.h = BFLY_H;
        if (!state.dino.jumping) {
          state.dino.y = state.groundY - BFLY_H;
        }
      }
    }
  }

  function spawnJumpParticles() {
    const d = state.dino;
    const cx = d.x + d.w / 2;
    const cy = d.y + d.h / 2;
    const colors = ['#ff6bf0','#ffcb47','#47e0ff','#a855f7','#ff4545','#2ddd82','#ff9626'];
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 3;
      state.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: Math.random() > 0.5 ? 'circle' : 'star',
      });
    }
  }

  function jumpDino() {
    if (!state || state.gameOver) return;
    if (!state.dino.jumping) {
      state.dino.vy = JUMP_FORCE;
      state.dino.jumping = true;
      state.jumpCount++;
      state.score += 50;
      state.onScore(state.score);
      updateSpeed();
      spawnJumpParticles();
    }
  }

  function spawnTree(xOffset) {
    const types = [
      { w: 20, h: 40 },
      { w: 28, h: 55 },
      { w: 22, h: 48 },
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    state.obstacles.push({
      x: canvas.width + 20 + (xOffset || 0),
      y: state.groundY - t.h,
      w: t.w,
      h: t.h,
      scored: false,
    });
    return t.w;
  }

  function spawnPair() {
    // Spawn two trees side-by-side with a tiny 12px gap — player must jump over both
    const w1 = spawnTree(0);
    spawnTree(w1 + 12);
  }

  function spawnBird() {
    // Three heights: low (jump over), mid (jump or duck), high (duck under)
    const heights = ['low', 'mid', 'high'];
    const h = heights[Math.floor(Math.random() * heights.length)];
    const birdW = 40;
    const birdH = 28;
    let y;
    if (h === 'low') {
      y = state.groundY - birdH - 2; // ground level — jump over
    } else if (h === 'mid') {
      y = state.groundY - birdH - 40; // mid — can jump or duck
    } else {
      y = state.groundY - birdH - 70; // high — must duck
    }
    state.birds.push({
      x: canvas.width + 20,
      y,
      w: birdW,
      h: birdH,
      wingFrame: 0,
      scored: false,
    });
  }

  function updateSpeed() {
    const s = state.score;
    if (s >= 2500) {
      // IMPOSSIBLE: speed ramps 30 → 55 between 2500-5000, pairs always spawn
      const progress = Math.min(1, (s - 2500) / 2500);
      state.speed = 30 + progress * 25;         // 30 → 55
      state.spawnInterval = MIN_SPAWN_GAP;       // no breathing room
    } else if (s >= 1500) {
      // OVERLY INSANE: speed ramps 14 → 20 between 1500-2500
      const progress = (s - 1500) / 1000;
      state.speed = 14 + progress * 6;          // 14 → 20
      state.spawnInterval = MIN_SPAWN_GAP;       // tightest gaps
    } else if (s >= 500) {
      // Fast: speed ramps 6 → 9 between 500-1500
      const progress = (s - 500) / 1000;
      state.speed = 6 + progress * 3;           // 6 → 9
      state.spawnInterval = Math.round(70 - progress * 15);
    } else {
      // Normal: speed ramps 4 → 6 between 0-500
      const progress = s / 500;
      state.speed = 4 + progress * 2;           // 4 → 6
      state.spawnInterval = Math.round(90 - progress * 20);
    }
  }

  function update() {
    const d = state.dino;
    d.vy += GRAVITY;
    d.y += d.vy;
    if (d.y >= state.groundY - d.h) {
      d.y = state.groundY - d.h;
      d.vy = 0;
      d.jumping = false;
      if (d.ducking) { d.h = DUCK_H; d.y = state.groundY - DUCK_H; }
    }

    state.spawnTimer++;
    if (state.spawnTimer >= state.spawnInterval) {
      // Ensure the last obstacle is far enough away so the player can always jump
      const minPixelGap = MIN_SPAWN_GAP * state.speed;
      const lastObs = state.obstacles[state.obstacles.length - 1];
      const lastBird = state.birds[state.birds.length - 1];
      const lastAny = Math.max(lastObs ? lastObs.x : -Infinity, lastBird ? lastBird.x : -Infinity);
      if (lastAny <= canvas.width - minPixelGap) {
        state.spawnTimer = 0;
        // After 3500, mix birds in — ~40% chance bird, 60% tree
        if (state.score >= BIRD_SCORE_THRESHOLD && Math.random() < 0.4) {
          spawnBird();
        } else if (state.score >= 2500) {
          spawnPair(); // back-to-back double tree in IMPOSSIBLE mode
        } else {
          spawnTree();
        }
      }
    }

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const o = state.obstacles[i];
      o.x -= state.speed;
      if (!o.scored && o.x + o.w < d.x) {
        o.scored = true;
      }
      if (o.x + o.w < -20) {
        state.obstacles.splice(i, 1);
      }
    }

    // Update birds
    for (let i = state.birds.length - 1; i >= 0; i--) {
      const b = state.birds[i];
      b.x -= state.speed;
      b.wingFrame++;
      if (!b.scored && b.x + b.w < d.x) {
        b.scored = true;
      }
      if (b.x + b.w < -40) {
        state.birds.splice(i, 1);
      }
    }

    // Collision with trees
    for (const o of state.obstacles) {
      const margin = 6;
      if (
        d.x + margin < o.x + o.w &&
        d.x + d.w - margin > o.x &&
        d.y + margin < o.y + o.h &&
        d.y + d.h - margin > o.y
      ) {
        state.gameOver = true;
        return;
      }
    }

    // Collision with birds
    for (const b of state.birds) {
      const margin = 6;
      if (
        d.x + margin < b.x + b.w &&
        d.x + d.w - margin > b.x &&
        d.y + margin < b.y + b.h &&
        d.y + d.h - margin > b.y
      ) {
        state.gameOver = true;
        return;
      }
    }

    // Distance/survival bonus: +1 per frame (uncapped)
    state.score = state.score + 1;
    state.onScore(state.score);

    state.frame++;
    state.legFrame++;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0a0b14');
    grad.addColorStop(1, '#0f1623');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(74,158,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, state.groundY);
    ctx.lineTo(canvas.width, state.groundY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(74,158,255,0.05)';
    ctx.fillRect(0, state.groundY, canvas.width, canvas.height - state.groundY);

    state.obstacles.forEach(o => {
      const trunkW = o.w * 0.35;
      ctx.fillStyle = '#5c3d2e';
      ctx.fillRect(o.x + (o.w - trunkW) / 2, o.y + o.h * 0.5, trunkW, o.h * 0.5);
      ctx.fillStyle = '#228b22';
      ctx.beginPath();
      ctx.moveTo(o.x + o.w / 2, o.y);
      ctx.lineTo(o.x + o.w + 4, o.y + o.h * 0.6);
      ctx.lineTo(o.x - 4, o.y + o.h * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1e7a1e';
      ctx.beginPath();
      ctx.moveTo(o.x + o.w / 2, o.y + o.h * 0.1);
      ctx.lineTo(o.x + o.w + 2, o.y + o.h * 0.55);
      ctx.lineTo(o.x - 2, o.y + o.h * 0.55);
      ctx.closePath();
      ctx.fill();
    });

    // --- Draw birds (pterodactyls) ---
    state.birds.forEach(b => {
      const bx = b.x + b.w / 2;
      const by = b.y + b.h / 2;
      const wingFlap = Math.sin(b.wingFrame * 0.15) * 0.7;

      ctx.save();
      ctx.translate(bx, by);

      // Glow
      ctx.shadowColor = 'rgba(255,69,69,0.5)';
      ctx.shadowBlur = 12;

      // Body
      ctx.fillStyle = '#ff4545';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(14, -2, 5, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(19, -3);
      ctx.lineTo(25, -1);
      ctx.lineTo(19, 1);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(16, -3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(16.5, -3, 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Wings
      ctx.fillStyle = '#ff4545';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-2, -20 * wingFlap, 8, -16 * wingFlap);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#cc3636';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-2, 14 * wingFlap, 8, 10 * wingFlap);
      ctx.lineTo(4, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });

    const d = state.dino;
    state.wingAngle = Math.sin(state.frame * 0.15) * 0.5;

    // --- Draw butterfly ---
    const bx = d.x + d.w / 2;
    const by = d.ducking ? d.y + d.h / 2 + 4 : d.y + d.h / 2;
    const wingFlap = d.ducking ? 0.15 : Math.max(0.1, Math.sin(state.frame * 0.18) * 0.6 + 0.4);

    ctx.save();
    ctx.translate(bx, by);
    if (d.ducking) ctx.scale(1.3, 0.6); // flatten when ducking

    // Glow
    ctx.shadowColor = 'rgba(168,85,247,0.6)';
    ctx.shadowBlur = 16;

    // Left wing (upper)
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.ellipse(-10, -6, 14 * wingFlap, 12, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // Left wing (lower)
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.ellipse(-8, 6, 10 * wingFlap, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Right wing (upper)
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.ellipse(10, -6, 14 * wingFlap, 12, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Right wing (lower)
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.ellipse(8, 6, 10 * wingFlap, 9, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Wing details - dots
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-10 * wingFlap, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10 * wingFlap, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(0, -14, 4, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-1, -17);
    ctx.quadraticCurveTo(-6, -26, -10, -24);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, -17);
    ctx.quadraticCurveTo(6, -26, 10, -24);
    ctx.stroke();
    // Antenna tips
    ctx.fillStyle = '#ffcb47';
    ctx.beginPath(); ctx.arc(-10, -24, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -24, 2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // --- Draw particles ---
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life--;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type === 'star') {
        drawStar(ctx, p.x, p.y, 5, p.size, p.size * 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    // --- Jump flair text ---
    if (d.jumping) {
      const flairAlpha = Math.max(0, Math.min(1, -d.vy / 12));
      ctx.save();
      ctx.globalAlpha = flairAlpha * 0.8;
      ctx.fillStyle = '#ffcb47';
      ctx.font = 'bold 16px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('+50 ✨', bx, by - 30 + d.vy);
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${state.score}`, canvas.width - 10, 10);

    let speedLabel = 'Normal';
    let speedColor = '#4a9eff';
    if (state.score >= 3500) { speedLabel = '\u2620\ufe0f IMPOSSIBLE + \ud83e\udd85'; speedColor = '#ff0000'; }
    else if (state.score >= 2500) { speedLabel = '\u2620\ufe0f IMPOSSIBLE'; speedColor = '#ff0000'; }
    else if (state.score >= 1500) { speedLabel = '\ud83d\udd2e OVERLY INSANE'; speedColor = '#ff4545'; }
    else if (state.score >= 500) { speedLabel = '\u26a1 Fast'; speedColor = '#f59e0b'; }
    ctx.fillStyle = speedColor;
    ctx.textAlign = 'left';
    ctx.fillText(speedLabel, 10, 10);
    if (state.score >= BIRD_SCORE_THRESHOLD) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText('\u2b07 / S to duck under birds', 10, 28);
    }
  }

  function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
  }

  function loop() {
    if (!state) return;
    if (state.gameOver) {
      draw();
      // Always end on collision — score is whatever was accumulated
      state.onEnd(false, state.score);
      return;
    }
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    document.removeEventListener('keydown', onKeyDino);
    document.removeEventListener('keyup', onKeyUpDino);
    if (canvas) {
      canvas.removeEventListener('click', jumpDino);
      canvas.removeEventListener('touchstart', jumpDino);
    }
    state = null;
  }

  return { init, destroy };
})();


/* ============================================================
   7. COLOR MATCH — Memorise 5 colours, recreate them with HSB
      sliders. Score = accuracy across all 5 colours (max 2500)
   ============================================================ */
GAME_ENGINES.colorMatch = (function () {
  let state = null;
  let container = null;

  // ── Colour helpers ──────────────────────────────────────────
  function hsbToRgb(h, s, b) {
    s /= 100; b /= 100;
    const k = n => (n + h / 60) % 6;
    const f = n => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
    return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
  }

  function hsbToHex(h, s, b) {
    const [r, g, bl] = hsbToRgb(h, s, b);
    return '#' + [r, g, bl].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  // Perceptual distance: weighted average of circular hue + Sat + Bright deltas
  function colorError(h1, s1, b1, h2, s2, b2) {
    const dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2)) / 180; // 0-1
    const ds = Math.abs(s1 - s2) / 100;
    const db = Math.abs(b1 - b2) / 100;
    return (dh * 2 + ds + db) / 4; // hue weighted more — 0-1
  }

  function calcPoints(error) {
    // 0 error → 10 pts, 0.5+ error → 0 pts
    return Math.max(0, parseFloat((10 * Math.max(0, 1 - error / 0.5)).toFixed(1)));
  }

  function randomColor() {
    return {
      h: Math.floor(Math.random() * 360),
      s: 45 + Math.floor(Math.random() * 46), // 45-90 – vivid enough to be distinct
      b: 45 + Math.floor(Math.random() * 46), // 45-90 – not too dark or too white
    };
  }

  // ── Phases ──────────────────────────────────────────────────
  function showMemorize() {
    container.innerHTML = '';
    const idx = state.currentIdx;
    const total = state.colors.length;
    const c = state.colors[idx];

    const titleEl = document.createElement('div');
    titleEl.className = 'cm-phase-title';
    titleEl.textContent = `Memorise color ${idx + 1} of ${total}`;

    const swatchRow = document.createElement('div');
    swatchRow.className = 'cm-swatch-row';
    const sw = document.createElement('div');
    sw.className = 'cm-swatch cm-swatch--solo';
    sw.style.background = hsbToHex(c.h, c.s, c.b);
    const lbl = document.createElement('span');
    lbl.className = 'cm-swatch-num';
    lbl.textContent = String(idx + 1);
    sw.appendChild(lbl);
    swatchRow.appendChild(sw);

    const countEl = document.createElement('div');
    countEl.className = 'cm-countdown';
    state.countdown = 5;
    countEl.textContent = state.countdown;

    container.appendChild(titleEl);
    container.appendChild(swatchRow);
    container.appendChild(countEl);

    state.countdownTimer = setInterval(() => {
      if (!state) return;
      state.countdown--;
      countEl.textContent = state.countdown;
      if (state.countdown <= 0) {
        clearInterval(state.countdownTimer);
        state.phase = 'guess';
        showGuess();
      }
    }, 1000);
  }

  function showGuess() {
    container.innerHTML = '';
    const idx = state.currentIdx;
    const total = state.colors.length;

    const progEl = document.createElement('div');
    progEl.className = 'cm-progress';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('div');
      dot.className = 'cm-dot' + (i < idx ? ' done' : i === idx ? ' current' : '');
      progEl.appendChild(dot);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'cm-phase-title';
    titleEl.textContent = `Recreate color ${idx + 1} of ${total}`;

    const previewWrap = document.createElement('div');
    previewWrap.className = 'cm-preview-wrap';

    const blankSwatch = document.createElement('div');
    blankSwatch.className = 'cm-swatch-blank';
    blankSwatch.textContent = '?';

    const arrowEl = document.createElement('div');
    arrowEl.className = 'cm-arrow';
    arrowEl.textContent = '→';

    const yourSwatch = document.createElement('div');
    yourSwatch.className = 'cm-swatch-preview';

    previewWrap.appendChild(blankSwatch);
    previewWrap.appendChild(arrowEl);
    previewWrap.appendChild(yourSwatch);

    const guess = { h: 180, s: 50, b: 50 };

    function updatePreview() {
      yourSwatch.style.background = hsbToHex(guess.h, guess.s, guess.b);
    }
    updatePreview();

    const slidersWrap = document.createElement('div');
    slidersWrap.className = 'cm-sliders';

    [
      { label: 'Hue',        key: 'h', min: 0,   max: 359, step: 1, hue: true },
      { label: 'Saturation', key: 's', min: 0,   max: 100, step: 1 },
      { label: 'Brightness', key: 'b', min: 0,   max: 100, step: 1 },
    ].forEach(def => {
      const row = document.createElement('div');
      row.className = 'cm-slider-row';

      const lbl = document.createElement('label');
      lbl.className = 'cm-slider-label';
      lbl.textContent = def.label;

      const input = document.createElement('input');
      input.type  = 'range';
      input.className = 'cm-slider' + (def.hue ? ' cm-slider--hue' : '');
      input.min   = def.min;
      input.max   = def.max;
      input.step  = def.step;
      input.value = guess[def.key];

      const valEl = document.createElement('span');
      valEl.className = 'cm-slider-val';
      valEl.textContent = guess[def.key];

      input.addEventListener('input', () => {
        guess[def.key] = parseInt(input.value, 10);
        valEl.textContent = input.value;
        updatePreview();
      });

      row.appendChild(lbl);
      row.appendChild(input);
      row.appendChild(valEl);
      slidersWrap.appendChild(row);
    });

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-primary cm-submit';
    submitBtn.textContent = 'Lock In →';
    submitBtn.addEventListener('click', () => {
      state.guesses.push({ ...guess });
      showComparison();
    });

    container.appendChild(progEl);
    container.appendChild(titleEl);
    container.appendChild(previewWrap);
    container.appendChild(slidersWrap);
    container.appendChild(submitBtn);
  }

  function showComparison() {
    container.innerHTML = '';
    const idx = state.currentIdx;
    const total = state.colors.length;
    const orig = state.colors[idx];
    const g = state.guesses[idx];
    const error = colorError(orig.h, orig.s, orig.b, g.h, g.s, g.b);
    const pts = calcPoints(error);
    state.roundScores = state.roundScores || [];
    state.roundScores.push(pts);

    const titleEl = document.createElement('div');
    titleEl.className = 'cm-phase-title';
    titleEl.textContent = `Color ${idx + 1} of ${total} — Result`;

    const compWrap = document.createElement('div');
    compWrap.className = 'cm-compare-wrap';

    const origCol = document.createElement('div');
    origCol.className = 'cm-compare-col';
    const origSw = document.createElement('div');
    origSw.className = 'cm-compare-swatch';
    origSw.style.background = hsbToHex(orig.h, orig.s, orig.b);
    const origLbl = document.createElement('div');
    origLbl.className = 'cm-compare-label';
    origLbl.textContent = 'Original';
    origCol.appendChild(origSw);
    origCol.appendChild(origLbl);

    const vsEl = document.createElement('div');
    vsEl.className = 'cm-compare-vs';
    vsEl.textContent = 'vs';

    const guessCol = document.createElement('div');
    guessCol.className = 'cm-compare-col';
    const guessSw = document.createElement('div');
    guessSw.className = 'cm-compare-swatch';
    guessSw.style.background = hsbToHex(g.h, g.s, g.b);
    const guessLbl = document.createElement('div');
    guessLbl.className = 'cm-compare-label';
    guessLbl.textContent = 'Your Guess';
    guessCol.appendChild(guessSw);
    guessCol.appendChild(guessLbl);

    compWrap.appendChild(origCol);
    compWrap.appendChild(vsEl);
    compWrap.appendChild(guessCol);

    const ptsEl = document.createElement('div');
    ptsEl.className = 'cm-compare-score' + (pts >= 9 ? ' perfect' : pts >= 5 ? ' good' : '');
    ptsEl.textContent = `${pts.toFixed(1)} / 10`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-primary cm-submit';
    nextBtn.textContent = idx < total - 1 ? 'Next Color →' : 'See Final Results →';
    nextBtn.addEventListener('click', () => {
      state.currentIdx++;
      if (state.currentIdx >= total) {
        state.phase = 'results';
        showResults();
      } else {
        state.phase = 'memorize';
        showMemorize();
      }
    });

    container.appendChild(titleEl);
    container.appendChild(compWrap);
    container.appendChild(ptsEl);
    container.appendChild(nextBtn);
  }

  function showResults() {
    container.innerHTML = '';

    const titleEl = document.createElement('div');
    titleEl.className = 'cm-phase-title';
    titleEl.textContent = 'Results';

    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'cm-results-grid';

    let total = 0;
    state.colors.forEach((orig, i) => {
      const g = state.guesses[i];
      const error = colorError(orig.h, orig.s, orig.b, g.h, g.s, g.b);
      const pts = calcPoints(error);
      total += pts;

      const row = document.createElement('div');
      row.className = 'cm-result-row';

      const numEl = document.createElement('span');
      numEl.className = 'cm-result-num';
      numEl.textContent = `#${i + 1}`;

      const origSw = document.createElement('div');
      origSw.className = 'cm-result-swatch';
      origSw.style.background = hsbToHex(orig.h, orig.s, orig.b);
      origSw.title = 'Original';

      const guessSw = document.createElement('div');
      guessSw.className = 'cm-result-swatch cm-result-swatch--guess';
      guessSw.style.background = hsbToHex(g.h, g.s, g.b);
      guessSw.title = 'Your guess';

      const ptsEl = document.createElement('span');
      ptsEl.className = 'cm-result-pts' + (pts >= 9 ? ' perfect' : pts >= 5 ? ' good' : '');
      ptsEl.textContent = pts.toFixed(1) + '/10';

      row.appendChild(numEl);
      row.appendChild(origSw);
      row.appendChild(guessSw);
      row.appendChild(ptsEl);
      resultsGrid.appendChild(row);
    });

    const scaledScore = Math.round((total / 50) * 2500);

    const totalEl = document.createElement('div');
    totalEl.className = 'cm-total';
    totalEl.innerHTML = `Total: <span class="cm-total-val">${total.toFixed(1)}</span>/50`;

    container.appendChild(titleEl);
    container.appendChild(resultsGrid);
    container.appendChild(totalEl);

    state.onScore(scaledScore);
    state.onEnd(true, scaledScore);
  }

  // ── Lifecycle ────────────────────────────────────────────────
  function init(_canvas, onScore, onEnd) {
    const wrap = document.getElementById('game-canvas-wrap');
    document.getElementById('game-canvas').style.display = 'none';

    container = document.createElement('div');
    container.className = 'cm-area';
    wrap.appendChild(container);

    state = {
      colors: Array.from({ length: 5 }, randomColor),
      guesses: [],
      roundScores: [],
      currentIdx: 0,
      phase: 'memorize',
      countdown: 5,
      countdownTimer: null,
      onScore,
      onEnd,
    };

    showMemorize();
  }

  function destroy() {
    if (state && state.countdownTimer) clearInterval(state.countdownTimer);
    if (container && container.parentNode) container.parentNode.removeChild(container);
    document.getElementById('game-canvas').style.display = 'block';
    state = null;
    container = null;
  }

  return { init, destroy };
})();
