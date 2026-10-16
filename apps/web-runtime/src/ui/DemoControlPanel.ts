import { soundManager } from "../services/SoundManager.js";

export class DemoControlPanel {
  private bridgeUrl: string;
  private toastEl: HTMLElement;
  private toastTextEl: HTMLElement;
  private toastIconEl: HTMLElement;
  private toastTimer: any = null;
  private spawnCounter = 1;

  public onToggleAutoWalk?: () => boolean;
  public onToggleHighlightAll?: () => boolean;
  public onCenterCamera?: () => void;
  public onResetStage?: () => Promise<void> | void;
  public onEmptyStage?: () => Promise<void> | void;
  public onTriggerScenario?: (stage: number) => Promise<void> | void;

  constructor(bridgeUrl = "http://localhost:8000") {
    this.bridgeUrl = bridgeUrl;
    this.toastEl = document.getElementById("toast-notification")!;
    this.toastTextEl = document.getElementById("toast-text")!;
    this.toastIconEl = document.getElementById("toast-icon")!;

    this.bindEvents();
  }

  private bindEvents() {
    // Stage 1
    document.getElementById("btn-stage1")?.addEventListener("click", async () => {
      await this.onTriggerScenario?.(1);
      this.triggerDemo("/api/v1/demo/stage1_session_start", "[1]", "Stage 1: Guest walks to Room #1 -> Amber bed glow & 59:59 session timer");
    });

    // Stage 2
    document.getElementById("btn-stage2")?.addEventListener("click", async () => {
      await this.onTriggerScenario?.(2);
      this.triggerDemo("/api/v1/demo/stage2_guest_delay", "[2]", "Stage 2: Guest wait > 10m -> SLA irritation smoke alert");
    });

    // Stage 3
    document.getElementById("btn-stage3")?.addEventListener("click", async () => {
      await this.onTriggerScenario?.(3);
      this.triggerDemo("/api/v1/demo/stage3_payment_coin", "[3]", "Stage 3: Payment /pay 4500 -> Guest at cashier & golden coin fountain");
    });

    // Stage 4
    document.getElementById("btn-stage4")?.addEventListener("click", async () => {
      await this.onTriggerScenario?.(4);
      this.triggerDemo("/api/v1/demo/stage4_stamina_drop", "[4]", "Stage 4: Therapist fatigue (< 20%) -> Walks to tea table for break");
    });

    // Stage 5
    document.getElementById("btn-stage5")?.addEventListener("click", async () => {
      await this.onTriggerScenario?.(5);
      this.triggerDemo("/api/v1/demo/stage5_review_sakura", "[5]", "Stage 5: 5-Star review received -> Sakura petals bloom across salon");
    });

    // Stage 6
    document.getElementById("btn-stage6")?.addEventListener("click", async () => {
      await this.onTriggerScenario?.(6);
      this.triggerDemo("/api/v1/demo/stage6_mcp_rebuild", "[6]", "Stage 6: AI via MCP removed waiting lounge and installed VIP Hinoki Onsen");
    });

    // Reset / Populate (Autonomous in-browser fallback + safe background sync)
    document.getElementById("btn-reset")?.addEventListener("click", async () => {
      soundManager.playZenChime();
      if (this.onResetStage) {
        await this.onResetStage();
      }
      this.showToast("[+]", "Salon restored to locked default layout", 2200);
      fetch(`${this.bridgeUrl}/api/v1/demo/reset`, { method: "POST" }).catch(() => {});
    });

    document.getElementById("btn-populate-stage")?.addEventListener("click", async () => {
      soundManager.playZenChime();
      if (this.onResetStage) {
        await this.onResetStage();
      }
      this.showToast("[+]", "Salon populated with all default walls, furniture, and characters", 2200);
      fetch(`${this.bridgeUrl}/api/v1/demo/reset`, { method: "POST" }).catch(() => {});
    });

    // Empty Stage button
    document.getElementById("btn-empty-stage")?.addEventListener("click", async () => {
      if (this.onEmptyStage) {
        await this.onEmptyStage();
      }
      this.showToast("[-]", "Clean empty stage! Add modular walls and furniture from the left catalog", 2400);
      fetch(`${this.bridgeUrl}/api/v1/world/clear`, { method: "POST" }).catch(() => {});
    });

    // Save Current Layout as Default
    document.getElementById("btn-save-default")?.addEventListener("click", () => {
      this.triggerDemo("/api/v1/world/save_default", "[*]", "Current wall & furniture layout locked as default!");
    });

    // Highlight All Interactive Objects (Contour Outline)
    const highlightSidebarBtn = document.getElementById("btn-highlight-all");
    const highlightHeaderBtn = document.getElementById("btn-highlight-header");
    const handleHighlightToggle = () => {
      if (this.onToggleHighlightAll) {
        const active = this.onToggleHighlightAll();
        if (highlightSidebarBtn) {
          highlightSidebarBtn.textContent = active ? "[#] Contours: ON" : "[#] Highlight All Objects";
          highlightSidebarBtn.classList.toggle("active-toggle", active);
        }
        if (highlightHeaderBtn) {
          highlightHeaderBtn.textContent = active ? "[#] Contours: ON" : "[+] Highlight Objects";
          highlightHeaderBtn.classList.toggle("active-btn", active);
        }
        this.showToast(
          "[#]",
          active
            ? "Pixel-art contours highlighted on all interactive objects, walls, and characters"
            : "Contour highlight disabled (outlines shown only on hover/focus)",
          2400
        );
      }
    };
    highlightSidebarBtn?.addEventListener("click", handleHighlightToggle);
    highlightHeaderBtn?.addEventListener("click", handleHighlightToggle);

    // Toggle Autonomous Character Walking
    const walkToggleBtn = document.getElementById("btn-toggle-walk");
    walkToggleBtn?.addEventListener("click", () => {
      if (this.onToggleAutoWalk) {
        const active = this.onToggleAutoWalk();
        walkToggleBtn.textContent = active ? "[>] Auto-Walk: ON" : "[-] Auto-Walk: PAUSED";
        walkToggleBtn.classList.toggle("active-toggle", active);
        this.showToast(active ? "[>]" : "[-]", active ? "Characters patrolling corridors & doorways" : "Autonomous character movement paused", 2200);
      }
    });

    // Center Camera
    document.getElementById("btn-center-cam")?.addEventListener("click", () => {
      this.onCenterCamera?.();
      this.showToast("[o]", "Camera centered on stage", 1800);
    });

    // Catalog Item Spawning
    const catalogBtns = document.querySelectorAll<HTMLButtonElement>(".catalog-item-btn");
    catalogBtns.forEach((btn) => {
      btn.addEventListener("click", async () => {
        const assetType = btn.dataset.asset || "massage_bed_wood_left";
        const entityType = btn.dataset.type || "station";
        const itemName = btn.dataset.name || "Entity";
        await this.spawnCatalogItem(assetType, entityType, itemName);
      });
    });

    // Sound Toggle
    const soundBtn = document.getElementById("btn-sound");
    soundBtn?.addEventListener("click", () => {
      soundManager.enabled = !soundManager.enabled;
      if (soundBtn) {
        soundBtn.textContent = soundManager.enabled ? "[~] Audio: ON" : "[-] Audio: OFF";
      }
      this.showToast(soundManager.enabled ? "[~]" : "[-]", soundManager.enabled ? "Audio effects enabled" : "Audio effects muted", 2000);
    });
  }

  private async spawnCatalogItem(assetType: string, entityType: string, itemName: string) {
    const idx = this.spawnCounter++;
    const id = `${assetType}_${Date.now().toString().slice(-4)}_${idx}`;
    const offsetX = ((idx * 37) % 140) - 70;
    const offsetY = ((idx * 29) % 100) - 20;
    const worldX = -110 + offsetX;
    const worldY = 120 + offsetY;

    try {
      const resp = await fetch(`${this.bridgeUrl}/api/v1/world/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: `${itemName} #${idx}`,
          asset_type: assetType,
          type: entityType,
          grid_x: 6,
          grid_y: 8,
          footprint_w: 1,
          footprint_h: 1,
          world_x: worldX,
          world_y: worldY,
          flip_x: false
        })
      });
      if (resp.ok) {
        soundManager.playZenChime();
        this.showToast("[+]", `Spawned "${itemName} #${idx}" — drag anywhere on stage!`, 3000);
      }
    } catch (err: any) {
      this.showToast("[!]", `Spawn error: ${err.message}`);
    }
  }

  private async triggerDemo(endpoint: string, icon: string, message: string) {
    this.showToast(icon, message);
    try {
      let resp = await fetch(`${this.bridgeUrl}${endpoint}`, { method: "POST" });
      if (!resp.ok && endpoint === "/api/v1/demo/reset") {
        await fetch(`${this.bridgeUrl}/api/v1/world/reset`, { method: "POST" }).catch(() => {});
      }
    } catch {
      // In standalone / Vercel web mode without local Python backend, client simulation ran smoothly
    }
  }

  public showToast(icon: string, message: string, durationMs = 3800) {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastIconEl.textContent = icon;
    this.toastTextEl.textContent = message;
    this.toastEl.classList.add("visible");

    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove("visible");
      this.toastTimer = null;
    }, durationMs);
  }

  public updateConnectionStatus(connected: boolean) {
    const dot = document.getElementById("ws-dot");
    const label = document.getElementById("ws-label");
    if (dot && label) {
      if (connected) {
        dot.className = "status-dot";
        label.textContent = "Bridge Online";
      } else {
        dot.className = "status-dot standalone";
        label.textContent = "Standalone Mode";
      }
    }
  }
}
