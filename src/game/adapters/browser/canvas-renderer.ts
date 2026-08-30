import { CITY_BLOCKS, HEADQUARTERS, ROAD_MARKS } from "../../content/level";
import { MISSION_TICKS, PLAYER, RELAY, VIEW_HEIGHT, VIEW_WIDTH } from "../../content/balance";
import { distanceSquared, normalize } from "../../core/math";
import type { EnemyState, GameState, LinkState, Vec2 } from "../../core/types";
import { InputGlyphs, type InputGlyphId } from "./input-glyphs";

const COLORS = {
  void: "#050A10",
  city900: "#08131D",
  city800: "#10232E",
  city700: "#193440",
  city500: "#47616D",
  cyan: "#28F2D3",
  orange: "#FF9D3D",
  magenta: "#F04BE2",
  red: "#FF4D6D",
  white: "#F4F8FF",
  gray: "#71838C",
} as const;

function requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas is unavailable.");
  return context;
}

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly inputGlyphs = new InputGlyphs();
  private reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(canvas: HTMLCanvasElement) {
    this.context = requireContext(canvas);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", (event) => {
      this.reducedMotion = event.matches;
    });
  }

  render(state: Readonly<GameState>): void {
    this.drawBackdrop();
    this.drawNetwork(state);
    this.drawWorldObjects(state);
    this.drawProjectiles(state);
    this.drawEnemies(state);
    if (state.mode !== "menu") this.drawPlayer(state);
    this.drawHud(state);

    if (state.mode === "menu") this.drawMenu();
    if (state.mode === "paused") this.drawOverlay("SIGNAL PAUSED", "P  계속   ·   R  새 임무", COLORS.cyan);
    if (state.mode === "won") this.drawResult(state, true);
    if (state.mode === "lost") this.drawResult(state, false);
  }

  private drawBackdrop(): void {
    const context = this.context;
    context.fillStyle = COLORS.void;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    context.fillStyle = COLORS.city900;
    context.fillRect(28, 82, VIEW_WIDTH - 56, VIEW_HEIGHT - 52);

    context.fillStyle = COLORS.city800;
    context.fillRect(42, 220, 876, 168);
    context.fillRect(242, 94, 222, 404);
    context.fillRect(678, 94, 82, 404);

    for (const block of CITY_BLOCKS) {
      context.fillStyle = COLORS.city700;
      context.beginPath();
      context.roundRect(block.x, block.y, block.width, block.height, 10);
      context.fill();
      context.strokeStyle = COLORS.city500;
      context.lineWidth = 2;
      context.stroke();
      context.strokeStyle = "rgba(5,10,16,0.55)";
      context.beginPath();
      context.moveTo(block.x + 18, block.y + 14);
      context.lineTo(block.x + block.width - 22, block.y + block.height - 12);
      context.moveTo(block.x + block.width * 0.55, block.y + 5);
      context.lineTo(block.x + block.width * 0.42, block.y + block.height - 5);
      context.stroke();
    }

    context.fillStyle = "rgba(71,97,109,0.42)";
    for (const mark of ROAD_MARKS) context.fillRect(mark.x, mark.y, mark.width, mark.height);
  }

  private drawNetwork(state: Readonly<GameState>): void {
    if (!state.relay.installed) return;
    this.drawLink(HEADQUARTERS, state.relay, state.relay.linkState, state.tick);
    if (state.relay.linkState === "normal") {
      const context = this.context;
      context.fillStyle = "rgba(40,242,211,0.055)";
      context.beginPath();
      context.arc(state.relay.x, state.relay.y, RELAY.safeRadius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(40,242,211,0.26)";
      context.lineWidth = 2;
      context.setLineDash([4, 8]);
      context.stroke();
      context.setLineDash([]);
    }
  }

  private drawLink(from: Vec2, to: Vec2, linkState: LinkState, tick: number): void {
    const context = this.context;
    const color = linkState === "normal" ? COLORS.cyan : linkState === "jammed" ? COLORS.magenta : COLORS.gray;
    const dash = linkState === "normal" ? [] : linkState === "jammed" ? [8, 6] : [10, 8];
    context.save();
    context.lineCap = "round";
    context.strokeStyle = linkState === "normal" ? "rgba(40,242,211,0.18)" : "rgba(113,131,140,0.16)";
    context.lineWidth = 8;
    context.setLineDash(dash);
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.strokeStyle = color;
    context.lineWidth = 2.5;
    context.lineDashOffset = linkState === "jammed" && !this.reducedMotion ? -(tick / 3) : 0;
    if (linkState === "jammed" && !this.reducedMotion) context.globalAlpha = 0.62 + Math.sin(tick * 0.16) * 0.28;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
    context.restore();
  }

  private drawWorldObjects(state: Readonly<GameState>): void {
    this.drawHeadquarters(state);
    this.drawRelay(state);
    if (state.packet.status !== "uploaded") this.drawPacket(state);
  }

  private drawHeadquarters(state: Readonly<GameState>): void {
    const context = this.context;
    context.save();
    context.translate(HEADQUARTERS.x, HEADQUARTERS.y);
    context.fillStyle = "rgba(255,157,61,0.10)";
    context.strokeStyle = COLORS.orange;
    context.lineWidth = 3;
    context.beginPath();
    context.roundRect(-34, -34, 68, 68, 10);
    context.fill();
    context.stroke();
    for (const radius of [22, 13, 5]) {
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = COLORS.white;
    context.font = "600 14px Oxanium, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("HQ", 0, 56);
    if (state.packet.status === "carried") {
      context.fillStyle = COLORS.white;
      context.font = "600 12px Noto Sans KR, system-ui, sans-serif";
      context.fillText("중계기에 업로드", 0, 75);
    }
    context.restore();
  }

  private drawRelay(state: Readonly<GameState>): void {
    const context = this.context;
    const relay = state.relay;
    context.save();
    context.translate(relay.x, relay.y);

    context.strokeStyle = relay.installed
      ? relay.linkState === "normal" ? COLORS.cyan : relay.linkState === "jammed" ? COLORS.magenta : COLORS.gray
      : COLORS.city500;
    context.fillStyle = relay.installed ? "rgba(8,19,29,0.92)" : "rgba(71,97,109,0.12)";
    context.lineWidth = relay.installed ? 4 : 2;
    this.hexagon(0, 0, relay.installed ? 27 : 24);
    context.fill();
    context.stroke();

    if (relay.installed) {
      context.beginPath();
      context.moveTo(-10, -16);
      context.lineTo(-4, -32);
      context.moveTo(10, -16);
      context.lineTo(4, -32);
      context.stroke();
      context.fillStyle = context.strokeStyle;
      context.beginPath();
      const pulse = this.reducedMotion ? 0 : Math.sin(state.tick * 0.05) * 1.5;
      context.arc(0, 0, 7 + pulse, 0, Math.PI * 2);
      context.fill();
    } else {
      for (const angle of [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6]) {
        context.fillStyle = COLORS.orange;
        context.beginPath();
        context.arc(Math.cos(angle) * 17, Math.sin(angle) * 17, 3, 0, Math.PI * 2);
        context.fill();
      }
    }

    const playerNear = distanceSquared(state.player, relay) <= RELAY.interactionRadius * RELAY.interactionRadius;
    if (playerNear && !relay.installed) {
      this.drawProgressRing(relay.installProgressTicks / RELAY.installTicks, COLORS.orange, 35);
      this.drawWorldLabel("E 길게 눌러 설치", 0, 52, COLORS.white);
    } else if (playerNear && relay.health <= 0) {
      this.drawProgressRing(relay.repairProgressTicks / RELAY.repairTicks, COLORS.orange, 35);
      this.drawWorldLabel("E 길게 눌러 수리", 0, 52, COLORS.white);
    } else if (playerNear && state.packet.status === "carried") {
      this.drawProgressRing(relay.uploadProgressTicks / RELAY.uploadTicks, COLORS.white, 38);
      this.drawWorldLabel(relay.linkState === "normal" ? "E 길게 눌러 업로드" : "링크 복구 대기", 0, 56, COLORS.white);
    }
    context.restore();
  }

  private drawPacket(state: Readonly<GameState>): void {
    const context = this.context;
    const packet = state.packet;
    const pulse = this.reducedMotion ? 0 : Math.sin(state.tick * 0.08) * 2;
    context.save();
    context.translate(packet.x, packet.y);
    context.strokeStyle = COLORS.white;
    context.fillStyle = "rgba(244,248,255,0.2)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, -18 - pulse);
    context.lineTo(15, 0);
    context.lineTo(0, 18 + pulse);
    context.lineTo(-15, 0);
    context.closePath();
    context.fill();
    context.stroke();
    context.beginPath();
    context.moveTo(-8, -2);
    context.lineTo(0, 7);
    context.lineTo(8, -2);
    context.stroke();
    if (packet.status === "ground") this.drawWorldLabel("PACKET", 0, 37, COLORS.white);
    context.restore();
  }

  private drawProjectiles(state: Readonly<GameState>): void {
    const context = this.context;
    for (const projectile of state.projectiles) {
      context.fillStyle = projectile.owner === "player" ? COLORS.orange : COLORS.red;
      context.beginPath();
      context.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = projectile.owner === "player" ? "rgba(255,157,61,0.3)" : "rgba(255,77,109,0.32)";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(projectile.x, projectile.y);
      context.lineTo(projectile.x - projectile.vx * 0.025, projectile.y - projectile.vy * 0.025);
      context.stroke();
    }
  }

  private drawEnemies(state: Readonly<GameState>): void {
    for (const enemy of state.enemies) {
      if (enemy.role === "chaser") this.drawChaser(state, enemy);
      else this.drawShooter(state, enemy);
    }
  }

  private drawChaser(state: Readonly<GameState>, enemy: Readonly<EnemyState>): void {
    const context = this.context;
    const direction = normalize({ x: state.player.x - enemy.x, y: state.player.y - enemy.y }, { x: -1, y: 0 });
    const angle = Math.atan2(direction.y, direction.x);
    context.save();
    context.translate(enemy.x, enemy.y);
    context.rotate(angle);
    context.fillStyle = COLORS.city500;
    context.strokeStyle = COLORS.red;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(24, 0);
    context.lineTo(-14, 17);
    context.lineTo(-7, 0);
    context.lineTo(-14, -17);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = COLORS.red;
    context.beginPath();
    context.arc(4, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    this.drawHealth(enemy);
  }

  private drawShooter(state: Readonly<GameState>, enemy: Readonly<EnemyState>): void {
    const context = this.context;
    if (enemy.telegraphTicks > 0) {
      context.save();
      context.strokeStyle = "rgba(255,77,109,0.58)";
      context.lineWidth = 2;
      context.setLineDash([5, 7]);
      context.beginPath();
      context.moveTo(enemy.x, enemy.y);
      context.lineTo(enemy.targetX, enemy.targetY);
      context.stroke();
      context.restore();
    }

    const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    context.save();
    context.translate(enemy.x, enemy.y);
    context.rotate(angle);
    context.strokeStyle = COLORS.red;
    context.fillStyle = COLORS.city500;
    context.lineWidth = enemy.telegraphTicks > 0 ? 4 : 3;
    context.fillRect(-13, -13, 26, 26);
    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(-18, side * -19);
      context.lineTo(18, side * -19);
      context.lineTo(18, side * -10);
      context.moveTo(-18, side * -19);
      context.lineTo(-18, side * -10);
      context.stroke();
    }
    context.fillStyle = COLORS.red;
    context.beginPath();
    context.arc(0, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    this.drawHealth(enemy);
  }

  private drawHealth(enemy: Readonly<EnemyState>): void {
    const context = this.context;
    const ratio = Math.max(0, enemy.health / enemy.maxHealth);
    context.fillStyle = "rgba(5,10,16,0.86)";
    context.fillRect(enemy.x - 18, enemy.y - enemy.radius - 12, 36, 4);
    context.fillStyle = COLORS.red;
    context.fillRect(enemy.x - 18, enemy.y - enemy.radius - 12, 36 * ratio, 4);
  }

  private drawPlayer(state: Readonly<GameState>): void {
    const context = this.context;
    const player = state.player;
    const angle = Math.atan2(player.facingY, player.facingX);
    context.save();
    context.translate(player.x, player.y);
    context.rotate(angle);
    if (player.dashTicks > 0) {
      context.strokeStyle = "rgba(255,157,61,0.42)";
      context.lineWidth = 5;
      for (const offset of [18, 31]) {
        context.beginPath();
        context.moveTo(-offset, -8);
        context.lineTo(-offset - 18, -8);
        context.moveTo(-offset, 8);
        context.lineTo(-offset - 18, 8);
        context.stroke();
      }
    }
    context.fillStyle = COLORS.orange;
    context.strokeStyle = COLORS.white;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(22, 0);
    context.lineTo(-4, 15);
    context.lineTo(-15, 9);
    context.lineTo(-8, 0);
    context.lineTo(-15, -9);
    context.lineTo(-4, -15);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = COLORS.city900;
    context.beginPath();
    context.arc(4, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();

    if (player.empPulseTicks > 0) {
      const ratio = 1 - player.empPulseTicks / 24;
      context.strokeStyle = `rgba(240,75,226,${0.9 - ratio * 0.8})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(player.x, player.y, PLAYER.empRadius * ratio, 0, Math.PI * 2);
      context.stroke();
    }
  }

  private drawHud(state: Readonly<GameState>): void {
    const context = this.context;
    context.fillStyle = "rgba(5,10,16,0.94)";
    context.fillRect(0, 0, VIEW_WIDTH, 82);
    context.strokeStyle = COLORS.city500;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, 81);
    context.lineTo(VIEW_WIDTH, 81);
    context.stroke();

    this.drawMeter(28, 25, 174, 12, state.player.health / state.player.maxHealth, COLORS.red, "HP");
    this.drawMeter(28, 54, 174, 10, state.player.heat, state.player.overheated ? COLORS.red : COLORS.orange, "HEAT");

    const remainingTicks = Math.max(0, MISSION_TICKS - state.elapsedTicks);
    const seconds = Math.ceil(remainingTicks / 60);
    const timeText = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    context.textAlign = "center";
    context.font = "600 30px Oxanium, system-ui, sans-serif";
    context.fillStyle = seconds <= 30 ? COLORS.red : COLORS.orange;
    context.fillText(timeText, VIEW_WIDTH / 2, 46);
    context.fillStyle = COLORS.city500;
    context.font = "500 14px Oxanium, system-ui, sans-serif";
    context.fillText("M1 SIGNAL WINDOW", VIEW_WIDTH / 2, 67);

    context.textAlign = "right";
    context.fillStyle = COLORS.white;
    context.font = "600 18px Noto Sans KR, system-ui, sans-serif";
    context.fillText(`업로드 ${state.uploadedPackets}/1`, 928, 32);
    context.fillStyle = state.packet.status === "carried" ? COLORS.white : COLORS.city500;
    context.font = "600 15px Noto Sans KR, system-ui, sans-serif";
    context.fillText(state.packet.status === "carried" ? "◆ 패킷 운반 중" : "◇ 패킷 회수 필요", 928, 58);

    const dashReady = state.player.dashCooldownTicks === 0;
    const empReady = state.player.empCooldownTicks === 0;
    context.textAlign = "center";
    context.font = "600 14px Oxanium, system-ui, sans-serif";
    context.fillStyle = dashReady ? COLORS.orange : COLORS.gray;
    context.fillText(`SPACE DASH ${dashReady ? "READY" : (state.player.dashCooldownTicks / 60).toFixed(1)}`, 348, 527);
    context.fillStyle = empReady ? COLORS.magenta : COLORS.gray;
    context.fillText(`RMB EMP ${empReady ? "READY" : (state.player.empCooldownTicks / 60).toFixed(1)}`, 612, 527);

    this.drawLinkLegend(state.relay.linkState);
  }

  private drawLinkLegend(active: LinkState): void {
    const context = this.context;
    const items: Array<{ state: LinkState; label: string; x: number }> = [
      { state: "normal", label: "ONLINE", x: 55 },
      { state: "jammed", label: "JAMMED", x: 137 },
      { state: "disconnected", label: "OFFLINE", x: 227 },
    ];
    for (const item of items) {
      const color = item.state === "normal" ? COLORS.cyan : item.state === "jammed" ? COLORS.magenta : COLORS.gray;
      context.save();
      context.globalAlpha = item.state === active ? 1 : 0.46;
      context.strokeStyle = color;
      context.lineWidth = item.state === active ? 3 : 2;
      context.setLineDash(item.state === "normal" ? [] : item.state === "jammed" ? [8, 6] : [10, 8]);
      context.beginPath();
      context.moveTo(item.x - 25, 493);
      context.lineTo(item.x + 22, 493);
      context.stroke();
      context.fillStyle = color;
      context.font = "500 10px Oxanium, system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(item.label, item.x, 510);
      context.restore();
    }
  }

  private drawMenu(): void {
    const context = this.context;
    context.fillStyle = "rgba(5,10,16,0.96)";
    context.fillRect(0, 82, VIEW_WIDTH, VIEW_HEIGHT - 82);
    context.textAlign = "center";
    context.fillStyle = COLORS.cyan;
    context.font = "600 50px Oxanium, system-ui, sans-serif";
    context.fillText("SIGNAL COURIER", VIEW_WIDTH / 2, 164);
    context.fillStyle = COLORS.white;
    context.font = "600 19px Noto Sans KR, system-ui, sans-serif";
    context.fillText("2분 안에 중계기를 설치하고 패킷을 업로드하라", VIEW_WIDTH / 2, 203);

    const controls: Array<{ glyph: string; label: string }> = [
      { glyph: "wasd", label: "이동" },
      { glyph: "mouseMove", label: "조준" },
      { glyph: "mouseLeft", label: "사격" },
      { glyph: "keySpace", label: "대시" },
      { glyph: "mouseRight", label: "EMP" },
      { glyph: "keyE", label: "설치 · 업로드 · 수리" },
      { glyph: "P", label: "일시정지" },
      { glyph: "fullscreen", label: "전체 화면 · 종료" },
    ];
    controls.forEach(({ glyph, label }, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const x = 188 + column * 195;
      const y = 264 + row * 66;
      this.drawInputPrompt(glyph, x, y);
      context.fillStyle = COLORS.city500;
      context.font = "600 14px Noto Sans KR, system-ui, sans-serif";
      context.fillText(label, x, y + 30);
    });
    context.fillStyle = COLORS.orange;
    context.font = "600 22px Oxanium, system-ui, sans-serif";
    context.fillText("ENTER TO DEPLOY", VIEW_WIDTH / 2, 431);
    context.fillStyle = COLORS.city500;
    context.font = "500 14px Noto Sans KR, system-ui, sans-serif";
    context.fillText("청록 실선=정상  ·  자홍 파선=교란  ·  회색 긴 파선=단절", VIEW_WIDTH / 2, 471);
  }

  private drawResult(state: Readonly<GameState>, success: boolean): void {
    const color = success ? COLORS.cyan : COLORS.red;
    this.drawOverlay(success ? "PACKET DELIVERED" : "SIGNAL LOST", "R  같은 시드 재시작", color);
    const context = this.context;
    context.textAlign = "center";
    context.fillStyle = COLORS.white;
    context.font = "600 17px Noto Sans KR, system-ui, sans-serif";
    context.fillText(`업로드 ${state.uploadedPackets}/1  ·  생존 시간 ${(state.elapsedTicks / 60).toFixed(1)}초`, VIEW_WIDTH / 2, 326);
  }

  private drawOverlay(title: string, subtitle: string, color: string): void {
    const context = this.context;
    context.fillStyle = "rgba(5,10,16,0.94)";
    context.fillRect(0, 82, VIEW_WIDTH, VIEW_HEIGHT - 82);
    context.textAlign = "center";
    context.fillStyle = color;
    context.font = "600 46px Oxanium, system-ui, sans-serif";
    context.fillText(title, VIEW_WIDTH / 2, 246);
    context.fillStyle = COLORS.white;
    context.font = "600 17px Noto Sans KR, system-ui, sans-serif";
    context.fillText(subtitle, VIEW_WIDTH / 2, 286);
  }

  private drawMeter(x: number, y: number, width: number, height: number, ratio: number, color: string, label: string): void {
    const context = this.context;
    context.textAlign = "left";
    context.fillStyle = COLORS.white;
    context.font = "500 12px Oxanium, system-ui, sans-serif";
    context.fillText(label, x, y - 5);
    context.fillStyle = COLORS.city800;
    context.fillRect(x + 42, y - height, width, height);
    const segments = 10;
    for (let segment = 0; segment < segments; segment += 1) {
      if ((segment + 1) / segments > ratio + 0.0001) continue;
      const segmentWidth = width / segments - 3;
      context.fillStyle = color;
      context.fillRect(x + 44 + segment * (width / segments), y - height + 2, segmentWidth, height - 4);
    }
  }

  private drawProgressRing(progress: number, color: string, radius: number): void {
    const context = this.context;
    context.strokeStyle = "rgba(244,248,255,0.16)";
    context.lineWidth = 5;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = color;
    context.beginPath();
    context.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, progress)));
    context.stroke();
  }

  private drawWorldLabel(label: string, x: number, y: number, color: string): void {
    const context = this.context;
    context.fillStyle = "rgba(5,10,16,0.88)";
    context.fillRect(x - 72, y - 15, 144, 23);
    context.fillStyle = color;
    context.font = "600 13px Noto Sans KR, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(label, x, y + 2);
  }

  private drawKeycap(label: string, x: number, y: number): void {
    const context = this.context;
    const width = Math.max(52, label.length * 11 + 18);
    context.fillStyle = COLORS.city800;
    context.strokeStyle = COLORS.orange;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x - width / 2, y - 18, width, 36, 6);
    context.fill();
    context.stroke();
    context.fillStyle = COLORS.white;
    context.font = "600 14px Oxanium, system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(label, x, y + 5);
  }

  private drawInputPrompt(glyph: string, x: number, y: number): void {
    if (glyph === "wasd") {
      this.drawGlyph("keyW", x, y - 10, 22);
      this.drawGlyph("keyA", x - 23, y + 12, 22);
      this.drawGlyph("keyS", x, y + 12, 22);
      this.drawGlyph("keyD", x + 23, y + 12, 22);
      return;
    }
    if (glyph === "fullscreen") {
      this.drawGlyph("keyF", x - 18, y, 34);
      this.drawGlyph("keyEscape", x + 20, y, 34);
      return;
    }
    if (glyph in { mouseMove: true, mouseLeft: true, mouseRight: true, keySpace: true, keyE: true }) {
      this.drawGlyph(glyph as InputGlyphId, x, y, glyph === "keySpace" ? 46 : 38);
      return;
    }
    this.drawKeycap(glyph, x, y);
  }

  private drawGlyph(id: InputGlyphId, x: number, y: number, size: number): void {
    const image = this.inputGlyphs.get(id);
    if (!image) {
      this.drawKeycap(id.replace("key", "").replace("mouse", "M"), x, y);
      return;
    }
    this.context.drawImage(image, x - size / 2, y - size / 2, size, size);
  }

  private hexagon(x: number, y: number, radius: number): void {
    const context = this.context;
    context.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / 3;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;
      if (index === 0) context.moveTo(pointX, pointY);
      else context.lineTo(pointX, pointY);
    }
    context.closePath();
  }
}
