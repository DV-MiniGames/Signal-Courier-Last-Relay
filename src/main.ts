import "./style.css";

type Mode = "menu" | "playing" | "paused" | "won" | "lost";

interface Vec2 {
  x: number;
  y: number;
}

interface Beacon extends Vec2 {
  id: number;
  collected: boolean;
}

interface GameState {
  mode: Mode;
  player: Vec2;
  beacons: Beacon[];
  elapsedSeconds: number;
  score: number;
}

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
  }
}

function requireCanvas(selector: string): HTMLCanvasElement {
  const element = document.querySelector<HTMLCanvasElement>(selector);
  if (!element) throw new Error(`Game canvas was not found: ${selector}`);
  return element;
}

function requireContext(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const value = element.getContext("2d");
  if (!value) throw new Error("2D canvas is unavailable.");
  return value;
}

const canvas = requireCanvas("#game");
const context = requireContext(canvas);

const WIDTH = 960;
const HEIGHT = 540;
const PLAYER_RADIUS = 16;
const PLAYER_SPEED = 225;
const BEACON_RADIUS = 18;
const TIME_LIMIT_SECONDS = 45;
const FIXED_STEP_SECONDS = 1 / 60;
const keys = new Set<string>();
const beaconLayout: Vec2[] = [
  { x: 148, y: 138 },
  { x: 470, y: 112 },
  { x: 796, y: 170 },
  { x: 242, y: 404 },
  { x: 720, y: 398 },
];

let state = createInitialState("menu");
let lastFrame = performance.now();
let automationMode = false;

function createInitialState(mode: Mode): GameState {
  return {
    mode,
    player: { x: WIDTH / 2, y: HEIGHT / 2 },
    beacons: beaconLayout.map((position, index) => ({
      id: index + 1,
      ...position,
      collected: false,
    })),
    elapsedSeconds: 0,
    score: 0,
  };
}

function startGame(): void {
  state = createInitialState("playing");
}

function update(deltaSeconds: number): void {
  if (state.mode !== "playing") return;

  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const up = keys.has("arrowup") || keys.has("w");
  const down = keys.has("arrowdown") || keys.has("s");
  let horizontal = Number(right) - Number(left);
  let vertical = Number(down) - Number(up);
  const magnitude = Math.hypot(horizontal, vertical);

  if (magnitude > 0) {
    horizontal /= magnitude;
    vertical /= magnitude;
    state.player.x += horizontal * PLAYER_SPEED * deltaSeconds;
    state.player.y += vertical * PLAYER_SPEED * deltaSeconds;
  }

  state.player.x = clamp(state.player.x, 54 + PLAYER_RADIUS, WIDTH - 54 - PLAYER_RADIUS);
  state.player.y = clamp(state.player.y, 82 + PLAYER_RADIUS, HEIGHT - 54 - PLAYER_RADIUS);

  for (const beacon of state.beacons) {
    if (beacon.collected) continue;
    if (Math.hypot(state.player.x - beacon.x, state.player.y - beacon.y) <= PLAYER_RADIUS + BEACON_RADIUS) {
      beacon.collected = true;
      state.score += 1;
    }
  }

  if (state.score === state.beacons.length) {
    state.mode = "won";
    return;
  }

  state.elapsedSeconds = Math.min(TIME_LIMIT_SECONDS, state.elapsedSeconds + deltaSeconds);
  if (state.elapsedSeconds >= TIME_LIMIT_SECONDS) state.mode = "lost";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function render(): void {
  drawBackdrop();
  drawArena();
  drawBeacons();
  if (state.mode === "playing" || state.mode === "paused") drawPlayer();
  drawHud();

  if (state.mode === "menu") drawMenu();
  if (state.mode === "paused") drawOverlay("PAUSED", "P 키로 계속");
  if (state.mode === "won") drawOverlay("ROUTE COMPLETE", "R 키로 다시 시작");
  if (state.mode === "lost") drawOverlay("SIGNAL LOST", "R 키로 재시도");
}

function drawBackdrop(): void {
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#0e2850");
  gradient.addColorStop(0.5, "#102047");
  gradient.addColorStop(1, "#07162f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.strokeStyle = "rgba(83, 178, 255, 0.07)";
  context.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 48) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }
}

function drawArena(): void {
  context.fillStyle = "rgba(7, 19, 42, 0.62)";
  roundRect(54, 82, WIDTH - 108, HEIGHT - 136, 24);
  context.fill();
  context.strokeStyle = "rgba(111, 211, 255, 0.22)";
  context.lineWidth = 2;
  context.stroke();
}

function drawBeacons(): void {
  for (const beacon of state.beacons) {
    if (beacon.collected) continue;
    const pulse = 1 + Math.sin(state.elapsedSeconds * 5 + beacon.id) * 0.08;
    context.save();
    context.translate(beacon.x, beacon.y);
    context.scale(pulse, pulse);
    context.shadowColor = "#69efff";
    context.shadowBlur = 22;
    context.fillStyle = "rgba(85, 229, 255, 0.18)";
    context.beginPath();
    context.arc(0, 0, BEACON_RADIUS + 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#72f0ff";
    context.beginPath();
    context.moveTo(0, -BEACON_RADIUS);
    context.lineTo(BEACON_RADIUS * 0.82, 0);
    context.lineTo(0, BEACON_RADIUS);
    context.lineTo(-BEACON_RADIUS * 0.82, 0);
    context.closePath();
    context.fill();
    context.restore();
  }
}

function drawPlayer(): void {
  context.save();
  context.translate(state.player.x, state.player.y);
  context.shadowColor = "#ffcf66";
  context.shadowBlur = 20;
  context.fillStyle = "#ffd36a";
  context.beginPath();
  context.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#17213b";
  context.beginPath();
  context.arc(4, -4, 5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawHud(): void {
  context.fillStyle = "#eaf6ff";
  context.font = "700 18px Inter, system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText("SIGNAL COURIER", 54, 45);

  context.fillStyle = "#8da9c8";
  context.font = "600 14px Inter, system-ui, sans-serif";
  context.fillText(`NODES ${state.score}/${state.beacons.length}`, 54, 67);
  context.textAlign = "right";
  const remaining = Math.max(0, TIME_LIMIT_SECONDS - state.elapsedSeconds);
  context.fillStyle = remaining <= 10 ? "#ff8d8d" : "#8da9c8";
  context.fillText(`TIME ${remaining.toFixed(1)}`, WIDTH - 54, 58);
}

function drawMenu(): void {
  context.fillStyle = "rgba(4, 11, 26, 0.94)";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.textAlign = "center";
  context.fillStyle = "#7af2ff";
  context.font = "800 52px Inter, system-ui, sans-serif";
  context.fillText("SIGNAL COURIER", WIDTH / 2, 190);
  context.fillStyle = "#eaf6ff";
  context.font = "600 20px Inter, system-ui, sans-serif";
  context.fillText("45초 안에 모든 신호 노드를 회수하세요", WIDTH / 2, 235);
  context.fillStyle = "#9bb5d0";
  context.font = "500 16px Inter, system-ui, sans-serif";
  context.fillText("WASD / 방향키 이동   ·   P 일시정지   ·   F 전체 화면", WIDTH / 2, 285);
  context.fillStyle = "#ffd36a";
  context.font = "800 18px Inter, system-ui, sans-serif";
  context.fillText("ENTER TO DEPLOY", WIDTH / 2, 346);
}

function drawOverlay(title: string, subtitle: string): void {
  context.fillStyle = "rgba(4, 11, 26, 0.92)";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.textAlign = "center";
  context.fillStyle = state.mode === "lost" ? "#ff9898" : "#7af2ff";
  context.font = "800 46px Inter, system-ui, sans-serif";
  context.fillText(title, WIDTH / 2, HEIGHT / 2 - 10);
  context.fillStyle = "#d9e9f7";
  context.font = "600 17px Inter, system-ui, sans-serif";
  context.fillText(subtitle, WIDTH / 2, HEIGHT / 2 + 35);
}

function roundRect(x: number, y: number, width: number, height: number, radius: number): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen();
  }
}

function handleKeyDown(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
  keys.add(key);

  if (event.repeat) return;
  if (key === "enter" && state.mode === "menu") startGame();
  if (key === "r") startGame();
  if (key === "p" && state.mode === "playing") state.mode = "paused";
  else if (key === "p" && state.mode === "paused") state.mode = "playing";
  if (key === "f") toggleFullscreen();
  if (key === "escape" && document.fullscreenElement) void document.exitFullscreen();
}

function renderGameToText(): string {
  const payload = {
    coordinateSystem: "origin=(0,0) top-left; +x right; +y down; canvas=960x540",
    mode: state.mode,
    player: {
      x: Number(state.player.x.toFixed(1)),
      y: Number(state.player.y.toFixed(1)),
      radius: PLAYER_RADIUS,
    },
    remainingBeacons: state.beacons
      .filter((beacon) => !beacon.collected)
      .map(({ id, x, y }) => ({ id, x, y, radius: BEACON_RADIUS })),
    score: state.score,
    targetScore: state.beacons.length,
    timeRemainingSeconds: Number(Math.max(0, TIME_LIMIT_SECONDS - state.elapsedSeconds).toFixed(1)),
    controls: "WASD/arrows move, P pause, R restart, F fullscreen",
  };
  return JSON.stringify(payload);
}

function frame(now: number): void {
  const deltaSeconds = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  if (!automationMode) update(deltaSeconds);
  render();
  requestAnimationFrame(frame);
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (milliseconds: number): void => {
  automationMode = true;
  const steps = Math.max(1, Math.round(milliseconds / (FIXED_STEP_SECONDS * 1000)));
  for (let step = 0; step < steps; step += 1) update(FIXED_STEP_SECONDS);
  render();
};

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  if (state.mode === "playing") state.mode = "paused";
});

render();
requestAnimationFrame(frame);
