import { soundManager } from "./SoundManager.js";
import { mcpConsole } from "../ui/McpConsole.js";

export interface ZoneRule {
  zoneId: string;
  maxWaitMinutes?: number;
  alertThresholdMinutes?: number;
  updatedAt: number;
}

export interface ZoneTelemetryBinding {
  zoneId: string;
  sourceType: "google_sheets" | "telegram" | "moysklad" | "yclients";
  targetField: string;
  updatedAt: number;
}

export interface ZoneFurnitureState {
  zoneId: string;
  itemType: string;
  enabled: boolean;
  updatedAt: number;
}

export interface ZoneMetadata {
  id: string;
  name: string;
  roomName: string;
  stationId: string;
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  description: string;
}

export const SALON_ZONES: Record<string, ZoneMetadata> = {
  reception: {
    id: "reception",
    name: "Reception & Concierge Desk",
    roomName: "Reception Counter",
    stationId: "cash_chest_01",
    gridX: 1,
    gridY: 8,
    worldX: -276,
    worldY: 158,
    description: "Main reception desk, POS cashier register, and guest check-in counter"
  },
  waiting_lounge: {
    id: "waiting_lounge",
    name: "Tea Tasting & Waiting Lounge",
    roomName: "Tea Lounge",
    stationId: "sofa_armchair_01",
    gridX: 3,
    gridY: 7,
    worldX: -180,
    worldY: 125,
    description: "Plush armchairs and tea tasting table for waiting guests before treatments"
  },
  suite_aromatherapy: {
    id: "suite_aromatherapy",
    name: "Tatami Aromatherapy Suite",
    roomName: "Room 1 (Aromatherapy)",
    stationId: "massage_bed_01",
    gridX: 6,
    gridY: 4,
    worldX: -120,
    worldY: 30,
    description: "Private cedar and tatami massage bed for essential oil body treatments"
  },
  suite_onsen: {
    id: "suite_onsen",
    name: "Hinoki Bath & Mineral Onsen Suite",
    roomName: "Bath & Garden Wing",
    stationId: "onsen_tub_01",
    gridX: 12,
    gridY: 3,
    worldX: 183,
    worldY: -135,
    description: "Handcrafted Hinoki cedar soaking tub with hot mineral spring water"
  },
  suite_double_massage: {
    id: "suite_double_massage",
    name: "Traditional Nuad Thai Suite",
    roomName: "Room 2 (Traditional)",
    stationId: "massage_bed_02",
    gridX: 9,
    gridY: 4,
    worldX: 20,
    worldY: -45,
    description: "Hardwood massage table for traditional acupressure and Thai massage"
  }
};

export class SpatialRuntimeDispatcher {
  private static instance: SpatialRuntimeDispatcher;
  public zoneRules: Map<string, ZoneRule> = new Map();
  public zoneBindings: Map<string, ZoneTelemetryBinding> = new Map();
  public furnitureStates: Map<string, ZoneFurnitureState> = new Map();

  private constructor() {
    this.initDefaultState();
    this.bindWindowEvents();
  }

  public static getInstance(): SpatialRuntimeDispatcher {
    if (!SpatialRuntimeDispatcher.instance) {
      SpatialRuntimeDispatcher.instance = new SpatialRuntimeDispatcher();
    }
    return SpatialRuntimeDispatcher.instance;
  }

  private initDefaultState() {
    // Default initial SLA rules
    this.zoneRules.set("waiting_lounge", {
      zoneId: "waiting_lounge",
      maxWaitMinutes: 25,
      alertThresholdMinutes: 10,
      updatedAt: Date.now()
    });
    this.zoneRules.set("reception", {
      zoneId: "reception",
      maxWaitMinutes: 15,
      alertThresholdMinutes: 5,
      updatedAt: Date.now()
    });
    this.zoneRules.set("suite_aromatherapy", {
      zoneId: "suite_aromatherapy",
      maxWaitMinutes: 60,
      alertThresholdMinutes: 50,
      updatedAt: Date.now()
    });

    // Default telemetry bindings
    this.zoneBindings.set("reception", {
      zoneId: "reception",
      sourceType: "moysklad",
      targetField: "pos_cash_register",
      updatedAt: Date.now()
    });
    this.zoneBindings.set("suite_aromatherapy", {
      zoneId: "suite_aromatherapy",
      sourceType: "google_sheets",
      targetField: "Sheet1!F12_session_status",
      updatedAt: Date.now()
    });

    // Default furniture states
    this.furnitureStates.set("suite_aromatherapy:aromatherapy_diffuser", {
      zoneId: "suite_aromatherapy",
      itemType: "aromatherapy_diffuser",
      enabled: true,
      updatedAt: Date.now()
    });
  }

  private bindWindowEvents() {
    // 1. Listen for rule updates
    window.addEventListener("spatialtwin:update_rule", ((e: CustomEvent) => {
      this.handleUpdateRule(e.detail);
    }) as EventListener);

    // 2. Listen for telemetry stream bindings
    window.addEventListener("spatialtwin:bind_stream", ((e: CustomEvent) => {
      this.handleBindStream(e.detail);
    }) as EventListener);

    // 3. Listen for furniture toggles
    window.addEventListener("spatialtwin:toggle_furniture", ((e: CustomEvent) => {
      this.handleToggleFurniture(e.detail);
    }) as EventListener);
  }

  private getDioramaScene(): any {
    const game = (window as any).__PHASER_GAME__;
    if (game && game.scene) {
      return game.scene.getScene("DioramaScene");
    }
    return null;
  }

  public showToast(icon: string, message: string, duration = 3200) {
    const toastEl = document.getElementById("toast-notification");
    const toastTextEl = document.getElementById("toast-text");
    const toastIconEl = document.getElementById("toast-icon");
    if (toastEl && toastTextEl && toastIconEl) {
      toastIconEl.textContent = icon;
      toastTextEl.textContent = message;
      toastEl.classList.add("visible");
      setTimeout(() => toastEl.classList.remove("visible"), duration);
    }
  }

  public handleUpdateRule(detail: { zoneId: string; maxWaitMinutes?: number; alertThresholdMinutes?: number }) {
    const { zoneId, maxWaitMinutes, alertThresholdMinutes } = detail;
    const existing = this.zoneRules.get(zoneId) || { zoneId, updatedAt: Date.now() };

    if (typeof maxWaitMinutes === "number") existing.maxWaitMinutes = maxWaitMinutes;
    if (typeof alertThresholdMinutes === "number") existing.alertThresholdMinutes = alertThresholdMinutes;
    existing.updatedAt = Date.now();
    this.zoneRules.set(zoneId, existing);

    // Terminal MCP Log
    mcpConsole.logMcpIn("updateZoneRule", {
      zoneId,
      maxWaitMinutes: existing.maxWaitMinutes,
      alertThresholdMinutes: existing.alertThresholdMinutes
    });

    const scene = this.getDioramaScene();
    const zoneMeta = SALON_ZONES[zoneId] || { worldX: -180, worldY: 125, name: zoneId };

    // Visual Scene Reactions
    if (scene && scene.particleLayer) {
      if (zoneId === "waiting_lounge") {
        // "Сделай так, чтобы после 20 минут над клиентом на диване появлялся пар"
        scene.particleLayer.spawnSteam(zoneMeta.worldX, zoneMeta.worldY, 6);
        soundManager.playAlertChime();
      } else if (zoneId === "suite_onsen") {
        scene.particleLayer.spawnSteam(zoneMeta.worldX, zoneMeta.worldY, 6);
        soundManager.playWaterDrip();
      } else if (zoneId === "suite_aromatherapy") {
        scene.particleLayer.spawnSteam(zoneMeta.worldX, zoneMeta.worldY, 5);
        soundManager.playZenChime();
      } else {
        soundManager.playAction("tap");
      }
    }

    mcpConsole.logMcpOut("updateZoneRule", {
      status: "APPLIED",
      zoneId,
      rules: {
        maxWaitMinutes: existing.maxWaitMinutes,
        alertThresholdMinutes: existing.alertThresholdMinutes
      }
    });

    const thresholdText = existing.alertThresholdMinutes ? `Alert at ${existing.alertThresholdMinutes}m` : `Max wait ${existing.maxWaitMinutes}m`;
    this.showToast("[★]", `SLA Rule Updated: [${zoneMeta.name}] -> ${thresholdText}`, 3200);
  }

  public handleBindStream(detail: { zoneId: string; sourceType: "google_sheets" | "telegram" | "moysklad" | "yclients"; targetField: string }) {
    const { zoneId, sourceType, targetField } = detail;
    this.zoneBindings.set(zoneId, {
      zoneId,
      sourceType,
      targetField,
      updatedAt: Date.now()
    });

    mcpConsole.logMcpIn("bindDataSource", { zoneId, sourceType, targetField });

    const scene = this.getDioramaScene();
    const zoneMeta = SALON_ZONES[zoneId] || { name: zoneId };

    if (scene && zoneMeta.stationId) {
      if (scene.centerCameraOnEntity) {
        scene.centerCameraOnEntity(zoneMeta.stationId);
      }
      if (scene.lightLayer) {
        scene.lightLayer.setLightGlow(zoneMeta.stationId, true);
      }
      soundManager.playCoinChime();
    }

    mcpConsole.logMcpOut("bindDataSource", {
      status: "STREAM_BOUND",
      zoneId,
      sourceType,
      targetField
    });

    this.showToast("[~]", `Telemetry Linked: [${zoneMeta.name}] listening to ${sourceType.toUpperCase()} (${targetField})`, 3400);
  }

  public handleToggleFurniture(detail: { zoneId: string; itemType: string; enabled: boolean }) {
    const { zoneId, itemType, enabled } = detail;
    const key = `${zoneId}:${itemType}`;
    this.furnitureStates.set(key, {
      zoneId,
      itemType,
      enabled,
      updatedAt: Date.now()
    });

    mcpConsole.logMcpIn("toggleFurnitureItem", { zoneId, itemType, enabled });

    const scene = this.getDioramaScene();
    const zoneMeta = SALON_ZONES[zoneId] || { worldX: -120, worldY: 30, name: zoneId };

    if (scene && scene.particleLayer) {
      if (enabled) {
        scene.particleLayer.spawnSteam(zoneMeta.worldX, zoneMeta.worldY, 7);
        soundManager.playZenChime();
      } else {
        soundManager.playAction("tap");
      }
    }

    mcpConsole.logMcpOut("toggleFurnitureItem", {
      status: enabled ? "ACTIVATED" : "DEACTIVATED",
      zoneId,
      itemType
    });

    this.showToast("[#]", `Furniture State: [${itemType}] in ${zoneMeta.name} is now ${enabled ? "ONLINE" : "OFFLINE"}`, 2800);
  }

  public getStateSnapshot() {
    const zones = Object.values(SALON_ZONES).map(z => {
      const rule = this.zoneRules.get(z.id);
      const binding = this.zoneBindings.get(z.id);
      return {
        zoneId: z.id,
        name: z.name,
        room: z.roomName,
        stationId: z.stationId,
        coords: { worldX: z.worldX, worldY: z.worldY, gridX: z.gridX, gridY: z.gridY },
        activeRules: rule ? { maxWaitMinutes: rule.maxWaitMinutes, alertThresholdMinutes: rule.alertThresholdMinutes } : null,
        crmBinding: binding ? { sourceType: binding.sourceType, targetField: binding.targetField } : null
      };
    });

    return {
      salonTitle: "SpatialTwin Zen Massage & Onsen Spa (Bangkok RCA)",
      zones,
      furniture: Array.from(this.furnitureStates.entries()).map(([k, v]) => ({ key: k, item: v.itemType, zone: v.zoneId, active: v.enabled }))
    };
  }
}

export const spatialRuntimeDispatcher = SpatialRuntimeDispatcher.getInstance();
