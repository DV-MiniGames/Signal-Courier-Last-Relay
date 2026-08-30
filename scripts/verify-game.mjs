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

async function move(key, milliseconds) {
  await page.keyboard.down(key);
  await advance(milliseconds);
  await page.keyboard.up(key);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({ path: fileURLToPath(new URL("menu.png", artifactDirectory)) });
  const menu = await readState();
  assert(menu.mode === "menu", `Expected menu, received ${menu.mode}`);

  await page.keyboard.press("Enter");
  await advance(16);
  const started = await readState();
  assert(started.mode === "playing", `Expected playing, received ${started.mode}`);

  await page.keyboard.press("KeyF");
  await page.waitForTimeout(50);
  const enteredFullscreen = await page.evaluate(() => document.fullscreenElement !== null);
  assert(enteredFullscreen, "F input did not enter fullscreen.");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(50);
  const exitedFullscreen = await page.evaluate(() => document.fullscreenElement === null);
  assert(exitedFullscreen, "Escape did not exit fullscreen.");

  await move("ArrowLeft", 700);
  const moved = await readState();
  assert(moved.player.x < started.player.x, "Left input did not move the player left.");

  await page.keyboard.press("KeyP");
  const paused = await readState();
  await advance(1000);
  const pausedAfterTime = await readState();
  assert(paused.mode === "paused", `Expected paused, received ${paused.mode}`);
  assert(pausedAfterTime.timeRemainingSeconds === paused.timeRemainingSeconds, "Timer changed while paused.");

  await page.keyboard.press("KeyR");
  const restarted = await readState();
  assert(restarted.mode === "playing", `Restart did not enter playing mode: ${restarted.mode}`);
  assert(restarted.player.x === 480 && restarted.player.y === 270, "Restart did not reset the player.");

  await move("ArrowUp", 700);
  await move("ArrowLeft", 1430);
  await move("ArrowDown", 1180);
  await move("ArrowRight", 2520);
  await move("ArrowUp", 920);
  await move("ArrowRight", 320);
  const won = await readState();
  await page.screenshot({ path: fileURLToPath(new URL("won.png", artifactDirectory)) });
  assert(won.mode === "won", `Expected won, received ${won.mode} with score ${won.score}`);
  assert(won.score === won.targetScore, `Win score mismatch: ${won.score}/${won.targetScore}`);
  assert(won.remainingBeacons.length === 0, "Collected beacons remain in text state.");

  await page.keyboard.press("KeyR");
  await advance(46_000);
  const lost = await readState();
  await page.screenshot({ path: fileURLToPath(new URL("lost.png", artifactDirectory)) });
  assert(lost.mode === "lost", `Expected lost, received ${lost.mode}`);
  assert(lost.timeRemainingSeconds === 0, "Loss did not exhaust the timer.");
  assert(errors.length === 0, `Browser errors:\n${errors.join("\n")}`);

  console.log(JSON.stringify({ menu, started, enteredFullscreen, exitedFullscreen, moved, paused, restarted, won, lost }, null, 2));
} finally {
  await browser.close();
}
