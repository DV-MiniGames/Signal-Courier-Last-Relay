import { clamp } from "../../core/math";
import type { InputFrame } from "../../model/commands";

type PressedAction = "dash" | "emp" | "start" | "pause" | "restart";

export class DomInput {
  private readonly heldCodes = new Set<string>();
  private readonly pressedActions = new Set<PressedAction>();
  private fireHeld = false;
  private interactHeld = false;
  private aimX = 480;
  private aimY = 270;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("pointerenter", () => canvas.focus({ preventScroll: true }));
    canvas.focus({ preventScroll: true });
  }

  readFrame(): InputFrame {
    const frame: InputFrame = {
      moveX: Number(this.heldCodes.has("KeyD") || this.heldCodes.has("ArrowRight"))
        - Number(this.heldCodes.has("KeyA") || this.heldCodes.has("ArrowLeft")),
      moveY: Number(this.heldCodes.has("KeyS") || this.heldCodes.has("ArrowDown"))
        - Number(this.heldCodes.has("KeyW") || this.heldCodes.has("ArrowUp")),
      aim: { x: this.aimX, y: this.aimY },
      fireHeld: this.fireHeld,
      dashPressed: this.pressedActions.has("dash"),
      empPressed: this.pressedActions.has("emp"),
      interactHeld: this.interactHeld,
      startPressed: this.pressedActions.has("start"),
      pausePressed: this.pressedActions.has("pause"),
      restartPressed: this.pressedActions.has("restart"),
    };
    this.pressedActions.clear();
    return frame;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
      event.preventDefault();
    }
    this.heldCodes.add(event.code);
    if (event.code === "KeyE") this.interactHeld = true;
    if (event.repeat) return;
    if (event.code === "Space") this.pressedActions.add("dash");
    if (event.code === "Enter") this.pressedActions.add("start");
    if (event.code === "KeyP") this.pressedActions.add("pause");
    if (event.code === "KeyR") this.pressedActions.add("restart");
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.heldCodes.delete(event.code);
    if (event.code === "KeyE") this.interactHeld = false;
  };

  private handlePointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.aimX = clamp((event.clientX - rect.left) * this.canvas.width / rect.width, 0, this.canvas.width);
    this.aimY = clamp((event.clientY - rect.top) * this.canvas.height / rect.height, 0, this.canvas.height);
  };

  private handlePointerDown = (event: PointerEvent): void => {
    this.canvas.focus({ preventScroll: true });
    this.handlePointerMove(event);
    if (event.button === 0) this.fireHeld = true;
    if (event.button === 2) this.pressedActions.add("emp");
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (event.button === 0) this.fireHeld = false;
  };

  private handleBlur = (): void => {
    this.clearHeld();
    this.pressedActions.add("pause");
  };

  private handleVisibilityChange = (): void => {
    if (document.visibilityState !== "hidden") return;
    this.clearHeld();
    this.pressedActions.add("pause");
  };

  private clearHeld(): void {
    this.heldCodes.clear();
    this.fireHeld = false;
    this.interactHeld = false;
  }
}
