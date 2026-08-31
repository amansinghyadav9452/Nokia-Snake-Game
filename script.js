const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const boot = document.getElementById("boot");
const menu = document.getElementById("menu");
const gameView = document.getElementById("gameView");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const menuBest = document.getElementById("menuBest");
const difficultyValue = document.getElementById("difficultyValue");
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

let difficulty = Number(localStorage.getItem("bytesnake-difficulty")) || 1;
let best = Number(localStorage.getItem("bytesnake-best")) || 0;
let menuIndex = 0;
let snake = [];
let food = null;
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let timer = null;
let state = "boot";
let paused = false;
let audioContext = null;

const menuItems = ["play", "difficulty", "highscore"];

bestEl.textContent = best;
menuBest.textContent = best;
difficultyValue.textContent = difficulties[difficulty].name;

function beep(type) {
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    const sounds = {
      move: [520, .025, "square"],
      eat: [880, .07, "square"],
      select: [660, .055, "square"],
      error: [180, .12, "sawtooth"],
      gameover: [120, .18, "square"]
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

function showMenu() {
  clearInterval(timer);
  state = "menu";
  paused = false;
  gameView.classList.add("hidden");
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
    beep("select");
    return;
  }

  if (item === "highscore") {
    beep("select");
    overlayTitle.textContent = "HIGH SCORE";
    overlayText.textContent = `${best} POINTS`;
    overlay.classList.remove("hidden");
    gameView.classList.remove("hidden");
    menu.classList.add("hidden");
    state = "highscore";
  }
}

function newSnake() {
  snake = [
    { x: 7, y: 10 },
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 }
  ];

  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  scoreEl.textContent = score;
  placeFood();
}

function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * cells),
      y: Math.floor(Math.random() * cells)
    };
  } while (snake.some(part => part.x === food.x && part.y === food.y));
}

function startGame() {
  clearInterval(timer);
  newSnake();
  state = "playing";
  paused = false;
  menu.classList.add("hidden");
  gameView.classList.remove("hidden");
  overlay.classList.add("hidden");
  leftSoft.textContent = "PAUSE";
  rightSoft.textContent = "MENU";
  updateSpeed();
  draw();
  beep("select");
}

function updateSpeed() {
  clearInterval(timer);
  const base = difficulties[difficulty].speed;
  const speed = Math.max(48, base - score * 2);
  timer = setInterval(move, speed);
}

function move() {
  if (state !== "playing" || paused) return;

  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

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
    endGame();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;

    if (score > best) {
      best = score;
      bestEl.textContent = best;
      menuBest.textContent = best;
      localStorage.setItem("bytesnake-best", best);
    }

    placeFood();
    updateSpeed();
    beep("eat");
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  clearInterval(timer);
  state = "gameover";
  paused = false;
  overlayTitle.textContent = "GAME OVER";
  overlayText.textContent = "OK TO RETRY";
  overlay.classList.remove("hidden");
  beep("gameover");
  draw();
}

function togglePause() {
  if (state !== "playing") return;

  paused = !paused;

  if (paused) {
    overlayTitle.textContent = "PAUSED";
    overlayText.textContent = "OK TO CONTINUE";
    overlay.classList.remove("hidden");
    beep("select");
  } else {
    overlay.classList.add("hidden");
    beep("select");
  }
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
  ctx.fillStyle = "#a9bd78";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(38, 54, 31, .075)";
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

  if (food) drawFood();

  snake.forEach((part, index) => {
    const x = part.x * gridSize;
    const y = part.y * gridSize;

    ctx.fillStyle = index === 0 ? "#26361f" : "#405a31";
    ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);

    if (index === 0) {
      ctx.fillStyle = "#a9bd78";

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

  ctx.fillStyle = "#26361f";
  ctx.fillRect(x + 6, y + 5, 8, 10);
  ctx.fillRect(x + 4, y + 7, 12, 6);
  ctx.fillRect(x + 10, y + 3, 4, 3);
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

  if (state === "highscore") {
    showMenu();
  }
}

function moveMenu(step) {
  if (state !== "menu") return;
  menuIndex = (menuIndex + step + menuItems.length) % menuItems.length;
  updateMenu();
  beep("move");
}

document.addEventListener("keydown", event => {
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
    if (state === "playing" || state === "paused") showMenu();
    else if (state === "highscore") showMenu();
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

    setDirection(button.dataset.dir);
  });
});

okBtn.addEventListener("click", handleOk);

leftSoft.addEventListener("click", () => {
  if (state === "playing") togglePause();
  else showMenu();
});

rightSoft.addEventListener("click", () => {
  if (state === "playing" || state === "paused" || state === "gameover") showMenu();
  else if (state === "highscore") showMenu();
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

  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection(dx > 0 ? "right" : "left");
  } else {
    setDirection(dy > 0 ? "down" : "up");
  }
}, { passive: true });

setTimeout(() => {
  boot.classList.add("hidden");
  showMenu();
  beep("select");
}, 1700);
