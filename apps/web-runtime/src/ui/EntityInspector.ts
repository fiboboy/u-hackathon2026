import { Entity } from "@spatialtwin/core-schema";

export class EntityInspector {
  private drawer: HTMLElement;
  private titleEl: HTMLElement;
  private typeEl: HTMLElement;
  private statusEl: HTMLElement;
  private coordsEl: HTMLElement;
  private timerEl: HTMLElement;
  private staminaEl: HTMLElement;
  private walkPanel: HTMLElement;
  private closeBtn: HTMLElement;
  private flipBtn: HTMLElement;
  private deleteBtn: HTMLElement;

  public currentEntity: Entity | null = null;
  public onFlipRequested?: (entityId: string) => void;
  public onDeleteRequested?: (entityId: string) => void;
  public onWalkRequested?: (entityId: string, x: number, y: number) => void;

  constructor() {
    this.drawer = document.getElementById("inspector-drawer")!;
    this.titleEl = document.getElementById("insp-title")!;
    this.typeEl = document.getElementById("insp-type")!;
    this.statusEl = document.getElementById("insp-status")!;
    this.coordsEl = document.getElementById("insp-coords")!;
    this.timerEl = document.getElementById("insp-timer")!;
    this.staminaEl = document.getElementById("insp-stamina")!;
    this.walkPanel = document.getElementById("insp-walk-panel")!;
    this.closeBtn = document.getElementById("insp-close")!;
    this.flipBtn = document.getElementById("insp-btn-flip")!;
    this.deleteBtn = document.getElementById("insp-btn-delete")!;

    this.closeBtn.addEventListener("click", () => this.hide());

    this.flipBtn.addEventListener("click", () => {
      if (this.currentEntity) {
        this.onFlipRequested?.(this.currentEntity.id);
      }
    });

    this.deleteBtn.addEventListener("click", () => {
      if (this.currentEntity) {
        const id = this.currentEntity.id;
        this.onDeleteRequested?.(id);
        this.hide();
      }
    });

    // Character Walk Destination Buttons
    const walkBtns = this.walkPanel.querySelectorAll<HTMLButtonElement>("button[data-walk-x]");
    walkBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this.currentEntity) return;
        const tx = Number(btn.dataset.walkX || 0);
        const ty = Number(btn.dataset.walkY || 0);
        this.onWalkRequested?.(this.currentEntity.id, tx, ty);
      });
    });
  }

  public show(entity: Entity) {
    this.currentEntity = entity;
    this.titleEl.textContent = entity.name || entity.id;
    this.typeEl.textContent = `Type: ${entity.type.toUpperCase()} · Grid: (${entity.grid_position.x}, ${entity.grid_position.y})`;

    const state = entity.state || ({} as any);
    const status = state.status || "idle";
    this.statusEl.textContent = status.toUpperCase();
    this.statusEl.className = `tag-status tag-${status}`;

    const cd = state.custom_data || {};
    const wx = cd.world_x ?? 0;
    const wy = cd.world_y ?? 0;
    this.coordsEl.textContent = `X: ${Math.round(wx)}, Y: ${Math.round(wy)}`;

    const secsLeft = state.current_session_seconds_left || 0;
    if (secsLeft > 0) {
      const m = Math.floor(secsLeft / 60);
      const s = secsLeft % 60;
      this.timerEl.textContent = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    } else {
      this.timerEl.textContent = "Inactive";
    }

    if (entity.type === "staff") {
      this.staminaEl.textContent = `${Math.round(state.stamina ?? 100)}%`;
    } else {
      this.staminaEl.textContent = "—";
    }

    const isChar = entity.type === "staff" || entity.type === "guest";
    this.walkPanel.style.display = isChar ? "block" : "none";

    this.drawer.style.display = "block";
  }

  public hide() {
    this.drawer.style.display = "none";
    this.currentEntity = null;
  }
}
