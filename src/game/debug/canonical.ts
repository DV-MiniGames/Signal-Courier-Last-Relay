import type { GameState } from "../core/types";

export function canonicalState(state: GameState): string {
  return JSON.stringify({
    schemaVersion: state.schemaVersion,
    mode: state.mode,
    seed: state.seed,
    rngState: state.rngState,
    tick: state.tick,
    elapsedTicks: state.elapsedTicks,
    levelIndex: state.levelIndex,
    score: state.score,
    stageKills: state.stageKills,
    totalKills: state.totalKills,
    lastStageScore: state.lastStageScore,
    nextEntityId: state.nextEntityId,
    player: state.player,
    relay: state.relay,
    packet: state.packet,
    enemies: state.enemies,
    projectiles: state.projectiles,
    visualEffects: state.visualEffects,
    uploadedPackets: state.uploadedPackets,
  });
}

export function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function canonicalHash(state: GameState): string {
  return fnv1a32(canonicalState(state));
}
