// Snake Game - MIT Licensed Open Source
// Owner: Zweyx | Developers: Gen 2k14 | 30/08/2025

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const highscoreEl = document.getElementById('highscore');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const leaderboardBtn = document.getElementById('leaderboardBtn');
  const overlay = document.getElementById('overlay');
  const overlayContent = document.getElementById('overlayContent');

  // Settings elements
  const settingsModal = document.getElementById('settingsModal');
  const langSelect = document.getElementById('langSelect');
  const themeSelect = document.getElementById('themeSelect');
  const difficultySelect = document.getElementById('difficultySelect');
  const mapSelect = document.getElementById('mapSelect');
  const gridSizeInput = document.getElementById('gridSizeInput');
  const baseSpeedInput = document.getElementById('baseSpeedInput');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');

  // Leaderboard elements
  const leaderboardModal = document.getElementById('leaderboardModal');
  const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
  const submitScoreBtn = document.getElementById('submitScoreBtn');
  const countrySelect = document.getElementById('countrySelect');
  const storageModeSelect = document.getElementById('storageModeSelect');
  const leaderboardList = document.getElementById('leaderboardList');

  // i18n text elements
  const t = {
    title: document.getElementById('txt_title'),
    sub: document.getElementById('txt_sub'),
    scoreLabel: document.getElementById('txt_score_label'),
    highLabel: document.getElementById('txt_high_label'),
    startBtn: document.getElementById('txt_start_btn'),
    pauseBtn: document.getElementById('txt_pause_btn'),
    restartBtn: document.getElementById('txt_restart_btn'),
    settingsBtn: document.getElementById('txt_settings_btn'),
    footerTips: document.getElementById('txt_footer_tips'),
    settingsTitle: document.getElementById('settingsTitle'),
    langLabel: document.getElementById('txt_lang_label'),
    themeLabel: document.getElementById('txt_theme_label'),
    difficultyLabel: document.getElementById('txt_difficulty_label'),
    mapLabel: document.getElementById('txt_map_label'),
    gridLabel: document.getElementById('txt_grid_label'),
    speedLabel: document.getElementById('txt_speed_label'),
    settingsHint: document.getElementById('txt_settings_hint'),
    closeBtn: document.getElementById('txt_close_btn'),
    saveBtn: document.getElementById('txt_save_btn'),
    leaderboardBtn: document.getElementById('txt_leaderboard_btn')
  };

  let gridSize = 24; // size of each cell (configurable)
  let columns = Math.floor(canvas.width / gridSize);
  let rows = Math.floor(canvas.height / gridSize);
  const recomputeGrid = () => {
    columns = Math.floor(canvas.width / gridSize);
    rows = Math.floor(canvas.height / gridSize);
  };

  const KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
    SPACE: 32, R: 82
  };

  let gameInterval = null;
  let baseSpeedMs = 110; // configurable base speed
  let speedMs = baseSpeedMs; // effective speed
  let snake = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  // food object: { x, y, type: 'normal' | 'gold' }
  let food = null;
  let score = 0;
  let paused = false;
  let started = false;

  // Obstacles and maps
  /** @type {{x:number,y:number}[]} */
  let obstacles = [];
  let difficulty = 'Easy'; // Easy | Medium | Hard
  let mapType = 'Classic'; // Classic | Box | Cross

  // Settings persistence
  const SETTINGS_KEY = 'snake_settings_v1';
  const LB_KEY = 'snake_lb_v1'; // leaderboard storage
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const cfg = JSON.parse(raw);
      if (cfg.lang) langSelect.value = cfg.lang;
      if (cfg.theme) themeSelect.value = cfg.theme;
      if (cfg.difficulty) difficultySelect.value = cfg.difficulty;
      if (cfg.map) mapSelect.value = cfg.map;
      if (cfg.gridSize) gridSizeInput.value = cfg.gridSize;
      if (cfg.baseSpeed) baseSpeedInput.value = cfg.baseSpeed;
    } catch {}
  }
  function saveSettings() {
    const cfg = {
      lang: langSelect.value,
      theme: themeSelect.value,
      difficulty: difficultySelect.value,
      map: mapSelect.value,
      gridSize: Number(gridSizeInput.value),
      baseSpeed: Number(baseSpeedInput.value)
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));
  }

  function applyDifficulty() {
    difficulty = difficultySelect.value;
    baseSpeedMs = Number(baseSpeedInput.value) || 110;
    // Difficulty multiplier
    const mul = difficulty === 'Hard' ? 0.75 : difficulty === 'Medium' ? 0.9 : 1.0;
    speedMs = Math.max(50, Math.round(baseSpeedMs * mul));
  }

  function buildMap() {
    obstacles = [];
    if (difficulty === 'Easy') return; // obstacles only from Medium and up
    mapType = mapSelect.value;
    if (mapType === 'Classic') return;

    if (mapType === 'Box') {
      // Box walls exactly where we draw them -> apple must be inside the box, not outside
      // So the playable area is strictly (x:2..columns-3, y:2..rows-3)
      for (let x = 1; x < columns - 1; x++) {
        obstacles.push({ x, y: 1 });
        obstacles.push({ x, y: rows - 2 });
      }
      for (let y = 1; y < rows - 1; y++) {
        obstacles.push({ x: 1, y });
        obstacles.push({ x: columns - 2, y });
      }
    } else if (mapType === 'Cross') {
      const cx = Math.floor(columns / 2);
      const cy = Math.floor(rows / 2);
      for (let x = 2; x < columns - 2; x++) obstacles.push({ x, y: cy });
      for (let y = 2; y < rows - 2; y++) obstacles.push({ x: cx, y });
      // Carve a safe gap in the row at spawn area to avoid instant death
      obstacles = obstacles.filter(o => !(o.y === cy && o.x >= cx - 2 && o.x <= cx + 3));
    }
  }

  // Leaderboard (country highscores). Design goals:
  // - Local-only (no server) to save bandwidth and storage
  // - Store only country code -> {score:number, updated:number}
  // - When a country's record is replaced, old score is overwritten
  // - Keep at most 200 entries to cap storage well below 100GB (thực tế vài KB)
  function loadLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LB_KEY) || '{}'); } catch { return {}; }
  }
  function saveLeaderboard(lb) {
    const entries = Object.entries(lb);
    if (entries.length > 200) {
      // keep top 200 by score
      entries.sort((a,b) => b[1].score - a[1].score);
      const top = entries.slice(0, 200);
      lb = Object.fromEntries(top);
    }
    localStorage.setItem(LB_KEY, JSON.stringify(lb));
  }
  function setCountryHighscore(countryCode, score) {
    const lb = loadLeaderboard();
    const prev = lb[countryCode];
    if (!prev || score >= prev.score) {
      lb[countryCode] = { score, updated: Date.now() };
      saveLeaderboard(lb); // overwrite to replace old record
      return true; // new or updated highscore
    }
    return false; // not a record
  }
  function getSortedLeaderboard() {
    const lb = loadLeaderboard();
    return Object.entries(lb)
      .map(([code, v]) => ({ code, score: v.score, updated: v.updated }))
      .sort((a,b) => b.score - a.score);
  }

  function resetGame() {
    gridSize = Number(gridSizeInput.value) || 24;
    recomputeGrid();
    applyDifficulty();
    buildMap();

    snake = [
      { x: Math.floor(columns / 2), y: Math.floor(rows / 2) },
      { x: Math.floor(columns / 2) - 1, y: Math.floor(rows / 2) },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    spawnFood();
    score = 0;
    updateScore(0);
    started = true;
    paused = false;
    showOverlay('Bắt đầu! Ấn Space để tạm dừng.', 1200);
  }

  function updateScore(delta) {
    score += delta;
    scoreEl.textContent = score;
    const saved = Number(localStorage.getItem('snake_highscore') || 0);
    if (score > saved) {
      localStorage.setItem('snake_highscore', String(score));
    }
    highscoreEl.textContent = localStorage.getItem('snake_highscore') || '0';
  }

  function randomEmptyCell() {
    const occupied = new Set([
      ...snake.map(p => `${p.x},${p.y}`),
      ...obstacles.map(p => `${p.x},${p.y}`)
    ]);

    // If Box map: force apple inside the inner box (not outside)
    let minX = 0, minY = 0, maxX = columns - 1, maxY = rows - 1;
    if (difficulty !== 'Easy' && mapType === 'Box') {
      minX = 2; minY = 2; maxX = columns - 3; maxY = rows - 3;
    }

    let x, y, guard = 0;
    do {
      x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
      y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
      guard++;
      if (guard > 10000) break; // fail-safe
    } while (occupied.has(`${x},${y}`));
    return { x, y };
  }

  function spawnFood() {
    const cell = randomEmptyCell();
    // Only allow golden apple from Medium and up
    const allowGold = difficulty !== 'Easy';
    const GOLD_CHANCE = 0.2; // 20% chance
    const type = allowGold && Math.random() < GOLD_CHANCE ? 'gold' : 'normal';
    food = { ...cell, type };
  }

  function drawCell(x, y, color) {
    const pad = 2;
    ctx.fillStyle = color;
    ctx.fillRect(x * gridSize + pad, y * gridSize + pad, gridSize - pad * 2, gridSize - pad * 2);
  }

  // Theme helper
  const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';

  // Apple image (SVG)
  const appleSVG = `<?xml version=\"1.0\" encoding=\"UTF-8\"?><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect x='31' y='8' width='4' height='10' fill='#7b4b2a'/>
    <path d='M36 8 C44 6, 52 12, 50 20 C44 18, 38 12, 36 8 Z' fill='#2ecc71'/>
    <circle cx='24' cy='32' r='16' fill='#ff4d4d'/>
    <circle cx='40' cy='32' r='16' fill='#e63b3b'/>
  </svg>`;
  const appleImg = new Image();
  appleImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(appleSVG);

  const goldAppleSVG = `<?xml version=\"1.0\" encoding=\"UTF-8\"?><svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect x='31' y='8' width='4' height='10' fill='#7b4b2a'/>
    <path d='M36 8 C44 6, 52 12, 50 20 C44 18, 38 12, 36 8 Z' fill='#27ae60'/>
    <radialGradient id='g' cx='50%' cy='40%' r='60%'>
      <stop offset='0%' stop-color='#fff59d'/>
      <stop offset='60%' stop-color='#ffd54f'/>
      <stop offset='100%' stop-color='#fbc02d'/>
    </radialGradient>
    <circle cx='24' cy='32' r='16' fill='url(#g)'/>
    <circle cx='40' cy='32' r='16' fill='#ffca28'/>
    <circle cx='40' cy='28' r='6' fill='rgba(255,255,255,0.35)'/>
  </svg>`;
  const goldAppleImg = new Image();
  goldAppleImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(goldAppleSVG);

  function drawApple(x, y, type = 'normal') {
    const pad = 2;
    const px = x * gridSize + pad;
    const py = y * gridSize + pad;
    const size = gridSize - pad * 2;
    const img = type === 'gold' ? goldAppleImg : appleImg;
    if (img.complete) {
      ctx.drawImage(img, px, py, size, size);
    } else {
      drawCell(x, y, type === 'gold' ? '#ffd54f' : '#ff4d4d');
    }
  }


  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid (optional subtle)
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = isLight() ? '#000000' : '#ffffff';
    for (let c = 0; c <= columns; c++) {
      ctx.beginPath();
      ctx.moveTo(c * gridSize, 0);
      ctx.lineTo(c * gridSize, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * gridSize);
      ctx.lineTo(canvas.width, r * gridSize);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // obstacles
    obstacles.forEach(o => drawCell(o.x, o.y, '#2ecc71'));

    // draw food
    if (food) drawApple(food.x, food.y, food.type);

    // draw snake
    snake.forEach((seg, i) => {
      const color = i === 0 ? '#7c5cff' : '#b39cff';
      drawCell(seg.x, seg.y, color);
    });
  }

  function step() {
    if (paused || !started) return;

    // apply buffered direction (already validated to avoid 180° turn on keydown)
    direction = nextDirection;

    // compute new head
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // wall collision -> game over
    if (head.x < 0 || head.x >= columns || head.y < 0 || head.y >= rows) {
      return gameOver();
    }

    // obstacle collision
    if (obstacles.some(o => o.x === head.x && o.y === head.y)) {
      return gameOver();
    }

    // move first
    snake.unshift(head);

    // eat
    const ate = food && head.x === food.x && head.y === food.y;
    if (ate) {
      const pts = food.type === 'gold' ? 2 : 1;
      updateScore(pts);
      if (food.type === 'gold') sEatGold(); else sEat();

      // speed up slightly every 5 points
      if (score % 5 === 0 && speedMs > 60) {
        speedMs -= 5;
        restartLoop();
      }
      spawnFood();
      pulse();
    } else {
      // no eat -> tail moves away
      snake.pop();
    }

    // self collision after tail update
    const collide = snake.slice(1).some(p => p.x === head.x && p.y === head.y);
    if (collide) return gameOver();

    draw();
  }

  function gameOver() {
    started = false;
    sGameOver();
    showOverlay(i18n('game_over', score));

  }

  function restartLoop() {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(step, speedMs);
  }

  function startGame() {
    resetGame();
    draw();
    restartLoop();
  }

  function togglePause() {
    if (!started) return;
    paused = !paused;
    showOverlay(paused ? i18n('paused') : i18n('resumed'), 700);
  }

  // Audio (WebAudio – no external assets)
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
  function playTone(freq, duration = 0.12, type = 'square', volume = 0.08) {
    try {
      ensureAudio();
      const t0 = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + duration);
    } catch {}
  }
  function sEat() { playTone(660, 0.08, 'square', 0.08); }
  function sEatGold() { playTone(880, 0.11, 'triangle', 0.09); }
  function sGameOver() { playTone(180, 0.3, 'sawtooth', 0.08); }

  function pulse() {
    canvas.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.02)' },
      { transform: 'scale(1)' },
    ], { duration: 200, easing: 'ease-out' });
  }

  function showOverlay(text, timeout) {
    overlayContent.textContent = text;
    overlay.style.pointerEvents = 'none';
    overlay.style.opacity = '1';
    if (timeout) {
      setTimeout(() => overlay.style.opacity = '0', timeout);
    }
  }

  function hideOverlay() {
    overlay.style.opacity = '0';
  }

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    const k = e.keyCode || e.which;
    if ([KEY.LEFT, KEY.RIGHT, KEY.UP, KEY.DOWN, KEY.SPACE].includes(k)) e.preventDefault();
    if (k === KEY.LEFT && direction.x !== 1) nextDirection = { x: -1, y: 0 };
    else if (k === KEY.RIGHT && direction.x !== -1) nextDirection = { x: 1, y: 0 };
    else if (k === KEY.UP && direction.y !== 1) nextDirection = { x: 0, y: -1 };
    else if (k === KEY.DOWN && direction.y !== -1) nextDirection = { x: 0, y: 1 };
    else if (k === KEY.SPACE) togglePause();
    else if (k === KEY.R) startGame();
  });

  // Basic swipe for mobile
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > ay) {
      if (dx > 0 && direction.x !== -1) nextDirection = { x: 1, y: 0 };
      else if (dx < 0 && direction.x !== 1) nextDirection = { x: -1, y: 0 };
    } else {
      if (dy > 0 && direction.y !== -1) nextDirection = { x: 0, y: 1 };
      else if (dy < 0 && direction.y !== 1) nextDirection = { x: 0, y: -1 };
    }
    touchStart = null;
  }, { passive: true });

  // Settings modal UI
  function openSettings() { settingsModal.setAttribute('aria-hidden', 'false'); }
  function closeSettings() { settingsModal.setAttribute('aria-hidden', 'true'); }

  function openLeaderboard() { leaderboardModal.setAttribute('aria-hidden', 'false'); }
  function closeLeaderboard() { leaderboardModal.setAttribute('aria-hidden', 'true'); }

  settingsBtn.addEventListener('click', () => { openSettings(); });
  closeSettingsBtn.addEventListener('click', () => { closeSettings(); });
  function updateMapPreview() {
    // Preview obstacles on settings changes when not playing
    gridSize = Number(gridSizeInput.value) || 24;
    recomputeGrid();
    applyDifficulty();
    buildMap();
    if (!started) draw();
  }

  saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
    applyTheme();
    applyI18n();
    updateMapPreview();
    showOverlay(i18n('settings_hint'), 900);
    closeSettings();
  });

  // Live apply for better UX
  themeSelect.addEventListener('change', applyTheme);
  langSelect.addEventListener('change', applyI18n);
  difficultySelect.addEventListener('change', updateMapPreview);
  mapSelect.addEventListener('change', updateMapPreview);

  // Buttons
  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', togglePause);
  restartBtn.addEventListener('click', startGame);
  leaderboardBtn.addEventListener('click', openLeaderboard);
  closeLeaderboardBtn.addEventListener('click', closeLeaderboard);
  submitScoreBtn.addEventListener('click', () => {
    const cc = countrySelect.value || 'VN';
    const updated = setCountryHighscore(cc, Number(localStorage.getItem('snake_highscore') || 0));
    if (updated) showOverlay((langSelect.value==='vi'?'✅ Cập nhật kỉ lục quốc gia!':'✅ Country record updated!'), 1200);
    renderLeaderboard();
  });

  // Country list (ISO-ish, minimal)
  const COUNTRIES = [
    'VN','US','JP','KR','CN','TH','SG','MY','PH','ID','IN','DE','FR','GB','IT','ES','RU','UA','BR','AR','PE','CL','MX','CA','AU','NZ','SA','AE','EG','ZA'
  ];

  // i18n system
  const LANGUAGE_OPTIONS = {
    vi: 'Tiếng Việt',
    en: 'English',
    zh: '中文',
    ru: 'Русский',
    fr: 'Français',
    ja: '日本語',
    es: 'Español',
    de: 'Deutsch',
    pt: 'Português'
  };

  const messages = {
    vi: {
      start_hint: 'Nhấn ▶️ Bắt đầu hoặc phím R để chơi',
      paused: 'Tạm dừng ⏸️',
      resumed: 'Tiếp tục ▶️',
      game_over: (s) => `Game Over! Điểm: ${s}. Nhấn R để chơi lại.`,
      title: '🐍 Snake Game',
      sub: 'Phiên bản web – điều khiển bằng phím mũi tên hoặc vuốt trên mobile',
      start_btn: 'Bắt đầu', pause_btn: 'Tạm dừng', restart_btn: 'Chơi lại', settings_btn: 'Cài đặt',
      footer_tips: 'Phím tắt: ⬆️⬇️⬅️➡️ di chuyển • Space: Tạm dừng/Tiếp tục • R: Chơi lại',
      settings: 'Cài đặt', lang: 'Ngôn ngữ', theme: 'Giao diện', difficulty: 'Độ khó', map: 'Bản đồ',
      grid: 'Kích thước ô (px)', speed: 'Tốc độ cơ bản (ms)',
      settings_hint: 'Một số thay đổi sẽ áp dụng khi bạn bắt đầu lại trận mới.',
      close: 'Đóng', save: 'Lưu',
      leaderboard_title: 'Bảng xếp hạng quốc gia',
      country_label: 'Quốc gia của bạn',
      privacy_label: 'Chế độ lưu trữ',
      leaderboard_hint: 'Dữ liệu sẽ lưu tối thiểu để tiết kiệm dung lượng. Khi có kỉ lục mới, bản cũ sẽ được thay thế.',
      submit_btn: 'Gửi kỉ lục của tôi',
      leaderboard_btn: 'BXH Quốc gia'
    },
    en: {
      start_hint: 'Press ▶️ Start or R to play',
      paused: 'Paused ⏸️',
      resumed: 'Resumed ▶️',
      game_over: (s) => `Game Over! Score: ${s}. Press R to restart.`,
      title: '🐍 Snake Game',
      sub: 'Web version – control with arrow keys or swipe on mobile',
      start_btn: 'Start', pause_btn: 'Pause', restart_btn: 'Restart', settings_btn: 'Settings',
      footer_tips: 'Shortcuts: ⬆️⬇️⬅️➡️ move • Space: Pause/Resume • R: Restart',
      settings: 'Settings', lang: 'Language', theme: 'Theme', difficulty: 'Difficulty', map: 'Map',
      grid: 'Cell size (px)', speed: 'Base speed (ms)',
      settings_hint: 'Some changes will apply when you start a new game.',
      close: 'Close', save: 'Save',
      leaderboard_title: 'Country leaderboard',
      country_label: 'Your country',
      privacy_label: 'Storage mode',
      leaderboard_hint: 'Data is stored minimally. When a new record is set, the previous one is replaced.',
      submit_btn: 'Submit my record',
      leaderboard_btn: 'Country LB'
    }
  };

  // Minimal translations (crowdsourced-ready). If any string missing, fallback to English.
  messages.zh = {
    ...messages.en,
    start_hint: '按 ▶️ 开始 或 R 键开始',
    paused: '已暂停 ⏸️',
    resumed: '继续 ▶️',
    title: '🐍 贪吃蛇',
    sub: '网页版本 – 方向键或手机滑动控制',
    start_btn: '开始', pause_btn: '暂停', restart_btn: '重开', settings_btn: '设置',
    footer_tips: '快捷键: ⬆️⬇️⬅️➡️ 移动 • Space 暂停/继续 • R 重开',
    settings: '设置', lang: '语言', theme: '主题', difficulty: '难度', map: '地图',
    grid: '单元大小 (px)', speed: '基础速度 (ms)',
    settings_hint: '部分更改会在重新开始后生效。',
    close: '关闭', save: '保存',
    leaderboard_title: '国家排行榜', country_label: '你的国家', privacy_label: '存储模式',
    leaderboard_hint: '数据最小化存储；当有新纪录时会替换旧数据。', submit_btn: '提交我的纪录',
    leaderboard_btn: '国家排行榜'
  };

  messages.ru = {
    ...messages.en,
    start_hint: 'Нажмите ▶️ Старт или R',
    paused: 'Пауза ⏸️',
    resumed: 'Продолжить ▶️',
    title: '🐍 Змейка',
    sub: 'Веб-версия — управление стрелками или свайпом',
    start_btn: 'Старт', pause_btn: 'Пауза', restart_btn: 'Заново', settings_btn: 'Настройки',
    footer_tips: 'Горячие клавиши: стрелки • Space Пауза/Продолжить • R Заново',
    settings: 'Настройки', lang: 'Язык', theme: 'Тема', difficulty: 'Сложность', map: 'Карта',
    grid: 'Размер клетки (px)', speed: 'Базовая скорость (ms)',
    settings_hint: 'Некоторые изменения применяются при новом запуске.',
    close: 'Закрыть', save: 'Сохранить',
    leaderboard_title: 'Рейтинг стран', country_label: 'Ваша страна', privacy_label: 'Режим хранения',
    leaderboard_hint: 'Данные хранятся минимально; при новом рекорде старые заменяются.', submit_btn: 'Отправить мой рекорд',
    leaderboard_btn: 'Рейтинг стран'
  };

  messages.fr = {
    ...messages.en,
    start_hint: 'Appuyez ▶️ Démarrer ou R',
    paused: 'En pause ⏸️',
    resumed: 'Reprise ▶️',
    title: '🐍 Snake',
    sub: 'Version web – flèches ou balayage mobile',
    start_btn: 'Démarrer', pause_btn: 'Pause', restart_btn: 'Rejouer', settings_btn: 'Paramètres',
    footer_tips: 'Raccourcis: flèches • Espace: Pause/Reprendre • R: Rejouer',
    settings: 'Paramètres', lang: 'Langue', theme: 'Thème', difficulty: 'Difficulté', map: 'Carte',
    grid: 'Taille des cases (px)', speed: 'Vitesse de base (ms)',
    settings_hint: 'Certains changements s’appliquent au nouveau départ.',
    close: 'Fermer', save: 'Enregistrer',
    leaderboard_title: 'Classement des pays', country_label: 'Votre pays', privacy_label: 'Mode de stockage',
    leaderboard_hint: 'Données minimales; nouveau record remplace l’ancien.', submit_btn: 'Soumettre mon record',
    leaderboard_btn: 'Classement pays'
  };

  messages.ja = {
    ...messages.en,
    start_hint: '▶️ または R で開始',
    paused: '一時停止 ⏸️',
    resumed: '再開 ▶️',
    title: '🐍 スネーク',
    sub: 'ウェブ版 – 矢印キー / スワイプ操作',
    start_btn: '開始', pause_btn: '一時停止', restart_btn: 'リスタート', settings_btn: '設定',
    footer_tips: 'ショートカット: 矢印キー • Space: 一時停止/再開 • R: リスタート',
    settings: '設定', lang: '言語', theme: 'テーマ', difficulty: '難易度', map: 'マップ',
    grid: 'マスサイズ (px)', speed: '基礎速度 (ms)',
    settings_hint: 'いくつかの変更は再スタート時に適用。',
    close: '閉じる', save: '保存',
    leaderboard_title: '国別ランキング', country_label: 'あなたの国', privacy_label: '保存モード',
    leaderboard_hint: 'データは最小限で保存。新記録で古いものを置換。', submit_btn: '記録を送信',
    leaderboard_btn: '国別ランキング'
  };

  messages.es = {
    ...messages.en,
    start_hint: 'Pulsa ▶️ Iniciar o R', paused: 'Pausado ⏸️', resumed: 'Reanudado ▶️',
    title: '🐍 Snake', sub: 'Versión web – flechas o deslizamiento', start_btn: 'Iniciar', pause_btn: 'Pausa', restart_btn: 'Reiniciar', settings_btn: 'Ajustes',
    footer_tips: 'Atajos: flechas • Espacio: Pausa/Reanudar • R: Reiniciar', settings: 'Ajustes', lang: 'Idioma', theme: 'Tema', difficulty: 'Dificultad', map: 'Mapa',
    grid: 'Tamaño de celda (px)', speed: 'Velocidad base (ms)', settings_hint: 'Algunos cambios se aplican al reiniciar.', close: 'Cerrar', save: 'Guardar',
    leaderboard_title: 'Clasificación por país', country_label: 'Tu país', privacy_label: 'Modo de almacenamiento', leaderboard_hint: 'Datos mínimos; el nuevo récord reemplaza el anterior.', submit_btn: 'Enviar mi récord', leaderboard_btn: 'Clasificación país'
  };

  messages.de = {
    ...messages.en,
    start_hint: 'Drücke ▶️ Start oder R', paused: 'Pausiert ⏸️', resumed: 'Fortgesetzt ▶️', title: '🐍 Snake', sub: 'Web-Version – Pfeiltasten oder Wischen', start_btn: 'Start', pause_btn: 'Pause', restart_btn: 'Neustart', settings_btn: 'Einstellungen', footer_tips: 'Shortcuts: Pfeile • Space: Pause/Fortsetzen • R: Neustart', settings: 'Einstellungen', lang: 'Sprache', theme: 'Theme', difficulty: 'Schwierigkeit', map: 'Karte', grid: 'Zellgröße (px)', speed: 'Grundgeschwindigkeit (ms)', settings_hint: 'Einige Änderungen gelten beim Neustart.', close: 'Schließen', save: 'Speichern', leaderboard_title: 'Länderrangliste', country_label: 'Dein Land', privacy_label: 'Speichermodus', leaderboard_hint: 'Minimal gespeichert; neuer Rekord ersetzt alten.', submit_btn: 'Meinen Rekord senden', leaderboard_btn: 'Länderrangliste'
  };

  messages.pt = {
    ...messages.en,
    start_hint: 'Pressione ▶️ Iniciar ou R', paused: 'Pausado ⏸️', resumed: 'Retomado ▶️', title: '🐍 Snake', sub: 'Versão web – setas ou deslize', start_btn: 'Iniciar', pause_btn: 'Pausar', restart_btn: 'Reiniciar', settings_btn: 'Configurações', footer_tips: 'Atalhos: setas • Espaço: Pausar/Retomar • R: Reiniciar', settings: 'Configurações', lang: 'Idioma', theme: 'Tema', difficulty: 'Dificuldade', map: 'Mapa', grid: 'Tamanho da célula (px)', speed: 'Velocidade base (ms)', settings_hint: 'Algumas mudanças aplicam ao reiniciar.', close: 'Fechar', save: 'Salvar', leaderboard_title: 'Ranking por país', country_label: 'Seu país', privacy_label: 'Modo de armazenamento', leaderboard_hint: 'Dados mínimos; novo recorde substitui o anterior.', submit_btn: 'Enviar meu recorde', leaderboard_btn: 'Ranking por país'
  };

  function i18n(key, ...args) {
    const lang = langSelect.value || 'vi';
    const dict = messages[lang];
    const val = dict[key];
    return typeof val === 'function' ? val(...args) : val;
  }

  function renderCountrySelect() {
    if (!countrySelect.options.length) {
      COUNTRIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        countrySelect.appendChild(opt);
      });
      // try to guess from browser locale
      const guess = (navigator.language || 'vi').toUpperCase().split('-').pop();
      if (COUNTRIES.includes(guess)) countrySelect.value = guess;
      else countrySelect.value = 'VN';
    }
  }

  function renderLeaderboard() {
    const list = getSortedLeaderboard();
    leaderboardList.innerHTML = '';
    list.forEach((e, idx) => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<div>#${idx+1} • ${e.code}</div><div class="score">${e.score}</div>`;
      leaderboardList.appendChild(row);
    });
  }

  function applyI18n() {
    t.title.textContent = i18n('title');
    t.sub.textContent = i18n('sub');
    t.scoreLabel.firstChild.textContent = (langSelect.value === 'vi' ? 'Điểm: ' : 'Score: ');
    t.highLabel.firstChild.textContent = (langSelect.value === 'vi' ? '🏆 Kỷ lục: ' : '🏆 Highscore: ');
    t.startBtn.textContent = i18n('start_btn');
    t.pauseBtn.textContent = i18n('pause_btn');
    t.restartBtn.textContent = i18n('restart_btn');
    t.settingsBtn.textContent = i18n('settings_btn');
    t.footerTips.textContent = i18n('footer_tips');

    t.leaderboardBtn.textContent = i18n('leaderboard_btn');
    document.getElementById('txt_settings_title').textContent = i18n('settings');
    document.getElementById('txt_leaderboard_title').textContent = i18n('leaderboard_title');
    document.getElementById('txt_country_label').textContent = i18n('country_label');
    document.getElementById('txt_privacy_label').textContent = i18n('privacy_label');
    document.getElementById('txt_leaderboard_hint').textContent = i18n('leaderboard_hint');
    document.getElementById('txt_close_leaderboard_btn').textContent = i18n('close');
    document.getElementById('txt_submit_btn').textContent = i18n('submit_btn');
    t.langLabel.textContent = i18n('lang');

    // update language options labels dynamically (optional polish)
    Array.from(langSelect.options).forEach(opt => {
      const code = opt.value;
      if (LANGUAGE_OPTIONS[code]) opt.textContent = LANGUAGE_OPTIONS[code];
    });
    t.themeLabel.textContent = i18n('theme');
    t.difficultyLabel.textContent = i18n('difficulty');
    t.mapLabel.textContent = i18n('map');
    t.gridLabel.textContent = i18n('grid');
    t.speedLabel.textContent = i18n('speed');
    t.settingsHint.textContent = i18n('settings_hint');
    t.closeBtn.textContent = i18n('close');
    t.saveBtn.textContent = i18n('save');
  }

  function applyTheme() {
    const theme = themeSelect.value || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'gaming') {
      showOverlay('⚠️ Gaming mode: hiệu ứng nặng, không phù hợp máy yếu', 1800);
    } else if (theme === 'hacker') {
      showOverlay('👨‍💻 Hacker mode: matrix vibes enabled', 1400);
    }
    draw(); // re-render for grid color contrast
  }

  // Init
  loadSettings();
  applyTheme();
  applyI18n();
  highscoreEl.textContent = localStorage.getItem('snake_highscore') || '0';
  showOverlay(i18n('start_hint'));
  renderCountrySelect();
  renderLeaderboard();
  draw();
})();
