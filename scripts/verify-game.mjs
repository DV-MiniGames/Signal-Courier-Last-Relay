import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const baseUrl = process.env.GAME_URL ?? "http://127.0.0.1:4173";
const artifactDirectory = new URL("../artifacts/game-verification/", import.meta.url);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await mkdir(artifactDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`page: ${String(error)}`));

async function readState() {
  const value = await page.evaluate(() => window.render_game_to_text());
  return JSON.parse(value);
}

async function advance(milliseconds) {
  await page.evaluate((duration) => window.advanceTime(duration), milliseconds);
}

async function screenshot(name) {
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, artifactDirectory)) });
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

async function moveToward(targetX, targetY, tolerance = 9) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const state = await readState();
    const deltaX = targetX - state.player.x;
    const deltaY = targetY - state.player.y;
    if (Math.abs(deltaX) <= tolerance && Math.abs(deltaY) <= tolerance) return state;
    const codes = [];
    if (deltaX > tolerance) codes.push("KeyD");
    else if (deltaX < -tolerance) codes.push("KeyA");
    if (deltaY > tolerance) codes.push("KeyS");
    else if (deltaY < -tolerance) codes.push("KeyW");
    await hold(codes, 67);
  }
  const state = await readState();
  throw new Error(`Could not reach (${targetX}, ${targetY}); stopped at (${state.player.x}, ${state.player.y}).`);
}

async function fireAtRole(role, maximumBursts = 20) {
  for (let burst = 0; burst < maximumBursts; burst += 1) {
    const state = await readState();
    const enemy = state.enemies.find((candidate) => candidate.role === role);
    if (!enemy) return;
    await aim(enemy.x, enemy.y);
    await page.mouse.down({ button: "left" });
    await advance(117);
    await page.mouse.up({ button: "left" });
  }
  const state = await readState();
  assert(!state.enemies.some((enemy) => enemy.role === role), `${role} survived the full firing sequence.`);
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
  assert(state.mode === "playing", `Restart did not enter playing mode: ${state.mode}`);
  return state;
}

async function captureMenuResolutions() {
  for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await screenshot(`menu-${width}x${height}`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
}

async function verifyInputAndClock() {
  const menu = await readState();
  const hashBeforeZero = menu.canonicalHash;
  await advance(0);
  const afterZero = await readState();
  assert(afterZero.tick === menu.tick, "advanceTime(0) advanced a simulation tick.");
  assert(afterZero.canonicalHash === hashBeforeZero, "advanceTime(0) changed canonical state.");

  await page.keyboard.press("Enter");
  await advance(17);
  const started = await readState();
  assert(started.mode === "playing", `Expected playing, received ${started.mode}`);

  await page.keyboard.press("KeyF");
  await page.waitForTimeout(60);
  assert(await page.evaluate(() => document.fullscreenElement !== null), "F input did not enter fullscreen.");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(60);
  assert(await page.evaluate(() => document.fullscreenElement === null), "Escape did not exit fullscreen.");

  const beforeMove = await readState();
  await hold(["KeyD"], 250);
  const moved = await readState();
  assert(moved.player.x > beforeMove.player.x, "Keyboard movement did not move the courier right.");

  await page.keyboard.down("KeyD");
  await page.keyboard.press("Space");
  await advance(100);
  await page.keyboard.up("KeyD");
  const dashed = await readState();
  assert(dashed.player.dash.cooldownSeconds > 0, "Space did not activate dash cooldown.");

  await useEmp();
  const emp = await readState();
  assert(!emp.player.emp.ready, "Right mouse did not activate EMP.");

  await press("KeyP");
  const paused = await readState();
  const pausedTick = paused.tick;
  assert(paused.mode === "paused", `Expected paused, received ${paused.mode}`);
  await advance(1000);
  assert((await readState()).tick === pausedTick, "Simulation tick advanced while paused.");
  await press("KeyP");
  assert((await readState()).mode === "playing", "Pause did not resume.");

  return { menu, started, moved, dashed, emp, paused };
}

async function verifyMissionFlow() {
  await restart();
  await fireAtRole("chaser");

  await moveToward(416, 300);
  await hold(["KeyE"], 1050);
  let state = await readState();
  assert(state.relay.installed, "Holding E at the socket did not install the relay.");
  assert(state.relay.linkState === "normal", `New relay link was ${state.relay.linkState}.`);
  await screenshot("relay-online");

  await page.keyboard.down("KeyD");
  await page.keyboard.press("Space");
  await advance(117);
  await page.keyboard.up("KeyD");
  assert((await readState()).player.dash.cooldownSeconds > 0, "Dash was not visible during the mission flow.");

  await moveToward(802, 224, 12);
  state = await readState();
  assert(state.packet.status === "carried", `Packet was not collected: ${state.packet.status}`);
  await screenshot("packet-carried-combat");

  await fireAtRole("shooter");
  await moveToward(416, 300);
  state = await readState();
  if (state.relay.linkState === "jammed") await useEmp();
  if (state.relay.linkState === "disconnected") await hold(["KeyE"], 2050);
  await hold(["KeyE"], 3050);
  state = await readState();
  await screenshot("upload-complete");
  assert(state.mode === "won", `Upload did not complete the M1 mission: ${state.mode}.`);
  assert(state.mission.uploadedPackets === 1, "Uploaded packet count did not reach one.");
  assert(state.mission.timeRemainingSeconds > 0, "The mission exceeded its two-minute limit.");
  return state;
}

async function verifyLinkLifecycle() {
  await restart();
  await fireAtRole("chaser");
  await moveToward(416, 300);
  await hold(["KeyE"], 1050);
  await moveToward(128, 300);

  let jammedCaptured = false;
  let state = await readState();
  for (let elapsed = 0; elapsed < 45_000 && state.relay.linkState !== "disconnected"; elapsed += 250) {
    await advance(250);
    state = await readState();
    if (!jammedCaptured && state.relay.linkState === "jammed") {
      await screenshot("relay-jammed");
      jammedCaptured = true;
    }
  }
  assert(jammedCaptured, "A real shooter hit never produced the jammed link state.");
  assert(state.relay.linkState === "disconnected", `Relay did not become disconnected: ${state.relay.linkState}`);
  await screenshot("relay-disconnected");

  await fireAtRole("shooter");
  await moveToward(416, 300);
  await hold(["KeyE"], 2050);
  state = await readState();
  assert(
    state.relay.linkState === "normal",
    `Holding E did not repair the disconnected relay: ${JSON.stringify({ mode: state.mode, player: state.player, relay: state.relay })}`,
  );
  await screenshot("relay-repaired");
  return state;
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await captureMenuResolutions();
  const controls = await verifyInputAndClock();
  const won = await verifyMissionFlow();
  const repaired = await verifyLinkLifecycle();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await screenshot("reduced-motion-gameplay");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert(errors.length === 0, `Browser errors:\n${errors.join("\n")}`);

  console.log(JSON.stringify({
    verified: [
      "0ms deterministic clock",
      "fullscreen enter/exit",
      "move/dash/EMP/pause",
      "relay install",
      "packet pickup",
      "aimed shooting against chaser and shooter",
      "packet upload within two minutes",
      "normal/jammed/disconnected/repaired link lifecycle",
      "reduced motion",
      "960x540, 1280x720, 1920x1080 screenshots",
      "no console or page errors",
    ],
    hashes: { menu: controls.menu.canonicalHash, won: won.canonicalHash, repaired: repaired.canonicalHash },
    won,
    repaired,
  }, null, 2));
} finally {
  await browser.close();
}
