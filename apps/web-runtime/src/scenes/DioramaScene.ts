import Phaser from "phaser";
import { World, Entity, WsMessage } from "@spatialtwin/core-schema";
import { wsClient } from "../services/WebSocketClient.js";
import { BaseGridLayer } from "../layers/BaseGridLayer.js";
import { LightShaderLayer } from "../layers/LightShaderLayer.js";
import { ParticleLayer } from "../layers/ParticleLayer.js";
import { WorldHUDLayer } from "../layers/WorldHUDLayer.js";
import { soundManager } from "../services/SoundManager.js";

export class DioramaScene extends Phaser.Scene {
  private worldContainer!: Phaser.GameObjects.Container;
  private districtContainer!: Phaser.GameObjects.Container;
  public baseLayer!: BaseGridLayer;
  public lightLayer!: LightShaderLayer;
  public particleLayer!: ParticleLayer;
  public hudLayer!: WorldHUDLayer;

  public currentWorld: World | null = null;
  public onEntitySelected?: (entity: Entity) => void;
  public onEntityMovedUI?: (entity: Entity) => void;
  public onViewModeChanged?: (mode: "salon" | "district") => void;
  public autoWalkEnabled = true;
  public viewMode: "salon" | "district" = "salon";

  private isPanningCamera = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private waypointIndices: Map<string, number> = new Map();

  // Natural salon patrol waypoints along corridors, doorways, and inside treatment rooms
  private static readonly CHARACTER_WAYPOINTS: Record<string, Array<{ x: number; y: number }>> = {
    guest_kenji: [
      { x: -65, y: 85 },
      { x: -125, y: 88 },
      { x: -175, y: 128 },
      { x: -15, y: 35 },
    ],
    guest_yukata: [
      { x: 35, y: 8 },
      { x: 95, y: -18 },
      { x: 155, y: -42 },
      { x: 55, y: 28 },
    ],
    guest_customer: [
      { x: -275, y: 148 },
      { x: -235, y: 168 },
      { x: -265, y: 142 },
    ],
    staff_receptionist: [
      { x: -292, y: 106 },
      { x: -282, y: 112 },
      { x: -302, y: 100 },
    ],
    master_somchai: [
      { x: -275, y: 8 },
      { x: -205, y: 38 },
      { x: -255, y: 18 },
    ],
    master_ken: [
      { x: -50, y: -68 },
      { x: -35, y: -38 },
      { x: -65, y: -58 },
    ],
    master_yuki: [
      { x: 185, y: 102 },
      { x: 155, y: 118 },
      { x: 172, y: 88 },
    ],
  };

  public toggleHighlightAll(forceState?: boolean): boolean {
    if (!this.baseLayer) return false;
    const next = typeof forceState === "boolean" ? forceState : !this.baseLayer.highlightAll;
    this.baseLayer.setHighlightAll(next);
    return next;
  }

  constructor() {
    super("DioramaScene");
  }

  create() {
    const { width, height } = this.scale;

    this.worldContainer = this.add.container(width / 2, height / 2);

    // Instantiate 4 Visual Pipeline Layers
    this.baseLayer = new BaseGridLayer(this);
    this.lightLayer = new LightShaderLayer(this, this.baseLayer);
    this.particleLayer = new ParticleLayer(this, this.baseLayer);
    this.hudLayer = new WorldHUDLayer(this, this.baseLayer);

    this.worldContainer.add([
      this.baseLayer.getContainer(),
      this.lightLayer.getContainer(),
      this.particleLayer.getContainer(),
      this.hudLayer.getContainer()
    ]);

    // Sync HUD & Light layers whenever an entity walks or is dragged
    this.baseLayer.onPositionTick = (entityId: string, x: number, y: number) => {
      this.lightLayer.syncEntityPosition(entityId, x, y);
      this.hudLayer.syncEntityPosition(entityId, x, y);
    };

    // Entity Selection
    this.baseLayer.onEntityClick = (entity: Entity) => {
      this.onEntitySelected?.(entity);
    };

    // Persist drag-and-drop & flip changes to Cloud Bridge
    this.baseLayer.onEntityMoved = (entity: Entity, worldX: number, worldY: number, flipX: boolean) => {
      this.onEntityMovedUI?.(entity);
      const gridPos = BaseGridLayer.worldToGrid(worldX, worldY);
      fetch(`http://localhost:8000/api/v1/world/entities/${entity.id}/move`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          world_x: worldX,
          world_y: worldY,
          grid_x: gridPos.x,
          grid_y: gridPos.y,
          flip_x: flipX,
          walk: false
        })
      }).catch(() => {});
    };

    // Create Fullscreen District Map View (Kamphaeng Phet 7 Roi / RCA Alley)
    this.createDistrictView();

    // Camera Pan, Zoom & Double-Click Character Walk
    this.setupPanZoomAndWalk();

    // Subscribe to WebSocket messages
    wsClient.subscribe((msg: WsMessage) => {
      this.handleWsMessage(msg);
    });

    wsClient.connect();

    // Standalone fallback: load default_world.json if bridge is not connected
    this.time.delayedCall(700, () => {
      if (!this.currentWorld) {
        this.loadDefaultWorldFromJson();
      }
    });

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      const cx = gameSize.width / 2;
      const cy = gameSize.height / 2;
      this.worldContainer.setPosition(cx, cy);
      if (this.districtContainer) {
        this.districtContainer.setPosition(cx, cy);
      }
    });

    // 1. Dynamic Onsen Steam (tracks actual position of onsen_tub_01 and onsen_tub_vip)
    this.time.addEvent({
      delay: 1600,
      loop: true,
      callback: () => {
        const onsen1 = this.baseLayer.getEntityPosition("onsen_tub_01") || this.baseLayer.getEntityPosition("onsen_tub");
        if (onsen1) {
          this.particleLayer.spawnSteam(onsen1.x, onsen1.y - 35, 2);
        }
        const onsenVip = this.baseLayer.getEntityPosition("onsen_tub_vip");
        if (onsenVip) {
          this.particleLayer.spawnSteam(onsenVip.x, onsenVip.y - 35, 2);
        }
      }
    });

    // 2. Dynamic Tea Steam (tracks tea_table_01 and vip_tea_table)
    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        const tea1 = this.baseLayer.getEntityPosition("tea_table_01");
        if (tea1) this.particleLayer.spawnTeaSteam(tea1.x, tea1.y - 18);
        const teaVip = this.baseLayer.getEntityPosition("vip_tea_table");
        if (teaVip) this.particleLayer.spawnTeaSteam(teaVip.x, teaVip.y - 18);
      }
    });

    // 3. Autonomous Character Walking Loop (every 3.4s)
    this.time.addEvent({
      delay: 3400,
      loop: true,
      callback: () => {
        if (!this.autoWalkEnabled || this.baseLayer.isDraggingEntity) return;
        this.stepAutonomousCharacters();
      }
    });
  }

  private stepAutonomousCharacters() {
    const entities = this.baseLayer.getEntities();
    const characters = entities.filter(e => e.type === "staff" || e.type === "guest");
    if (characters.length === 0) return;

    // Pick 2 random characters to take a natural step/walk
    const shuffled = Phaser.Utils.Array.Shuffle([...characters]).slice(0, 2);
    for (const char of shuffled) {
      // Don't auto-move the currently selected character if user is inspecting it
      if (char.id === this.baseLayer.selectedEntityId) continue;

      const presetWaypoints = DioramaScene.CHARACTER_WAYPOINTS[char.id];
      if (presetWaypoints && presetWaypoints.length > 0) {
        const nextIdx = ((this.waypointIndices.get(char.id) ?? 0) + 1) % presetWaypoints.length;
        this.waypointIndices.set(char.id, nextIdx);
        const wp = presetWaypoints[nextIdx];
        this.baseLayer.walkEntityTo(char.id, wp.x, wp.y, false);
      } else {
        // Custom spawned character: gentle stroll around current spot
        const cur = this.baseLayer.getEntityPosition(char.id);
        if (cur) {
          const nx = Phaser.Math.Clamp(cur.x + Phaser.Math.Between(-36, 36), -400, 400);
          const ny = Phaser.Math.Clamp(cur.y + Phaser.Math.Between(-24, 24), -170, 210);
          this.baseLayer.walkEntityTo(char.id, nx, ny, false);
        }
      }
    }
  }

  private setupPanZoomAndWalk() {
    let lastClickTime = 0;

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.baseLayer.isDraggingEntity) return;
      const targetTag = (pointer.event.target as HTMLElement)?.tagName;
      if (targetTag !== "CANVAS") return;

      const now = Date.now();
      const isDoubleClick = now - lastClickTime < 300;
      lastClickTime = now;

      // Double-click on floor: if in salon mode and a character is selected, walk them to the clicked floor spot!
      if (this.viewMode === "salon" && isDoubleClick && this.baseLayer.selectedEntityId) {
        const selEnt = this.baseLayer.getEntityById(this.baseLayer.selectedEntityId);
        if (selEnt && (selEnt.type === "staff" || selEnt.type === "guest")) {
          const localX = Math.round((pointer.x - this.worldContainer.x) / this.worldContainer.scaleX);
          const localY = Math.round((pointer.y - this.worldContainer.y) / this.worldContainer.scaleY);
          this.commandCharacterWalk(selEnt.id, localX, localY);
          return;
        }
      }

      const activeCont = this.viewMode === "salon" ? this.worldContainer : this.districtContainer;
      this.isPanningCamera = true;
      this.dragStartX = pointer.x - activeCont.x;
      this.dragStartY = pointer.y - activeCont.y;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.baseLayer.isDraggingEntity) {
        this.isPanningCamera = false;
        return;
      }
      if (this.isPanningCamera && pointer.isDown) {
        const activeCont = this.viewMode === "salon" ? this.worldContainer : this.districtContainer;
        activeCont.x = pointer.x - this.dragStartX;
        activeCont.y = pointer.y - this.dragStartY;
      }
    });

    this.input.on("pointerup", () => {
      this.isPanningCamera = false;
    });

    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: any, _deltaX: number, deltaY: number) => {
      const zoomFactor = deltaY > 0 ? 0.92 : 1.08;
      const activeCont = this.viewMode === "salon" ? this.worldContainer : this.districtContainer;
      const newScale = Phaser.Math.Clamp(activeCont.scale * zoomFactor, 0.55, 2.4);
      this.tweens.add({
        targets: activeCont,
        scale: newScale,
        duration: 90,
        ease: "Linear"
      });
    });
  }

  public commandCharacterWalk(entityId: string, targetX: number, targetY: number) {
    this.baseLayer.walkEntityTo(entityId, targetX, targetY, true);
  }

  public handleWsMessage(msg: WsMessage) {
    switch (msg.type) {
      case "INIT_WORLD":
        this.currentWorld = msg.payload as World;
        this.baseLayer.renderWorldGrid(this.currentWorld);
        this.lightLayer.removeAll();
        this.hudLayer.removeAll();
        this.lightLayer.initAmbientLanterns();

        for (const ent of this.currentWorld.entities || []) {
          if (ent.state?.status === "in_service" && ent.type === "station") {
            this.lightLayer.setLightGlow(ent.id, true);
          }
        }
        break;

      case "ENTITY_PLACED":
        const newEnt = msg.payload as Entity;
        this.baseLayer.addOrUpdateEntity(newEnt, true);
        if (this.currentWorld) {
          this.currentWorld.entities = (this.currentWorld.entities || []).filter((e: Entity) => e.id !== newEnt.id);
          this.currentWorld.entities.push(newEnt);
        }
        break;

      case "ENTITY_REMOVED":
        const removedId = msg.payload.id;
        this.baseLayer.removeEntity(removedId);
        this.lightLayer.setLightGlow(removedId, false);
        this.hudLayer.updateTimer(removedId, 0);
        if (this.currentWorld) {
          this.currentWorld.entities = (this.currentWorld.entities || []).filter((e: Entity) => e.id !== removedId);
        }
        break;

      case "ENTITY_UPDATED":
        const { id, state } = msg.payload;
        const existingEnt = this.baseLayer.getEntityById(id);
        if (existingEnt) {
          existingEnt.state = {
            ...existingEnt.state,
            ...state,
            custom_data: {
              ...(existingEnt.state?.custom_data || {}),
              ...((state as any).custom_data || {})
            }
          };
          const cd = existingEnt.state.custom_data || {};
          if (typeof cd.world_x === "number" && typeof cd.world_y === "number") {
            const curPos = this.baseLayer.getEntityPosition(id);
            if (curPos && (Math.abs(curPos.x - cd.world_x) > 2 || Math.abs(curPos.y - cd.world_y) > 2)) {
              this.baseLayer.walkEntityTo(id, cd.world_x, cd.world_y, false);
            }
          }
        }

        if (state.status === "in_service" && existingEnt?.type === "station") {
          this.lightLayer.setLightGlow(id, true);
        } else if (state.status === "idle") {
          this.lightLayer.setLightGlow(id, false);
        }

        if (state.current_session_seconds_left !== undefined) {
          this.hudLayer.updateTimer(id, state.current_session_seconds_left);
        }
        if (typeof state.stamina === "number" && existingEnt?.type === "staff") {
          this.hudLayer.updateStaminaBar(id, state.stamina);
        }
        break;

      case "METRIC_TICK":
        for (const upd of msg.payload.updates) {
          if (upd.current_session_seconds_left !== undefined) {
            this.hudLayer.updateTimer(upd.id, upd.current_session_seconds_left);
          }
          if (typeof upd.stamina === "number" && upd.id === "master_somchai") {
            this.hudLayer.updateStaminaBar(upd.id, upd.stamina);
          }
        }
        break;

      case "TRIGGER_EFFECT":
        const { entity_id, effect, intensity, duration_ms } = msg.payload;
        if (effect === "coin_fountain") {
          this.particleLayer.triggerCoinFountain(entity_id || "cash_chest_01", intensity || 2.0);
        } else if (effect === "sakura_bloom") {
          this.particleLayer.triggerSakuraBloom(duration_ms || 8000);
        } else if (effect === "irritation_smoke") {
          this.particleLayer.triggerIrritationSmoke(entity_id || "guest_kenji", duration_ms || 5000);
          if (entity_id) this.lightLayer.triggerWarningPulse(entity_id, duration_ms || 5000);
        } else if (effect === "light_glow") {
          soundManager.playZenChime();
          if (entity_id) this.lightLayer.setLightGlow(entity_id, true, 0xffaa33, intensity || 1.5);
        } else if (effect === "tea_bubble") {
          if (entity_id) this.hudLayer.showBubble(entity_id, "bubble_happy");
        } else if (effect === "coffee_bubble") {
          if (entity_id) this.hudLayer.showBubble(entity_id, "icon_coffee");
        }
        break;
    }
  }

  public async loadDefaultWorldFromJson(): Promise<boolean> {
    try {
      const res = await fetch("/assets/default_world.json");
      if (res.ok) {
        const worldData = await res.json();
        this.handleWsMessage({ type: "INIT_WORLD", payload: worldData });
        return true;
      }
    } catch (e) {
      console.warn("Failed to load default_world.json fallback", e);
    }
    return false;
  }

  public resetCamera() {
    const { width, height } = this.scale;
    const activeCont = this.viewMode === "salon" ? this.worldContainer : this.districtContainer;
    this.tweens.add({
      targets: activeCont,
      x: width / 2,
      y: height / 2,
      scale: 1.0,
      duration: 350,
      ease: "Quad.easeOut"
    });
  }

  // 1024x571 Isometric District Map (Kamphaeng Phet 7 Roi / RCA Alley, Bangkok)
  private createDistrictView() {
    const { width, height } = this.scale;
    this.districtContainer = this.add.container(width / 2, height / 2);

    // 1. District Map Base Image (1024x571)
    const mapImg = this.add.image(0, 0, "district_map").setOrigin(0.5, 0.5);
    this.districtContainer.add(mapImg);

    // 2. Interactive Hotspot for Massage Salon (Center: x = 3, y = -70.5)
    const salonContainer = this.add.container(3, -70.5);

    // Animated Pulsing Beacon Ring
    const pulseRing = this.add.graphics();
    pulseRing.lineStyle(2.5, 0xffaa33, 0.95);
    pulseRing.strokeCircle(0, 0, 48);
    this.tweens.add({
      targets: pulseRing,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 1400,
      repeat: -1,
      ease: "Sine.easeOut"
    });
    salonContainer.add(pulseRing);

    // Floating OpenCode Monospace Tag
    const tagBg = this.add.graphics();
    tagBg.fillStyle(0x201d1d, 0.96);
    tagBg.lineStyle(1.5, 0xffaa33, 1.0);
    tagBg.fillRoundedRect(-110, -82, 220, 30, 4);
    tagBg.strokeRoundedRect(-110, -82, 220, 30, 4);
    salonContainer.add(tagBg);

    const tagText = this.add.text(0, -67, "[★] ZEN MASSAGE & SPA", {
      fontSize: "11px",
      fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
      color: "#fdfcfc",
      fontStyle: "bold"
    }).setOrigin(0.5, 0.5);
    salonContainer.add(tagText);

    const hintText = this.add.text(0, -48, "CLICK TO ENTER SALON INTERIOR", {
      fontSize: "9px",
      fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
      color: "#ffaa33",
      backgroundColor: "rgba(32, 29, 29, 0.94)",
      padding: { x: 6, y: 2 },
      fontStyle: "bold"
    }).setOrigin(0.5, 0.5);
    salonContainer.add(hintText);

    this.districtContainer.add(salonContainer);

    // Interactive HitZone over the Massage Salon building
    const hitZone = this.add.zone(3, -70.5, 150, 140);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on("pointerover", () => {
      salonContainer.setScale(1.08);
      hintText.setColor("#30d158");
    });
    hitZone.on("pointerout", () => {
      salonContainer.setScale(1.0);
      hintText.setColor("#ffaa33");
    });
    hitZone.on("pointerdown", () => {
      soundManager.playZenChime();
      this.switchToSalonView(true);
    });
    this.districtContainer.add(hitZone);

    // 3. Other District Landmarks with subtle hover tooltips
    const landmarks = [
      { name: "Bangkok Fitness GYM", status: "42 active members", x: -242, y: 39.5, w: 140, h: 100 },
      { name: "7-Eleven 24/7 Store", status: "Open · Delivery active", x: -22, y: 144.5, w: 110, h: 80 },
      { name: "RCA Cafe & Roastery", status: "Open · 18 guests", x: 68, y: 89.5, w: 100, h: 80 },
      { name: "Maitria Residence & Hotel", status: "180 registered guests", x: 103, y: -105.5, w: 120, h: 110 }
    ];

    for (const lm of landmarks) {
      const z = this.add.zone(lm.x, lm.y, lm.w, lm.h);
      z.setInteractive({ useHandCursor: true });
      const tip = this.add.text(lm.x, lm.y - lm.h / 2 - 8, `[+] ${lm.name}\n${lm.status}`, {
        fontSize: "10px",
        fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
        color: "#fdfcfc",
        backgroundColor: "#201d1d",
        padding: { x: 7, y: 4 },
        align: "center",
        fontStyle: "bold"
      }).setOrigin(0.5, 1).setAlpha(0).setDepth(300);
      this.districtContainer.add(tip);

      z.on("pointerover", () => tip.setAlpha(1));
      z.on("pointerout", () => tip.setAlpha(0));
      this.districtContainer.add(z);
    }

    this.districtContainer.setVisible(false);
    this.districtContainer.setAlpha(0);
  }

  public switchToDistrictView(animate = true) {
    if (this.viewMode === "district") return;
    this.viewMode = "district";
    this.districtContainer.setVisible(true);
    this.districtContainer.setScale(this.worldContainer.scale);
    this.districtContainer.setPosition(this.worldContainer.x, this.worldContainer.y);

    if (animate) {
      this.tweens.add({
        targets: this.worldContainer,
        alpha: 0,
        scale: this.worldContainer.scale * 0.9,
        duration: 260,
        ease: "Cubic.easeInOut",
        onComplete: () => {
          this.worldContainer.setVisible(false);
        }
      });
      this.tweens.add({
        targets: this.districtContainer,
        alpha: 1,
        duration: 280,
        ease: "Cubic.easeInOut"
      });
    } else {
      this.worldContainer.setVisible(false);
      this.worldContainer.setAlpha(0);
      this.districtContainer.setAlpha(1);
    }
    this.onViewModeChanged?.("district");
  }

  public switchToSalonView(animate = true) {
    if (this.viewMode === "salon") return;
    this.viewMode = "salon";
    this.worldContainer.setVisible(true);
    this.worldContainer.setScale(this.districtContainer.scale);
    this.worldContainer.setPosition(this.districtContainer.x, this.districtContainer.y);

    if (animate) {
      this.tweens.add({
        targets: this.districtContainer,
        alpha: 0,
        scale: this.districtContainer.scale * 1.1,
        duration: 260,
        ease: "Cubic.easeInOut",
        onComplete: () => {
          this.districtContainer.setVisible(false);
        }
      });
      this.tweens.add({
        targets: this.worldContainer,
        alpha: 1,
        duration: 280,
        ease: "Cubic.easeInOut"
      });
    } else {
      this.districtContainer.setVisible(false);
      this.districtContainer.setAlpha(0);
      this.worldContainer.setAlpha(1);
    }
    this.onViewModeChanged?.("salon");
  }

  public toggleViewMode() {
    if (this.viewMode === "salon") {
      this.switchToDistrictView(true);
    } else {
      this.switchToSalonView(true);
    }
  }

  public canvasPointToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const localX = (screenX - this.worldContainer.x) / this.worldContainer.scaleX;
    const localY = (screenY - this.worldContainer.y) / this.worldContainer.scaleY;
    return { x: Math.round(localX), y: Math.round(localY) };
  }

  public showDragGhost(clientX: number, clientY: number, footprint = "1x1") {
    if (this.viewMode !== "salon" || !this.baseLayer) return;
    const worldPos = this.canvasPointToWorld(clientX, clientY);
    this.baseLayer.showSnapReticle(worldPos.x, worldPos.y, footprint);
  }

  public hideDragGhost() {
    this.baseLayer?.hideSnapReticle();
  }

  public spawnConstructionEntity(
    assetType: string,
    label: string,
    footprint = "1x1",
    clientX?: number,
    clientY?: number,
    durationMs = 4500
  ): Promise<Entity> {
    return new Promise((resolve) => {
      let worldPos: { x: number; y: number };
      if (typeof clientX === "number" && typeof clientY === "number") {
        worldPos = this.canvasPointToWorld(clientX, clientY);
      } else {
        // Natural placement location inside onsen bath wing or garden deck
        const defaultSpots: Array<{ x: number; y: number }> = [
          { x: 230, y: -25 },
          { x: 170, y: -45 },
          { x: -140, y: 140 },
          { x: -50, y: 75 }
        ];
        worldPos = defaultSpots[Math.floor(Math.random() * defaultSpots.length)];
      }

      const entityId = `entity_${assetType}_${Date.now().toString(36)}`;

      this.baseLayer.startConstruction(
        entityId,
        assetType,
        worldPos.x,
        worldPos.y,
        footprint,
        label,
        durationMs,
        () => {
          const createdEntity: Entity = {
            id: entityId,
            name: label,
            type: "station",
            asset_type: assetType,
            grid_position: BaseGridLayer.worldToGrid(worldPos.x, worldPos.y),
            footprint: {
              w: footprint === "2x2" ? 2 : (footprint === "2x1" ? 2 : 1),
              h: footprint === "2x2" ? 2 : 1
            },
            state: {
              status: "idle",
              stamina: 100,
              current_session_seconds_left: 0,
              total_session_seconds: 0,
              wait_duration_seconds: 0,
              custom_data: {
                world_x: worldPos.x,
                world_y: worldPos.y,
                footprint,
                is_ai_generated: true
              }
            }
          };

          soundManager.playAction("tap");
          resolve(createdEntity);
        }
      );
    });
  }
}
