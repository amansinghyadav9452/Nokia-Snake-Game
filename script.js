const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const boot = document.getElementById("boot");
const menu = document.getElementById("menu");
const gameView = document.getElementById("gameView");
const customizeView = document.getElementById("customizeView");
const leaderboardView = document.getElementById("leaderboardView");
const secretView = document.getElementById("secretView");
const scoreList = document.getElementById("scoreList");
const nameEntry = document.getElementById("nameEntry");
const playerName = document.getElementById("playerName");
const secretCode = document.getElementById("secretCode");
const eventEl = document.getElementById("event");
const skinValue = document.getElementById("skinValue");
const themeValue = document.getElementById("themeValue");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const menuBest = document.getElementById("menuBest");
const difficultyValue = document.getElementById("difficultyValue");
const comboEl = document.getElementById("combo");
const powerEl = document.getElementById("power");
const missionCount = document.getElementById("missionCount");
const missionEl = document.getElementById("mission");
const okBtn = document.getElementById("okBtn");
const leftSoft = document.getElementById("leftSoft");
const rightSoft = document.getElementById("rightSoft");

const gridSize = 20;
const cells = canvas.width / gridSize;

const difficulties = [
  { name: "EASY", speed: 175 },
  { name: "NORMAL", speed: 125 },
  { name: "HARD", speed: 85 }
];

const foods = [
  { type: "normal", chance: 66, points: 1, label: "NORMAL", color: "#26361f" },
  { type: "gold", chance: 16, points: 5, label: "GOLD +5", color: "#26361f" },
  { type: "gem", chance: 9, points: 10, label: "GEM +10", color: "#26361f" },
  { type: "poison", chance: 9, points: -2, label: "POISON", color: "#26361f" }
];

const powers = [
  { type: "speed", label: "SPEED", duration: 5000 },
  { type: "slow", label: "SLOW", duration: 6500 },
  { type: "ghost", label: "GHOST", duration: 5000 },
  { type: "shrink", label: "SHRINK", duration: 0 }
];

const achievements = [
  ["FIRST BITE", "firstBite"],
  ["100 POINTS", "hundred"],
  ["NO WALL HIT", "clean"],
  ["SPEED DEMON", "speedDemon"],
  ["SNAKE MASTER", "master"]
];

let difficulty = Number(localStorage.getItem("bytesnake-difficulty")) || 1;
let best = Number(localStorage.getItem("bytesnake-best")) || 0;
let menuIndex = 0;
let snake = [];
let food = null;
let power = null;
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let combo = 1;
let comboHits = 0;
let missionTarget = 10;
let missionProgress = 0;
let timer = null;
let powerTimer = null;
let state = "boot";
let paused = false;
let cleanRun = true;
let audioContext = null;
let foodCount = 0;

const menuItems = ["play", "difficulty", "highscore", "achievements", "customize", "leaderboard", "secret"];

const secretSequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"];
let secretProgress = 0;
let pendingScore = null;
let leaderboard = loadLeaderboard();
let savedPlayerName = localStorage.getItem("bytesnake-player-name") || "";

const skins = ["CLASSIC", "STEALTH", "CYBER", "GOLD", "TOXIC"];
const themes = ["GREEN", "DARK", "AMBER", "BLUE", "MONO"];

let skinIndex = Number(localStorage.getItem("bytesnake-skin")) || 0;
let themeIndex = Number(localStorage.getItem("bytesnake-theme")) || 0;
let customizeIndex = 0;
let eventType = null;
let eventTimer = null;
let eventEnds = 0;
let doubleScore = false;
let boardSize = cells;

bestEl.textContent = best;
menuBest.textContent = best;
difficultyValue.textContent = difficulties[difficulty].name;
skinValue.textContent = skins[skinIndex];
themeValue.textContent = themes[themeIndex];
applyTheme();

function beep(type) {
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    const sounds = {
      move: [520, .025, "square"],
      eat: [880, .07, "square"],
      bonus: [1120, .09, "square"],
      select: [660, .055, "square"],
      error: [180, .12, "sawtooth"],
      gameover: [120, .18, "square"],
      power: [740, .13, "triangle"]
    };

    const [frequency, duration, wave] = sounds[type] || sounds.move;
    oscillator.type = wave;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
}


function loadLeaderboard() {
  try {
    const saved = JSON.parse(localStorage.getItem("bytesnake-leaderboard") || "[]");
    return Array.isArray(saved) ? saved.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function saveLeaderboard() {
  localStorage.setItem("bytesnake-leaderboard", JSON.stringify(leaderboard.slice(0, 10)));
}

function qualifies(score) {
  return score > 0 && (leaderboard.length < 10 || score > leaderboard[leaderboard.length - 1].score);
}

function showNameEntry(score) {
  pendingScore = score;

  if (savedPlayerName) {
    saveScore();
    return;
  }

  nameEntry.classList.remove("hidden");
  playerName.value = "";
  setTimeout(() => playerName.focus(), 0);
}

function saveScore() {
  if (pendingScore === null) return;

  const name = (playerName.value || savedPlayerName || "PLAYER").trim().toUpperCase().slice(0, 10) || "PLAYER";
  savedPlayerName = name;
  localStorage.setItem("bytesnake-player-name", savedPlayerName);

  leaderboard.push({
    name,
    score: pendingScore,
    difficulty: difficulties[difficulty].name,
    date: Date.now()
  });

  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10);
  saveLeaderboard();
  pendingScore = null;
  nameEntry.classList.add("hidden");
  renderLeaderboard();
}

function renderLeaderboard() {
  if (!leaderboard.length) {
    scoreList.innerHTML = '<div class="score-line"><span>--</span><span>NO SCORES</span><span>--</span></div>';
    return;
  }

  scoreList.innerHTML = leaderboard.map((entry, index) =>
    `<div class="score-line"><span>${String(index + 1).padStart(2, "0")}</span><span>${entry.name}</span><span>${entry.score}</span></div>`
  ).join("");
}

function showLeaderboard() {
  clearInterval(timer);
  menu.classList.add("hidden");
  gameView.classList.add("hidden");
  customizeView.classList.add("hidden");
  secretView.classList.add("hidden");
  leaderboardView.classList.remove("hidden");
  overlay.classList.add("hidden");
  nameEntry.classList.add("hidden");
  state = "leaderboard";
  renderLeaderboard();
}

function showSecret() {
  clearInterval(timer);
  menu.classList.add("hidden");
  gameView.classList.add("hidden");
  customizeView.classList.add("hidden");
  leaderboardView.classList.add("hidden");
  secretView.classList.remove("hidden");
  overlay.classList.add("hidden");
  state = "secret";
  secretCode.textContent = localStorage.getItem("bytesnake-secret") === "unlocked" ? "UNLOCKED" : "READY";
}

function unlockSecret() {
  localStorage.setItem("bytesnake-secret", "unlocked");
  secretCode.textContent = "UNLOCKED";
  secretView.classList.add("unlock");
  setTimeout(() => secretView.classList.remove("unlock"), 600);
  beep("bonus");
}

function handleSecretKey(key) {
  if (key === secretSequence[secretProgress]) {
    secretProgress++;
    if (secretProgress === secretSequence.length) {
      secretProgress = 0;
      unlockSecret();
    }
  } else {
    secretProgress = key === secretSequence[0] ? 1 : 0;
  }
}

function showMenu() {
  clearInterval(timer);
  clearTimeout(powerTimer);
  clearTimeout(eventTimer);
  state = "menu";
  paused = false;
  gameView.classList.add("hidden");
  customizeView.classList.add("hidden");
  leaderboardView.classList.add("hidden");
  secretView.classList.add("hidden");
  nameEntry.classList.add("hidden");
  overlay.classList.add("hidden");
  menu.classList.remove("hidden");
  leftSoft.textContent = "MENU";
  rightSoft.textContent = "BACK";
  updateMenu();
}

function updateMenu() {
  document.querySelectorAll(".menu-item").forEach((item, index) => {
    item.classList.toggle("selected", index === menuIndex);
  });
}

function selectMenu() {
  const item = menuItems[menuIndex];

  if (item === "play") {
    startGame();
    return;
  }

  if (item === "difficulty") {
    difficulty = (difficulty + 1) % difficulties.length;
    localStorage.setItem("bytesnake-difficulty", difficulty);
    difficultyValue.textContent = difficulties[difficulty].name;
skinValue.textContent = skins[skinIndex];
themeValue.textContent = themes[themeIndex];
applyTheme();
    beep("select");
    return;
  }

  if (item === "highscore") {
    showHighScore();
    return;
  }

  if (item === "achievements") {
    showAchievements();
    return;
  }

  if (item === "customize") {
    showCustomize();
    return;
  }

  if (item === "leaderboard") {
    showLeaderboard();
    return;
  }

  if (item === "secret") {
    showSecret();
  }
}

function showHighScore() {
  clearInterval(timer);
  menu.classList.add("hidden");
  gameView.classList.remove("hidden");
  state = "highscore";
  overlayTitle.textContent = "HIGH SCORE";
  overlayText.innerHTML = `${best} POINTS<br><br>DIFFICULTY ${difficulties[difficulty].name}`;
  overlay.classList.remove("hidden");
}

function showAchievements() {
  clearInterval(timer);
  menu.classList.add("hidden");
  gameView.classList.remove("hidden");
  state = "achievements";

  const unlocked = JSON.parse(localStorage.getItem("bytesnake-achievements") || "{}");
  const lines = achievements.map(([name, key]) => `${unlocked[key] ? "✓" : "·"} ${name}`).join("<br>");
  overlayTitle.textContent = "ACHIEVEMENTS";
  overlayText.innerHTML = lines;
  overlay.classList.remove("hidden");
}

function showCustomize() {
  clearInterval(timer);
  menu.classList.add("hidden");
  gameView.classList.add("hidden");
  leaderboardView.classList.add("hidden");
  secretView.classList.add("hidden");
  customizeView.classList.remove("hidden");
  overlay.classList.add("hidden");
  state = "customize";
  customizeIndex = 0;
  updateCustomize();
}

function updateCustomize() {
  skinValue.textContent = skins[skinIndex];
  themeValue.textContent = themes[themeIndex];
  applyTheme();
}

function changeCustomize(step) {
  if (state !== "customize") return;

  if (customizeIndex === 0) {
    skinIndex = (skinIndex + step + skins.length) % skins.length;
    localStorage.setItem("bytesnake-skin", skinIndex);
  } else {
    themeIndex = (themeIndex + step + themes.length) % themes.length;
    localStorage.setItem("bytesnake-theme", themeIndex);
  }

  updateCustomize();
  beep("select");
}

function applyTheme() {
  const rootStyle = document.documentElement.style;
  const palette = [
    ["#a9bd78", "#c1d48d", "#26361f", "#405a31"],
    ["#7b8a68", "#a1ad8d", "#182017", "#303d2a"],
    ["#c1a35d", "#dfc47c", "#382a13", "#65501f"],
    ["#7ca9ad", "#a8d0d0", "#173237", "#31565b"],
    ["#b5b5a5", "#d3d3c4", "#222620", "#4b5148"]
  ];

  const [lcd, lcdHi, ink, ink2] = palette[themeIndex];
  rootStyle.setProperty("--lcd", lcd);
  rootStyle.setProperty("--lcd-hi", lcdHi);
  rootStyle.setProperty("--ink", ink);
  rootStyle.setProperty("--ink-2", ink2);
}

function showEvent(text, duration = 2200) {
  clearTimeout(eventTimer);
  eventEl.textContent = text;
  eventEl.classList.remove("hidden");
  eventEl.classList.add("popup");
  setTimeout(() => eventEl.classList.remove("popup"), 400);

  eventTimer = setTimeout(() => {
    eventEl.classList.add("hidden");
  }, duration);
}

function triggerRandomEvent() {
  const roll = Math.random();

  if (roll < .05) {
    eventType = "double";
    doubleScore = true;
    eventEnds = Date.now() + 8000;
    showEvent("DOUBLE SCORE");
    beep("bonus");
    setTimeout(() => {
      doubleScore = false;
      eventType = null;
      eventEl.classList.add("hidden");
    }, 8000);
    return;
  }

  if (roll < .09) {
    eventType = "rush";
    eventEnds = Date.now() + 6500;
    showEvent("SPEED RUSH");
    updateSpeed();
    beep("power");
    setTimeout(() => {
      eventType = null;
      eventEl.classList.add("hidden");
      updateSpeed();
    }, 6500);
    return;
  }

  if (roll < .12) {
    eventType = "shrink";
    eventEnds = Date.now() + 7000;
    showEvent("BOARD SHRINK");
    setTimeout(() => {
      eventType = null;
      eventEl.classList.add("hidden");
    }, 7000);
  }
}

function newSnake() {
  clearTimeout(eventTimer);
  eventType = null;
  doubleScore = false;
  eventEl.classList.add("hidden");
  snake = [
    { x: 7, y: 10 },
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 }
  ];

  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  combo = 1;
  comboHits = 0;
  missionProgress = 0;
  foodCount = 0;
  cleanRun = true;
  power = null;
  scoreEl.textContent = score;
  comboEl.textContent = "COMBO x1";
  powerEl.textContent = "NORMAL";
  updateMission();
  placeFood();
  placePower();
}

function placeFood() {
  const roll = Math.random() * 100;
  let total = 0;
  let selected = foods[0];

  for (const item of foods) {
    total += item.chance;
    if (roll <= total) {
      selected = item;
      break;
    }
  }

  do {
    food = {
      x: Math.floor(Math.random() * cells),
      y: Math.floor(Math.random() * cells),
      type: selected.type
    };
  } while (snake.some(part => part.x === food.x && part.y === food.y));
}

function placePower() {
  power = null;

  if (Math.random() > .16) return;

  const selected = powers[Math.floor(Math.random() * powers.length)];

  do {
    power = {
      x: Math.floor(Math.random() * cells),
      y: Math.floor(Math.random() * cells),
      type: selected.type,
      label: selected.label,
      duration: selected.duration
    };
  } while (
    snake.some(part => part.x === power.x && part.y === power.y) ||
    (food && food.x === power.x && food.y === power.y)
  );
}

function startGame() {
  clearInterval(timer);
  clearTimeout(powerTimer);
  newSnake();
  state = "playing";
  paused = false;
  if (localStorage.getItem("bytesnake-secret") === "unlocked") {
    showEvent("SECRET MODE READY");
  }
  menu.classList.add("hidden");
  customizeView.classList.add("hidden");
  leaderboardView.classList.add("hidden");
  secretView.classList.add("hidden");
  gameView.classList.remove("hidden");
  overlay.classList.add("hidden");
  nameEntry.classList.add("hidden");
  leftSoft.textContent = "PAUSE";
  rightSoft.textContent = "MENU";
  updateSpeed();
  draw();
  beep("select");
}

function updateSpeed() {
  clearInterval(timer);
  let speed = Math.max(48, difficulties[difficulty].speed - score * 2);

  if (power?.type === "speed") speed *= .55;
  if (power?.type === "slow") speed *= 1.55;
  if (eventType === "rush") speed *= .55;

  timer = setInterval(move, speed);
}

function move() {
  if (state !== "playing" || paused) return;

  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  if (power?.type === "ghost") {
    if (head.x < 0) head.x = cells - 1;
    if (head.x >= cells) head.x = 0;
    if (head.y < 0) head.y = cells - 1;
    if (head.y >= cells) head.y = 0;
  }

  const hitWall =
    head.x < 0 ||
    head.x >= cells ||
    head.y < 0 ||
    head.y >= cells;

  const hitBody = snake.some((part, index) => {
    if (index === snake.length - 1) return false;
    return part.x === head.x && part.y === head.y;
  });

  if (hitWall || hitBody) {
    cleanRun = false;
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    eatFood();
  } else if (power && head.x === power.x && head.y === power.y) {
    eatPower();
  } else {
    snake.pop();
  }

  draw();
}

function eatFood() {
  const item = foods.find(entry => entry.type === food.type) || foods[0];
  foodCount++;
  missionProgress++;

  if (item.type === "poison") {
    score = Math.max(0, score - 2);
    combo = 1;
    comboHits = 0;
    if (snake.length > 4) snake.splice(4);
    beep("error");
  } else {
    comboHits++;
    combo = Math.min(9, 1 + Math.floor(comboHits / 3));
    const multiplier = doubleScore ? 2 : 1;
    score += item.points * combo * multiplier;
    beep(item.points > 1 || doubleScore ? "bonus" : "eat");
  }

  scoreEl.textContent = score;
  comboEl.textContent = `COMBO x${combo}`;
  updateBest();
  updateMission();
  unlockAchievements();

  if (missionProgress >= missionTarget) {
    score += 10;
    scoreEl.textContent = score;
    missionTarget += 10;
    missionProgress = 0;
    comboHits += 2;
    beep("bonus");
    updateMission();
  }

  placeFood();

  if (!power && Math.random() < (localStorage.getItem("bytesnake-secret") === "unlocked" ? .32 : .18)) placePower();
  if (Math.random() < .14) triggerRandomEvent();
  updateSpeed();
}

function eatPower() {
  const selected = powers.find(item => item.type === power.type);
  if (!selected) return;

  powerEl.textContent = selected.label;
  beep("power");
  gameView.classList.add("power-flash");
  setTimeout(() => gameView.classList.remove("power-flash"), 500);

  if (selected.type === "shrink") {
    snake.splice(3, Math.max(0, snake.length - 3));
    power = null;
    powerEl.textContent = "NORMAL";
    return;
  }

  clearTimeout(powerTimer);
  powerTimer = setTimeout(() => {
    power = null;
    powerEl.textContent = "NORMAL";
    updateSpeed();
  }, selected.duration);

  updateSpeed();
  placePower();
}

function updateBest() {
  if (score <= best) return;

  best = score;
  bestEl.textContent = best;
  menuBest.textContent = best;
  localStorage.setItem("bytesnake-best", best);
}

function updateMission() {
  missionCount.textContent = `${missionProgress}/${missionTarget}`;
}

function unlockAchievements() {
  const unlocked = JSON.parse(localStorage.getItem("bytesnake-achievements") || "{}");

  if (foodCount >= 1) unlocked.firstBite = true;
  if (score >= 100) unlocked.hundred = true;
  if (cleanRun && score >= 25) unlocked.clean = true;
  if (score >= 150 && difficulties[difficulty].name === "HARD") unlocked.speedDemon = true;
  if (snake.length >= 30) unlocked.master = true;

  localStorage.setItem("bytesnake-achievements", JSON.stringify(unlocked));
}

function endGame() {
  clearInterval(timer);
  clearTimeout(powerTimer);
  state = "gameover";
  paused = false;
  power = null;
  powerEl.textContent = "NORMAL";
  overlayTitle.textContent = "GAME OVER";
  overlayText.textContent = `SCORE ${score}  ·  OK TO RETRY`;
  overlay.classList.remove("hidden");
  beep("gameover");
  draw();

  if (qualifies(score)) {
    setTimeout(() => showNameEntry(score), 250);
  }
}

function togglePause() {
  if (state !== "playing" && state !== "paused") return;

  if (state === "playing") {
    paused = true;
    state = "paused";
    overlayTitle.textContent = "PAUSED";
    overlayText.textContent = "OK TO CONTINUE";
    overlay.classList.remove("hidden");
    beep("select");
    return;
  }

  paused = false;
  state = "playing";
  overlay.classList.add("hidden");
  updateSpeed();
  beep("select");
}

function setDirection(name) {
  if (state !== "playing" || paused) return;

  const dirs = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  const next = dirs[name];

  if (!next) return;
  if (next.x === -direction.x && next.y === -direction.y) return;

  nextDirection = next;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--lcd").trim();
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(66, 232, 255, .10)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= cells; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridSize + .5, 0);
    ctx.lineTo(i * gridSize + .5, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * gridSize + .5);
    ctx.lineTo(canvas.width, i * gridSize + .5);
    ctx.stroke();
  }

  if (eventType === "shrink") {
    ctx.strokeStyle = "#26361f";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  }

  if (food) drawFood();
  if (power) drawPower();

  snake.forEach((part, index) => {
    const x = part.x * gridSize;
    const y = part.y * gridSize;

    const skinColors = {
      CLASSIC: ["#42e8ff", "#1b91b0"],
      STEALTH: ["#b7ff4a", "#527d27"],
      CYBER: ["#ff3cac", "#9a246d"],
      GOLD: ["#ffd34e", "#a47718"],
      TOXIC: ["#b7ff4a", "#287d4b"]
    };
    const colors = skinColors[skins[skinIndex]];
    ctx.fillStyle = index === 0 ? colors[0] : colors[1];
    ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);

    if (index === 0) {
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--lcd").trim();

      if (direction.x !== 0) {
        const eyeX = direction.x > 0 ? x + 13 : x + 4;
        ctx.fillRect(eyeX, y + 5, 3, 3);
        ctx.fillRect(eyeX, y + 12, 3, 3);
      } else {
        const eyeY = direction.y > 0 ? y + 13 : y + 4;
        ctx.fillRect(x + 5, eyeY, 3, 3);
        ctx.fillRect(x + 12, eyeY, 3, 3);
      }
    }
  });
}

function drawFood() {
  const x = food.x * gridSize;
  const y = food.y * gridSize;

  ctx.fillStyle = food?.type === "poison" ? "#ff3cac" : food?.type === "gem" ? "#42e8ff" : food?.type === "gold" ? "#ffd34e" : "#b7ff4a";

  if (food.type === "normal") {
    ctx.fillRect(x + 6, y + 5, 8, 10);
    ctx.fillRect(x + 4, y + 7, 12, 6);
    ctx.fillRect(x + 10, y + 3, 4, 3);
    return;
  }

  if (food.type === "gold") {
    ctx.fillRect(x + 7, y + 3, 6, 14);
    ctx.fillRect(x + 3, y + 7, 14, 6);
    return;
  }

  if (food.type === "gem") {
    ctx.fillRect(x + 7, y + 3, 6, 14);
    ctx.fillRect(x + 4, y + 6, 12, 8);
    ctx.clearRect(x + 8, y + 7, 4, 6);
    return;
  }

  ctx.fillRect(x + 4, y + 4, 12, 12);
  ctx.fillStyle = "#081018";
  ctx.fillRect(x + 7, y + 7, 6, 6);
}

function drawPower() {
  const x = power.x * gridSize;
  const y = power.y * gridSize;

  ctx.fillStyle = food?.type === "poison" ? "#ff3cac" : food?.type === "gem" ? "#42e8ff" : food?.type === "gold" ? "#ffd34e" : "#b7ff4a";
  ctx.fillRect(x + 3, y + 3, 14, 14);
  ctx.fillStyle = "#081018";

  const symbol = {
    speed: "»",
    slow: "«",
    ghost: "G",
    shrink: "S"
  }[power.type];

  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, x + 10, y + 10);
}

function handleOk() {
  if (state === "boot") {
    showMenu();
    return;
  }

  if (state === "menu") {
    selectMenu();
    return;
  }

  if (state === "playing") {
    togglePause();
    return;
  }

  if (state === "paused") {
    togglePause();
    return;
  }

  if (state === "gameover") {
    startGame();
    return;
  }

  if (state === "highscore" || state === "achievements" || state === "customize" || state === "leaderboard" || state === "secret") {
    showMenu();
  }
}

function moveMenu(step) {
  if (state === "customize") {
    changeCustomize(step);
    return;
  }

  if (state !== "menu") return;
  menuIndex = (menuIndex + step + menuItems.length) % menuItems.length;
  updateMenu();
  beep("move");
}

document.addEventListener("keydown", event => {
  handleSecretKey(event.key);

  if (!nameEntry.classList.contains("hidden")) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveScore();
    }
    return;
  }

  const map = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right"
  };

  if (state === "customize") {
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
      event.preventDefault();
      changeCustomize(-1);
      return;
    }
    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
      event.preventDefault();
      changeCustomize(1);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      event.preventDefault();
      customizeIndex = 0;
      updateCustomize();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      event.preventDefault();
      customizeIndex = 1;
      updateCustomize();
      return;
    }
  }

  if (state === "menu") {
    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") {
      event.preventDefault();
      moveMenu(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") {
      event.preventDefault();
      moveMenu(1);
      return;
    }
  }

  if (map[event.key]) {
    event.preventDefault();
    setDirection(map[event.key]);
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    handleOk();
  }

  if (event.key === "Escape") {
    event.preventDefault();
    if (state === "playing" || state === "paused" || state === "gameover") showMenu();
    else if (state === "highscore" || state === "achievements" || state === "customize" || state === "leaderboard" || state === "secret") showMenu();
  }
});

document.querySelectorAll("[data-dir]").forEach(button => {
  button.addEventListener("pointerdown", event => {
    event.preventDefault();

    if (state === "menu") {
      if (button.dataset.dir === "up") moveMenu(-1);
      if (button.dataset.dir === "down") moveMenu(1);
      return;
    }

    if (state === "customize") {
      if (button.dataset.dir === "left") changeCustomize(-1);
      if (button.dataset.dir === "right") changeCustomize(1);
      if (button.dataset.dir === "up") customizeIndex = 0;
      if (button.dataset.dir === "down") customizeIndex = 1;
      return;
    }

    setDirection(button.dataset.dir);
  });
});

okBtn.addEventListener("click", handleOk);

leftSoft.addEventListener("click", () => {
  if (state === "playing") togglePause();
  else if (state === "customize") customizeIndex = 0;
  else showMenu();
});

rightSoft.addEventListener("click", () => {
  if (state === "playing" || state === "paused" || state === "gameover") showMenu();
  else if (state === "highscore" || state === "achievements" || state === "leaderboard" || state === "secret") showMenu();
});

document.querySelectorAll(".menu-item").forEach((item, index) => {
  item.addEventListener("click", () => {
    menuIndex = index;
    selectMenu();
  });
});

let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", event => {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}, { passive: true });

canvas.addEventListener("touchend", event => {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;

  if (state === "customize") {
    if (Math.abs(dx) > Math.abs(dy)) changeCustomize(dx > 0 ? 1 : -1);
    else customizeIndex = dy > 0 ? 1 : 0;
    return;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection(dx > 0 ? "right" : "left");
  } else {
    setDirection(dy > 0 ? "down" : "up");
  }
}, { passive: true });

playerName.addEventListener("input", () => {
  playerName.value = playerName.value.toUpperCase().replace(/[^A-Z0-9 _]/g, "").slice(0, 10);
});

let bootTimer = setTimeout(() => {
  boot.classList.add("hidden");
  showMenu();
}, 1700);

boot.addEventListener("click", () => {
  clearTimeout(bootTimer);
  boot.classList.add("hidden");
  showMenu();
});

