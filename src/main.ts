import "./style.css";
import { CanvasRenderer } from "./game/adapters/browser/canvas-renderer";
import { DomInput } from "./game/adapters/browser/dom-input";
import { ProceduralAudio } from "./game/adapters/browser/procedural-audio";
import { renderTextState } from "./game/debug/text-state";
import { GameRuntime } from "./game/runtime";

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (milliseconds: number) => void;
    capture_gameplay_media_stream: () => MediaStream;
  }
}

function requireCanvas(selector: string): HTMLCanvasElement {
  const element = document.querySelector<HTMLCanvasElement>(selector);
  if (!element) throw new Error(`Game canvas was not found: ${selector}`);
  return element;
}

function readSeed(): number {
  const rawSeed = new URLSearchParams(window.location.search).get("seed");
  if (!rawSeed) return 0x51c0ffee;
  const parsed = Number(rawSeed);
  return Number.isFinite(parsed) ? parsed >>> 0 : 0x51c0ffee;
}

const canvas = requireCanvas("#game");
const input = new DomInput(canvas);
const renderer = new CanvasRenderer(canvas);
const audio = new ProceduralAudio();
const runtime = new GameRuntime(readSeed(), input, (effects) => audio.playEffects(effects));

let previousFrameTime = performance.now();

function render(): void {
  renderer.render(runtime.getState());
}

function animationFrame(now: number): void {
  const elapsed = Math.min(250, Math.max(0, now - previousFrameTime));
  previousFrameTime = now;
  const result = runtime.advanceRealTime(elapsed);
  if (result.droppedMilliseconds > 0) {
    console.warn(`Simulation dropped ${result.droppedMilliseconds.toFixed(1)}ms after the five-tick frame budget.`);
  }
  render();
  requestAnimationFrame(animationFrame);
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.code === "KeyF") toggleFullscreen();
  if (event.code === "Escape" && document.fullscreenElement) void document.exitFullscreen();
});
document.addEventListener("fullscreenchange", () => {
  runtime.resetClock();
  previousFrameTime = performance.now();
  render();
});
document.addEventListener("visibilitychange", () => {
  runtime.resetClock();
  previousFrameTime = performance.now();
});

window.render_game_to_text = () => renderTextState(runtime.getState());
window.advanceTime = (milliseconds: number): void => {
  runtime.advanceAutomation(milliseconds);
  render();
};
window.capture_gameplay_media_stream = (): MediaStream => {
  const stream = canvas.captureStream(60);
  for (const track of audio.getCaptureStream().getAudioTracks()) stream.addTrack(track);
  return stream;
};

render();
requestAnimationFrame(animationFrame);
