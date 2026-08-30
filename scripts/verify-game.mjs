import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.GAME_URL ?? "http://127.0.0.1:4173";
const recordingFile = process.env.GAMEPLAY_CAPTURE_FILE ? resolve(process.env.GAMEPLAY_CAPTURE_FILE) : null;
const artifactDirectory = new URL("../artifacts/game-verification/", import.meta.url);
const arena = { left: 42, top: 92, right: 918, bottom: 506 };
const playerRadius = 20;
const gridSize = 12;
const recordingFrameMilliseconds = 1000 / 60;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await mkdir(artifactDirectory, { recursive: true });
if (recordingFile) await mkdir(dirname(recordingFile), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
let captureStarted = false;

page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`page: ${String(error)}`));

async function readState() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

async function advance(milliseconds) {
  if (!recordingFile || milliseconds === 0) {
    await page.evaluate((duration) => window.advanceTime(duration), milliseconds);
    return;
  }
  let remaining = milliseconds;
  while (remaining > 0.01) {
    const frameStartedAt = performance.now();
    const duration = Math.min(recordingFrameMilliseconds, remaining);
    await page.evaluate((step) => window.advanceTime(step), duration);
    const frameWorkMilliseconds = performance.now() - frameStartedAt;
    await page.waitForTimeout(Math.max(0, recordingFrameMilliseconds - frameWorkMilliseconds));
    remaining = Math.max(0, remaining - duration);
  }
}

async function screenshot(name) {
  if (!recordingFile) {
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, artifactDirectory)) });
    return;
  }

  // Playwright screenshots temporarily stall canvas.captureStream() while
  // WebAudio continues in real time, which makes transition sounds lead the
  // recorded picture. Recording runs keep the same showcase pauses without
  // taking verification screenshots; the normal verification run still
  // refreshes every screenshot artifact.
  const pause = name === "run-complete" ? 1800
    : name.includes("cleared") ? 650
      : name.startsWith("menu-") ? 500
        : name.includes("start") ? 200
          : 0;
  if (pause > 0) await page.waitForTimeout(pause);
}

async function startGameplayCapture() {
  if (!recordingFile) return;
  await page.evaluate(() => {
    const stream = window.capture_gameplay_media_stream();
    const preferred = "video/webm;codecs=vp9,opus";
    const mimeType = MediaRecorder.isTypeSupported(preferred) ? preferred : "video/webm;codecs=vp8,opus";
    const chunks = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
      audioBitsPerSecond: 160_000,
    });
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    window.__gameplayCapture = { recorder, chunks, mimeType };
    recorder.start(250);
  });
  captureStarted = true;
}

async function stopGameplayCapture() {
  if (!recordingFile || !captureStarted) return;
  const downloadPromise = page.waitForEvent("download");
  await page.evaluate(() => new Promise((resolveCapture, rejectCapture) => {
    const capture = window.__gameplayCapture;
    if (!capture) {
      rejectCapture(new Error("Gameplay capture was not started."));
      return;
    }
    capture.recorder.addEventListener("error", () => rejectCapture(capture.recorder.error), { once: true });
    capture.recorder.addEventListener("stop", () => {
      const blob = new Blob(capture.chunks, { type: capture.mimeType });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "signal-courier-gameplay.webm";
      link.click();
      resolveCapture();
    }, { once: true });
    capture.recorder.stop();
  }));
  const download = await downloadPromise;
  await download.saveAs(recordingFile);
  captureStarted = false;
}

async function press(code) {
  await page.keyboard.press(code);
  await advance(17);
}

async function hold(codes, milliseconds) {
  for (const code of codes) await page.keyboard.down(code);
  await advance(milliseconds);
  for (const code of [...codes].reverse()) await page.keyboard.up(code);
}

async function aim(logicalX, logicalY) {
  const bounds = await page.locator("#game").boundingBox();
  assert(bounds, "Canvas bounds were unavailable.");
  await page.mouse.move(
    bounds.x + logicalX / 960 * bounds.width,
    bounds.y + logicalY / 540 * bounds.height,
  );
}

function pointBlocked(point, obstacles, margin = playerRadius) {
  return obstacles.some((block) => (
    point.x > block.x - margin
    && point.x < block.x + block.width + margin
    && point.y > block.y - margin
    && point.y < block.y + block.height + margin
  ));
}

function nearestOpenNode(point, obstacles) {
  let best = null;
  for (let y = arena.top + playerRadius; y <= arena.bottom - playerRadius; y += gridSize) {
    for (let x = arena.left + playerRadius; x <= arena.right - playerRadius; x += gridSize) {
      const node = { x, y };
      if (pointBlocked(node, obstacles)) continue;
      if (!lineClear(point, node, obstacles, 15)) continue;
      const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
      if (!best || distance < best.distance) best = { ...node, distance };
    }
  }
  assert(best, `No open navigation node near (${point.x}, ${point.y}).`);
  return best;
}

function nodeKey(node) {
  return `${node.x},${node.y}`;
}

function findPath(start, target, obstacles) {
  const startNode = nearestOpenNode(start, obstacles);
  const targetNode = nearestOpenNode(target, obstacles);
  const queue = [startNode];
  const previous = new Map([[nodeKey(startNode), null]]);
  const nodes = new Map([[nodeKey(startNode), startNode]]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (nodeKey(current) === nodeKey(targetNode)) break;
    for (const [dx, dy] of [[gridSize, 0], [-gridSize, 0], [0, gridSize], [0, -gridSize]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (
        next.x < arena.left + playerRadius
        || next.x > arena.right - playerRadius
        || next.y < arena.top + playerRadius
        || next.y > arena.bottom - playerRadius
        || pointBlocked(next, obstacles)
      ) continue;
      const key = nodeKey(next);
      if (previous.has(key)) continue;
      previous.set(key, nodeKey(current));
      nodes.set(key, next);
      queue.push(next);
    }
  }

  const targetKey = nodeKey(targetNode);
  if (!previous.has(targetKey)) return null;
  const path = [];
  for (let key = targetKey; key !== null; key = previous.get(key)) path.push(nodes.get(key));
  return path.reverse().slice(1);
}

async function moveDirect(targetX, targetY, tolerance = 7) {
  let previousDistance = Number.POSITIVE_INFINITY;
  let stalledTicks = 0;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const state = await readState();
    assert(state.mode === "playing", `Navigation stopped because mode became ${state.mode}.`);
    const deltaX = targetX - state.player.x;
    const deltaY = targetY - state.player.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance <= tolerance) return state;
    const code = Math.abs(deltaX) >= Math.abs(deltaY)
      ? (deltaX > 0 ? "KeyD" : "KeyA")
      : (deltaY > 0 ? "KeyS" : "KeyW");
    await hold([code], Math.min(100, Math.max(17, distance / 190 * 1000)));
    stalledTicks = distance >= previousDistance - 0.5 ? stalledTicks + 1 : 0;
    previousDistance = distance;
    if (stalledTicks >= 3) break;
  }
  const state = await readState();
  throw new Error(`Could not reach (${targetX}, ${targetY}); stopped at (${state.player.x}, ${state.player.y}).`);
}

async function navigateTo(targetX, targetY, tolerance = 10) {
  const state = await readState();
  const path = findPath(state.player, { x: targetX, y: targetY }, state.obstacles);
  assert(path, `No path in sector ${state.run.level} to (${targetX}, ${targetY}).`);
  for (const waypoint of path) await moveDirect(waypoint.x, waypoint.y, 3);
  return moveDirect(targetX, targetY, tolerance);
}

function lineClear(start, end, obstacles, margin = 5) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const steps = Math.ceil(distance / 12);
  for (let step = 1; step < steps; step += 1) {
    const progress = step / steps;
    const point = { x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress };
    if (pointBlocked(point, obstacles, margin)) return false;
  }
  return true;
}

function chooseCombatPosition(state, enemy) {
  const candidates = [90, 140, 200].flatMap((distance) => (
    Array.from({ length: 8 }, (_, index) => {
      const angle = index * Math.PI / 4;
      return { x: enemy.x + Math.cos(angle) * distance, y: enemy.y + Math.sin(angle) * distance };
    })
  )).map((point) => ({
    x: Math.max(arena.left + playerRadius, Math.min(arena.right - playerRadius, point.x)),
    y: Math.max(arena.top + playerRadius, Math.min(arena.bottom - playerRadius, point.y)),
  }));
  return candidates
    .filter((point) => (
      !pointBlocked(point, state.obstacles)
      && lineClear(point, enemy, state.obstacles)
      && findPath(state.player, point, state.obstacles)
    ))
    .sort((a, b) => (
      (a.x - state.player.x) ** 2 + (a.y - state.player.y) ** 2
      - (b.x - state.player.x) ** 2 - (b.y - state.player.y) ** 2
    ))[0];
}

async function defeatEnemy(enemyId) {
  for (let burst = 0; burst < 10; burst += 1) {
    let state = await readState();
    const enemy = state.enemies.find((candidate) => candidate.id === enemyId);
    if (!enemy) return state;
    const combatPosition = chooseCombatPosition(state, enemy);
    assert(combatPosition, `No reachable firing position: ${JSON.stringify({ sector: state.run.level, player: state.player, enemy })}`);
    if (combatPosition && Math.hypot(combatPosition.x - state.player.x, combatPosition.y - state.player.y) > 28) {
      await navigateTo(combatPosition.x, combatPosition.y, 14);
      state = await readState();
    }
    const currentEnemy = state.enemies.find((candidate) => candidate.id === enemyId);
    if (!currentEnemy) return state;
    await aim(currentEnemy.x, currentEnemy.y);
    await page.mouse.down({ button: "left" });
    await advance(350);
    await page.mouse.up({ button: "left" });
    await advance(100);
  }
  const state = await readState();
  assert(!state.enemies.some((enemy) => enemy.id === enemyId), `Enemy ${enemyId} survived the firing sequence.`);
  return state;
}

async function defeatUntil(targetKills, captureFx = false) {
  let captured = false;
  while ((await readState()).run.stageKills < targetKills) {
    const state = await readState();
    const enemy = [...state.enemies].sort((a, b) => (a.role === "chaser" ? -1 : 1) - (b.role === "chaser" ? -1 : 1))[0];
    assert(enemy, `No enemies remained before reaching ${targetKills} kills.`);
    await defeatEnemy(enemy.id);
    const after = await readState();
    assert(after.run.stageKills > state.run.stageKills, `Enemy ${enemy.id} did not increase the stage kill count.`);
    if (captureFx && !captured) {
      await screenshot(`sector-${state.run.level}-enemy-destroyed-fx`);
      captured = true;
    }
  }
}

async function useEmp() {
  const state = await readState();
  await aim(state.player.x + 30, state.player.y);
  await page.mouse.down({ button: "right" });
  await page.mouse.up({ button: "right" });
  await advance(17);
}

async function restart() {
  await press("KeyR");
  const state = await readState();
  assert(state.mode === "playing" && state.run.level === 1, `Restart did not reset sector 1: ${state.mode}.`);
  return state;
}

async function captureMenuResolutions() {
  if (recordingFile) {
    await screenshot("menu-1280x720");
    return;
  }
  for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await screenshot(`menu-${width}x${height}`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function verifyInputAndClock() {
  const menu = await readState();
  await advance(0);
  const afterZero = await readState();
  assert(afterZero.tick === menu.tick && afterZero.canonicalHash === menu.canonicalHash, "advanceTime(0) changed state.");
  await press("Enter");
  assert((await readState()).mode === "playing", "Enter did not start the run.");

  await page.keyboard.press("KeyF");
  await page.waitForTimeout(60);
  assert(await page.evaluate(() => document.fullscreenElement !== null), "F did not enter fullscreen.");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(60);
  assert(await page.evaluate(() => document.fullscreenElement === null), "Escape did not exit fullscreen.");

  const beforeMove = await readState();
  await hold(["KeyD"], 250);
  assert((await readState()).player.x > beforeMove.player.x, "Movement input failed.");
  await page.keyboard.down("KeyD");
  await page.keyboard.press("Space");
  await advance(100);
  await page.keyboard.up("KeyD");
  assert((await readState()).player.dash.cooldownSeconds > 0, "Dash input failed.");
  await useEmp();
  assert(!(await readState()).player.emp.ready, "EMP input failed.");
  await press("KeyP");
  const pausedTick = (await readState()).tick;
  await advance(1000);
  assert((await readState()).tick === pausedTick, "Paused simulation advanced.");
  await press("KeyP");
  assert((await readState()).mode === "playing", "Pause did not resume.");
  return menu;
}

async function completeSector(levelNumber) {
  let state = await readState();
  assert(state.run.level === levelNumber, `Expected sector ${levelNumber}, received ${state.run.level}.`);
  await screenshot(`sector-${levelNumber}-start`);
  if (recordingFile && levelNumber === 1) {
    await page.keyboard.down("KeyD");
    await page.keyboard.press("Space");
    await advance(180);
    await page.keyboard.up("KeyD");
    await useEmp();
    await page.waitForTimeout(500);
  }

  const targetKills = state.run.stageKills + state.enemies.length;
  await defeatUntil(targetKills, true);
  state = await readState();
  assert(state.run.stageKills >= state.run.requiredKills, `Sector ${levelNumber} kill gate stayed closed.`);

  await navigateTo(state.relay.x, state.relay.y, 12);
  await hold(["KeyE"], 1050);
  state = await readState();
  assert(state.relay.installed, `Sector ${levelNumber} relay did not install.`);
  await screenshot(`sector-${levelNumber}-relay-online`);

  await navigateTo(state.packet.x, state.packet.y, 14);
  state = await readState();
  assert(state.packet.status === "carried", `Sector ${levelNumber} packet was not collected.`);

  await navigateTo(state.relay.x, state.relay.y, 12);
  state = await readState();
  if (state.relay.linkState === "jammed") await useEmp();
  if ((await readState()).relay.linkState === "disconnected") await hold(["KeyE"], 2050);
  await hold(["KeyE"], 3050);
  state = await readState();
  await screenshot(levelNumber < 3 ? `sector-${levelNumber}-cleared` : "run-complete");
  assert(state.mission.uploadedPackets === 1, `Sector ${levelNumber} upload did not finish.`);
  assert(state.mission.timeRemainingSeconds > 0, `Sector ${levelNumber} exceeded its time limit.`);
  assert(state.mode === (levelNumber < 3 ? "stage-cleared" : "won"), `Unexpected sector result: ${state.mode}.`);
  return state;
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await startGameplayCapture();
  await captureMenuResolutions();
  const menu = recordingFile ? await readState() : await verifyInputAndClock();
  if (recordingFile) await press("Enter");
  else await restart();

  const cleared = [];
  for (let level = 1; level <= 3; level += 1) {
    const result = await completeSector(level);
    cleared.push({ level, score: result.run.score, kills: result.run.totalKills, hash: result.canonicalHash });
    if (level < 3) {
      await press("Enter");
      const next = await readState();
      assert(next.mode === "playing" && next.run.level === level + 1, `Enter did not open sector ${level + 1}.`);
    }
  }

  assert(cleared[1].score > cleared[0].score && cleared[2].score > cleared[1].score, "Score did not carry forward.");
  if (!recordingFile) {
    await restart();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await screenshot("reduced-motion-gameplay");
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  assert(errors.length === 0, `Browser errors:\n${errors.join("\n")}`);
  await stopGameplayCapture();

  console.log(JSON.stringify({
    verified: [
      "deterministic 0ms clock",
      "fullscreen enter/exit",
      "move, dash, EMP, pause/resume, restart",
      "obstacle-aware navigation and cover",
      "enemy destruction and score feedback",
      "relay install, packet pickup, upload",
      "three sequential sector clears with rising kill gates",
      "score and total kills carry between sectors",
      "final win only after sector three",
      "reduced motion",
      "960x540, 1280x720, 1920x1080 layouts",
      "no console or page errors",
    ],
    menuHash: menu.canonicalHash,
    cleared,
    recordingFile,
  }, null, 2));
} finally {
  if (captureStarted) await stopGameplayCapture();
  await context.close();
  await browser.close();
}
