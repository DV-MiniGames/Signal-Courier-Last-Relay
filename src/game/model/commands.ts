import type { Vec2 } from "../core/types";

export interface InputFrame {
  moveX: number;
  moveY: number;
  aim: Vec2;
  fireHeld: boolean;
  dashPressed: boolean;
  empPressed: boolean;
  interactHeld: boolean;
  startPressed: boolean;
  pausePressed: boolean;
  restartPressed: boolean;
}

export function neutralInput(aim: Vec2 = { x: 480, y: 270 }): InputFrame {
  return {
    moveX: 0,
    moveY: 0,
    aim: { ...aim },
    fireHeld: false,
    dashPressed: false,
    empPressed: false,
    interactHeld: false,
    startPressed: false,
    pausePressed: false,
    restartPressed: false,
  };
}
