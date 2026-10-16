import { soundManager } from "./SoundManager.js";
import { mcpConsole } from "../ui/McpConsole.js";
import { voiceAgentService } from "./VoiceAgentService.js";

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
    this.zoneRules.set("waiting_lounge", {
      zoneId: "waiting_lounge",
      maxWaitMinutes: 25,
      alertThresholdMinutes: 20,
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

    this.furnitureStates.set("suite_aromatherapy:aromatherapy_diffuser", {
      zoneId: "suite_aromatherapy",
      itemType: "aromatherapy_diffuser",
      enabled: true,
      updatedAt: Date.now()
    });
  }

  private bindWindowEvents() {
    window.addEventListener("spatialtwin:update_rule", ((e: CustomEvent) => {
      this.handleUpdateRule(e.detail);
    }) as EventListener);

    window.addEventListener("spatialtwin:bind_stream", ((e: CustomEvent) => {
      this.handleBindStream(e.detail);
    }) as EventListener);

    window.addEventListener("spatialtwin:toggle_furniture", ((e: CustomEvent) => {
      this.handleToggleFurniture(e.detail);
    }) as EventListener);

    window.addEventListener("spatialtwin:sla_alert", ((e: CustomEvent) => {
      this.triggerSlaViolationAlert(e.detail?.zoneId || "waiting_lounge", e.detail?.minutes || 20);
    }) as EventListener);
  }

  private getDioramaScene(): any {
    const game = (window as any).__PHASER_GAME__;
    if (game && game.scene) {
      return game.scene.getScene("DioramaScene");
    }
    return null;
  }

  public showToast(icon: string, message: string, duration = 3400) {
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

  public handleUpdateRule(detail: { zoneId: string; maxWaitMinutes?: number; alertThresholdMinutes?: number; triggerVoiceAnnouncement?: boolean }) {
    const { zoneId, maxWaitMinutes, alertThresholdMinutes, triggerVoiceAnnouncement = true } = detail;
    const existing = this.zoneRules.get(zoneId) || { zoneId, updatedAt: Date.now() };

    if (typeof maxWaitMinutes === "number") existing.maxWaitMinutes = maxWaitMinutes;
    if (typeof alertThresholdMinutes === "number") existing.alertThresholdMinutes = alertThresholdMinutes;
    existing.updatedAt = Date.now();
    this.zoneRules.set(zoneId, existing);

    mcpConsole.logMcpIn("updateZoneRule", {
      zoneId,
      maxWaitMinutes: existing.maxWaitMinutes,
      alertThresholdMinutes: existing.alertThresholdMinutes
    });

    const scene = this.getDioramaScene();
    const zoneMeta = SALON_ZONES[zoneId] || { worldX: -180, worldY: 125, name: zoneId };

    if (scene && scene.particleLayer) {
      if (zoneId === "waiting_lounge") {
        scene.particleLayer.spawnSteam(zoneMeta.worldX, zoneMeta.worldY, 7);
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

    const thresholdText = existing.alertThresholdMinutes ? `Alert at ${existing.alertThresholdMinutes}m` : `Max wait: ${existing.maxWaitMinutes}m`;
    this.showToast("[★]", `SLA Rule Updated: [${zoneMeta.name}] -> ${thresholdText}`, 3200);

    if (triggerVoiceAnnouncement && existing.alertThresholdMinutes) {
      const voiceText = `SLA threshold for ${zoneMeta.name} is now calibrated to ${existing.alertThresholdMinutes} minutes.`;
      voiceAgentService.speak({
        text: voiceText,
        speaker: "receptionist",
        speakerName: "Receptionist Lin"
      });
    }
  }

  public triggerSlaViolationAlert(zoneId = "waiting_lounge", minutes = 20) {
    const zoneMeta = SALON_ZONES[zoneId] || { worldX: -180, worldY: 125, name: "Waiting Lounge" };
    const scene = this.getDioramaScene();

    soundManager.playAlertChime();

    if (scene && scene.particleLayer) {
      scene.particleLayer.spawnSteam(zoneMeta.worldX, zoneMeta.worldY, 8);
    }

    if (scene && scene.centerCameraOnEntity) {
      scene.centerCameraOnEntity("sofa_armchair_01");
    }

    const alertSpeech = `Attention: Guest in waiting lounge has been waiting for ${minutes} minutes, exceeding SLA threshold. Master Somchai is completing suite preparation.`;

    voiceAgentService.speak({
      text: alertSpeech,
      speaker: "receptionist",
      speakerName: "Receptionist Lin (ElevenLabs)",
      priority: "urgent"
    });

    mcpConsole.logMcpIn("triggerSlaAlert", { zoneId, minutes, guest: "Kenji Sato" });
    mcpConsole.logMcpOut("triggerSlaAlert", {
      status: "VOICE_ANNOUNCED",
      audioEngine: voiceAgentService.hasApiKey() ? "ElevenLabs Neural Streaming" : "WebSpeechFallback"
    });

    this.showToast("[🚨]", `SLA ALERT: Guest in tea lounge waiting ${minutes}m!`, 4500);
  }

  public querySalonRevenue(): { revenue: number; currency: string; occupancyPct: number; sessionsCount: number; formattedText: string } {
    const scene = this.getDioramaScene();
    soundManager.playCoinChime();

    if (scene && scene.centerCameraOnEntity) {
      scene.centerCameraOnEntity("cash_chest_01");
    }

    const data = {
      revenue: 14500,
      currency: "THB (฿)",
      occupancyPct: 80,
      sessionsCount: 18,
      formattedText: "Today's revenue is ฿14,500 across 18 sessions with 80% room occupancy."
    };

    mcpConsole.logMcpIn("querySalonRevenue", {});
    mcpConsole.logMcpOut("querySalonRevenue", data);
    this.showToast("[฿]", `Today Revenue: ฿14,500 | Occupancy: 80%`, 3500);

    return data;
  }

  public sendStaffOnBreak(staffId = "master_somchai", durationMinutes = 15): { staffId: string; status: string; destination: string; message: string } {
    const scene = this.getDioramaScene();
    soundManager.playZenChime();

    if (scene) {
      if (scene.sendStaffToBreak) {
        scene.sendStaffToBreak(staffId);
      } else if (scene.centerCameraOnEntity) {
        scene.centerCameraOnEntity("sofa_armchair_01");
      }
    }

    const result = {
      staffId,
      status: "TEA_BREAK",
      destination: "waiting_lounge",
      message: `Master Somchai has been dispatched on a ${durationMinutes}-minute tea break to the waiting lounge.`
    };

    mcpConsole.logMcpIn("sendStaffOnBreak", { staffId, durationMinutes });
    mcpConsole.logMcpOut("sendStaffOnBreak", result);
    this.showToast("[🍵]", `Master Somchai: [TEA BREAK · ${durationMinutes} min]`, 3500);

    return result;
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

    this.showToast("[~]", `Telemetry Linked: [${zoneMeta.name}] -> ${sourceType.toUpperCase()} (${targetField})`, 3400);
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

    this.showToast("[#]", `Furniture: [${itemType}] in ${zoneMeta.name} is now ${enabled ? "ONLINE" : "OFFLINE"}`, 2800);
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
      todayRevenue: "฿14,500",
      activeGuests: 3,
      zones,
      furniture: Array.from(this.furnitureStates.entries()).map(([k, v]) => ({ key: k, item: v.itemType, zone: v.zoneId, active: v.enabled }))
    };
  }
}

export const spatialRuntimeDispatcher = SpatialRuntimeDispatcher.getInstance();
