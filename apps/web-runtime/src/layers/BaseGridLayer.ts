import Phaser from "phaser";
import { Entity, World } from "@spatialtwin/core-schema";
import { SalonNavPhysics, Point2D } from "../services/SalonNavPhysics";

export interface StationPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class BaseGridLayer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private masterDiorama!: Phaser.GameObjects.Image;
  private entityContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private entitySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private entityContours: Map<string, Phaser.GameObjects.Container> = new Map();
  private entityDataMap: Map<string, Entity> = new Map();
  private entityPositions: Map<string, { x: number; y: number }> = new Map();
  private walkTweens: Map<string, Phaser.Tweens.Tween> = new Map();
  private stepTweens: Map<string, Phaser.Tweens.Tween> = new Map();
  private hoveredEntityId: string | null = null;
  private snapReticle!: Phaser.GameObjects.Graphics;

  public selectedEntityId: string | null = null;
  public isDraggingEntity = false;
  public highlightAll = false;

  public onEntityClick?: (entity: Entity) => void;
  public onEntityMoved?: (entity: Entity, worldX: number, worldY: number, flipX: boolean) => void;
  public onPositionTick?: (entityId: string, x: number, y: number) => void;

  // Calibrated fallback landmark positions matching the user-locked default layout
  public static readonly LANDMARKS: Record<string, StationPos> = {
    wall_room1_front: { x: -155, y: 50, w: 150, h: 160 },
    wall_room2_front: { x: -8, y: -25, w: 150, h: 160 },
    wall_room1_room2_div: { x: -148, y: -22, w: 145, h: 155 },
    wall_reception_div: { x: -374, y: 116, w: 148, h: 175 },
    wall_onsen_front: { x: 232, y: -42, w: 142, h: 155 },
    wall_room4_back: { x: 18, y: 84, w: 150, h: 160 },
    wall_room4_front: { x: 28, y: 152, w: 148, h: 160 },
    wall_vip_lounge_div: { x: 378, y: 38, w: 140, h: 175 },
    reception_counter: { x: -355, y: 95, w: 120, h: 110 },
    cash_chest_01: { x: -276, y: 158, w: 48, h: 44 },
    bamboo_pot_01: { x: -63, y: 239, w: 50, h: 120 },
    lounge_sofa_01: { x: -195, y: 188, w: 85, h: 95 },
    lounge_chair_01: { x: -55, y: 185, w: 85, h: 95 },
    tea_table_01: { x: -155, y: 172, w: 58, h: 46 },
    bamboo_pot_02: { x: 375, y: -18, w: 55, h: 120 },
    massage_bed_01: { x: -235, y: 22, w: 145, h: 115 },
    aroma_burner_01: { x: -325, y: 28, w: 40, h: 46 },
    massage_bed_02: { x: -85, y: -52, w: 145, h: 115 },
    aroma_burner_02: { x: -135, y: -82, w: 46, h: 45 },
    onsen_tub_01: { x: 180, y: -68, w: 180, h: 130 },
    onsen_tub: { x: 180, y: -68, w: 180, h: 130 },
    vip_chair_01: { x: 295, y: -12, w: 105, h: 105 },
    massage_bed_03: { x: 122, y: 136, w: 145, h: 118 },
    massage_bed_04: { x: 122, y: 136, w: 145, h: 118 },
    staff_receptionist: { x: -292, y: 106, w: 40, h: 70 },
    master_somchai: { x: -275, y: 8, w: 40, h: 70 },
    master_ken: { x: -50, y: -68, w: 40, h: 70 },
    master_yuki: { x: 185, y: 102, w: 40, h: 70 },
    guest_customer: { x: -275, y: 148, w: 40, h: 70 },
    guest_kenji: { x: -65, y: 85, w: 40, h: 70 },
    guest_yukata: { x: 35, y: 8, w: 40, h: 70 },
    guest_onsen: { x: 135, y: -52, w: 40, h: 70 },
    onsen_tub_vip: { x: 180, y: -68, w: 180, h: 130 },
  };

  private static readonly ASSET_SCALES: Record<string, number> = {
    wall_shoji_door_left: 0.82,
    wall_shoji_sakura_left: 0.76,
    wall_plaster_lantern_left: 0.78,
    wall_shoji_front_right: 0.80,
    wall_divider_scroll_right: 0.74,
    wall_reception_window_right: 0.80,
    shoji_screen: 0.68,
    shoji_screen_01: 0.68,
    shoji_screen_02: 0.68,
    massage_bed_wood: 0.72,
    massage_bed_wood_left: 0.72,
    massage_bed_wood_right: 0.72,
    onsen_tub: 0.76,
    reception_desk: 0.74,
    sofa_armchair: 0.72,
    sofa_armchair_cream: 0.72,
    armchair_cream: 0.68,
    armchair_purple: 0.72,
    armchair_purple_01: 0.72,
    armchair_purple_02: 0.72,
    tea_table: 0.72,
    tea_table_wood: 0.72,
    tea_table_dark: 0.72,
    aroma_burner: 0.62,
    aroma_burner_01: 0.62,
    aroma_burner_02: 0.62,
    bamboo_plant: 0.68,
    bamboo_plant_01: 0.68,
    bamboo_plant_02: 0.68,
    cash_chest: 0.68,
    cedar_tub: 0.76,
    cedar_tub_pixel: 0.76,
    char_receptionist: 0.86,
    char_masseuse_room1: 0.85,
    char_masseur_room2: 0.85,
    char_masseuse_room4: 0.85,
    char_guest_kenji: 0.85,
    char_customer_pink: 0.85,
    char_guest_yukata: 0.85,
    char_guest_relaxing: 0.85,
    staff_master: 0.85,
    guest_avatar: 0.85,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = this.scene.add.container(0, 0);
    this.snapReticle = this.scene.add.graphics();
    this.snapReticle.setVisible(false);
    this.snapReticle.setDepth(20000);
    this.container.add(this.snapReticle);
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  public getEntities(): Entity[] {
    return Array.from(this.entityDataMap.values());
  }

  public getEntityById(id: string): Entity | undefined {
    return this.entityDataMap.get(id);
  }

  public static isWallAsset(assetType: string, entity?: Entity): boolean {
    if (entity?.state?.custom_data?.is_wall) return true;
    const stripped = (assetType || "").replace(/\.png$/, "");
    return stripped.startsWith("wall_") || stripped.startsWith("shoji_screen");
  }

  // Returns isometric floor line slope dy/dx for a modular wall sprite
  private getWallSlope(entity: Entity, flipX: boolean): number {
    const stripped = (entity.asset_type || "").replace(/\.png$/, "");
    // wall_shoji_front_right is natively '\' slope (+0.46); all other wall_* are natively '/' slope (-0.46)
    const basePositive = stripped === "wall_shoji_front_right";
    const isPositive = flipX ? !basePositive : basePositive;
    return isPositive ? 0.46 : -0.46;
  }

  public static worldToGrid(wx: number, wy: number): { x: number; y: number } {
    const gx = Math.max(0, Math.min(15, Math.round((wx + 420) / 52)));
    const gy = Math.max(0, Math.min(11, Math.round((wy + 180) / 36)));
    return { x: gx, y: gy };
  }

  public static gridToWorld(gx: number, gy: number): { x: number; y: number } {
    const halfW = 36;
    const halfH = 18;
    return {
      x: (gx - gy) * halfW - 40,
      y: (gx + gy) * halfH - 130
    };
  }

  // Module 1 & 3: Snap-to-Grid Reticle Preview
  public showSnapReticle(worldX: number, worldY: number, footprint = "2x2") {
    this.snapReticle.clear();
    this.snapReticle.setVisible(true);

    const gridPos = BaseGridLayer.worldToGrid(worldX, worldY);
    const snapWorld = BaseGridLayer.gridToWorld(gridPos.x, gridPos.y);

    const isDouble = footprint === "2x2" || footprint === "2x1";
    const halfW = isDouble ? 48 : 32;
    const halfH = isDouble ? 24 : 16;

    // Semi-transparent isometric diamond fill & glowing dashed border
    this.snapReticle.fillStyle(0x007aff, 0.22);
    this.snapReticle.beginPath();
    this.snapReticle.moveTo(snapWorld.x, snapWorld.y - halfH);
    this.snapReticle.lineTo(snapWorld.x + halfW, snapWorld.y);
    this.snapReticle.lineTo(snapWorld.x, snapWorld.y + halfH);
    this.snapReticle.lineTo(snapWorld.x - halfW, snapWorld.y);
    this.snapReticle.closePath();
    this.snapReticle.fillPath();

    this.snapReticle.lineStyle(2, 0x007aff, 0.95);
    this.snapReticle.strokePath();
  }

  public hideSnapReticle() {
    this.snapReticle.clear();
    this.snapReticle.setVisible(false);
  }

  // Module 3: Real-Time In-Canvas Construction State (Graceful Fallback + Hot-Reload)
  public startConstruction(
    entityId: string,
    assetType: string,
    worldX: number,
    worldY: number,
    footprint: string,
    label: string,
    durationMs = 3800,
    onComplete?: () => void
  ) {
    const gridPos = BaseGridLayer.worldToGrid(worldX, worldY);
    const snapWorld = BaseGridLayer.gridToWorld(gridPos.x, gridPos.y);

    // 1. Create Scaffold & Blueprint Container
    const constContainer = this.scene.add.container(snapWorld.x, snapWorld.y);
    constContainer.setDepth(15000);

    const halfW = footprint === "2x2" ? 48 : 36;
    const halfH = footprint === "2x2" ? 24 : 18;

    // Blueprint floor wireframe
    const bp = this.scene.add.graphics();
    bp.fillStyle(0x007aff, 0.28);
    bp.beginPath();
    bp.moveTo(0, -halfH);
    bp.lineTo(halfW, 0);
    bp.lineTo(0, halfH);
    bp.lineTo(-halfW, 0);
    bp.closePath();
    bp.fillPath();

    bp.lineStyle(2, 0x007aff, 0.9);
    bp.strokePath();
    constContainer.add(bp);

    // Wooden scaffolding framing
    const scaffold = this.scene.add.graphics();
    scaffold.lineStyle(2.5, 0xb45309, 0.95);
    // Vertical wooden corner posts
    scaffold.lineBetween(-halfW + 4, 0, -halfW + 4, -40);
    scaffold.lineBetween(halfW - 4, 0, halfW - 4, -40);
    scaffold.lineBetween(0, halfH - 2, 0, -40 + halfH);
    scaffold.lineBetween(0, -halfH + 2, 0, -56);
    // Cross bracing
    scaffold.lineStyle(1.5, 0xd97706, 0.85);
    scaffold.lineBetween(-halfW + 4, -10, halfW - 4, -35);
    scaffold.lineBetween(-halfW + 4, -35, halfW - 4, -10);
    constContainer.add(scaffold);

    // Semi-transparent silhouette of target sprite
    let ghostSprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
    const effectiveTex = this.scene.textures.exists(assetType)
      ? assetType
      : (assetType === "cedar_tub" && this.scene.textures.exists("cedar_tub_pixel"))
        ? "cedar_tub_pixel"
        : null;

    if (effectiveTex) {
      ghostSprite = this.scene.add.image(0, -18, effectiveTex);
    } else {
      const resolvedFrame = this.resolveAtlasFrame(assetType);
      ghostSprite = this.scene.add.sprite(0, -18, "spa_atlas", resolvedFrame);
    }
    ghostSprite.setAlpha(0.45);
    ghostSprite.setTint(0x60a5fa);
    constContainer.add(ghostSprite);

    // Floating monospace construction badge
    const tagBg = this.scene.add.graphics();
    tagBg.fillStyle(0x201d1d, 0.95);
    tagBg.lineStyle(1, 0xffaa33, 1);
    tagBg.fillRoundedRect(-75, -68, 150, 20, 2);
    tagBg.strokeRoundedRect(-75, -68, 150, 20, 2);
    constContainer.add(tagBg);

    const tagText = this.scene.add.text(0, -58, `[BUILDING: ${Math.round(durationMs / 1000)}s]`, {
      fontSize: "9px",
      fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
      color: "#ffaa33",
      fontStyle: "bold"
    }).setOrigin(0.5);
    constContainer.add(tagText);

    this.container.add(constContainer);

    // Continuous construction sawdust emission
    const dustTimer = this.scene.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        (this.scene as any).particleLayer?.spawnConstructionDust(snapWorld.x, snapWorld.y, 2);
      }
    });

    // Countdown timer updates
    let remaining = durationMs;
    const countTimer = this.scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        remaining -= 500;
        const sec = Math.max(0, remaining / 1000).toFixed(1);
        tagText.setText(`[BUILDING: ${sec}s]`);
      }
    });

    // Seamless hot-reload texture replacement upon completion
    this.scene.time.delayedCall(durationMs, () => {
      dustTimer.remove();
      countTimer.remove();

      // Trigger completion particle burst & audio
      (this.scene as any).particleLayer?.triggerConstructionComplete(snapWorld.x, snapWorld.y);

      // Dismiss scaffold with scale-fade
      this.scene.tweens.add({
        targets: constContainer,
        alpha: 0,
        scale: 1.15,
        duration: 250,
        ease: "Quad.easeOut",
        onComplete: () => {
          constContainer.destroy();
        }
      });

      // Spawn finalized entity into world
      const newEntity: Entity = {
        id: entityId,
        name: label,
        type: "station",
        asset_type: assetType,
        grid_position: { x: gridPos.x, y: gridPos.y },
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
            world_x: snapWorld.x,
            world_y: snapWorld.y,
            footprint,
            is_ai_generated: true
          }
        }
      };

      this.addOrUpdateEntity(newEntity, true);
      this.recomputeAllDepths();

      onComplete?.();
    });
  }

  private resolveAtlasFrame(assetType: string): string {
    const atlas = this.scene.textures.get("spa_atlas");
    if (!atlas) return assetType;
    if (atlas.has(assetType)) return assetType;
    if (atlas.has(assetType + ".png")) return assetType + ".png";
    const stripped = assetType.replace(/\.png$/, "");
    if (atlas.has(stripped)) return stripped;
    const fallbacks: Record<string, string> = {
      massage_bed_wood: "massage_bed_wood_left",
      sofa_armchair: "sofa_armchair_cream",
      tea_table: "tea_table_wood",
      bamboo_plant: "bamboo_plant_01",
      staff_master: "char_masseuse_room1",
      guest_avatar: "char_guest_kenji",
    };
    const fb = fallbacks[stripped];
    if (fb && atlas.has(fb)) return fb;
    return "armchair_cream";
  }

  public renderWorldGrid(world: World) {
    for (const tw of this.walkTweens.values()) tw.stop();
    for (const st of this.stepTweens.values()) st.stop();
    this.walkTweens.clear();
    this.stepTweens.clear();

    this.container.removeAll(true);
    this.entityContainers.clear();
    this.entitySprites.clear();
    this.entityContours.clear();
    this.entityDataMap.clear();
    this.entityPositions.clear();

    // 1. Clean Open-Floor 2.5D Isometric Architectural Stage
    this.masterDiorama = this.scene.add.image(0, 0, "diorama_master");
    this.masterDiorama.setOrigin(0.5, 0.5);
    this.masterDiorama.setDepth(5);
    this.container.add(this.masterDiorama);

    // 2. Render all modular walls, furniture & characters
    for (const ent of world.entities || []) {
      this.addOrUpdateEntity(ent as Entity, false);
    }

    this.recomputeAllDepths();
  }

  private computeEntityCoords(entity: Entity): { x: number; y: number } {
    const cd = entity.state?.custom_data || {};
    if (typeof cd.world_x === "number" && typeof cd.world_y === "number") {
      return { x: cd.world_x, y: cd.world_y };
    }
    const landmark = BaseGridLayer.LANDMARKS[entity.id];
    if (landmark) {
      return { x: landmark.x, y: landmark.y };
    }
    const gridPos = BaseGridLayer.gridToWorld(entity.grid_position.x, entity.grid_position.y);
    if (BaseGridLayer.isWallAsset(entity.asset_type, entity)) {
      return gridPos;
    }
    const clamped = SalonNavPhysics.clampToFloor(gridPos.x, gridPos.y);
    return { x: clamped.x, y: clamped.y };
  }

  // Recomputes 2.5D isometric depths so diagonal modular walls partially occlude objects physically behind them
  public recomputeAllDepths() {
    const wallEntries: Array<{ id: string; x: number; y: number; slope: number }> = [];

    for (const [id, ent] of this.entityDataMap.entries()) {
      if (BaseGridLayer.isWallAsset(ent.asset_type, ent)) {
        const pos = this.entityPositions.get(id);
        const spr = this.entitySprites.get(id);
        if (pos) {
          wallEntries.push({
            id,
            x: pos.x,
            y: pos.y,
            slope: this.getWallSlope(ent, Boolean(spr?.flipX))
          });
        }
      }
    }

    for (const [id, cont] of this.entityContainers.entries()) {
      const ent = this.entityDataMap.get(id);
      const pos = this.entityPositions.get(id);
      if (!ent || !pos) continue;

      if (BaseGridLayer.isWallAsset(ent.asset_type, ent)) {
        cont.setDepth(100 + pos.y);
      } else {
        let effY = pos.y;
        for (const w of wallEntries) {
          const dx = pos.x - w.x;
          if (Math.abs(dx) < 82) {
            const yWallAtEntityX = w.y + w.slope * dx;
            const delta = pos.y - yWallAtEntityX;
            if (Math.abs(delta) < 95) {
              if (delta < 0) {
                // Entity is physically behind this diagonal wall -> ensure entity depth < wall depth
                effY = Math.min(effY, w.y + delta - 2);
              } else {
                // Entity is physically in front of this diagonal wall -> ensure entity depth > wall depth
                effY = Math.max(effY, w.y + delta + 2);
              }
            }
          }
        }
        cont.setDepth(100 + effY);
      }
    }

    this.container.sort("depth");
  }

  private setContourFlipX(entityId: string, flipX: boolean) {
    const contourCont = this.entityContours.get(entityId);
    if (!contourCont) return;
    for (const child of contourCont.list) {
      if (child instanceof Phaser.GameObjects.Sprite) {
        child.setFlipX(flipX);
      }
    }
  }

  private setContourTint(entityId: string, color: number) {
    const contourCont = this.entityContours.get(entityId);
    if (!contourCont) return;
    for (const child of contourCont.list) {
      if (child instanceof Phaser.GameObjects.Sprite) {
        child.setTintFill(color);
      }
    }
  }

  private refreshContourVisibility(entityId: string, isActivelyDragging = false) {
    const contourCont = this.entityContours.get(entityId);
    if (!contourCont) return;

    const isSelected = this.selectedEntityId === entityId;
    const isHovered = this.hoveredEntityId === entityId;
    const shouldShow = isActivelyDragging || isSelected || isHovered || this.highlightAll;

    contourCont.setVisible(shouldShow);
    if (shouldShow) {
      const color = isActivelyDragging ? 0x34d399 : (isSelected || isHovered ? 0xffb03b : 0xf59e0b);
      this.setContourTint(entityId, color);
      contourCont.setAlpha(isActivelyDragging || isSelected || isHovered ? 0.98 : 0.85);
    }
  }

  public setHighlightAll(enabled: boolean) {
    this.highlightAll = enabled;
    for (const id of this.entityContours.keys()) {
      this.refreshContourVisibility(id, false);
    }
  }

  public addOrUpdateEntity(entity: Entity, animatePop = true) {
    const existingCont = this.entityContainers.get(entity.id);
    const coords = this.computeEntityCoords(entity);
    const cd = entity.state?.custom_data || {};
    const flipX = Boolean(cd.flip_x);

    if (existingCont) {
      this.entityDataMap.set(entity.id, entity);
      const spr = this.entitySprites.get(entity.id);
      if (spr && cd.flip_x !== undefined) {
        spr.setFlipX(flipX);
        this.setContourFlipX(entity.id, flipX);
      }
      const prevPos = this.entityPositions.get(entity.id);
      if (prevPos && (Math.abs(prevPos.x - coords.x) > 2 || Math.abs(prevPos.y - coords.y) > 2)) {
        this.walkEntityTo(entity.id, coords.x, coords.y, false);
      } else {
        this.recomputeAllDepths();
      }
      return;
    }

    this.entityDataMap.set(entity.id, entity);
    this.entityPositions.set(entity.id, { x: coords.x, y: coords.y });

    const isCharacter = entity.type === "staff" || entity.type === "guest";
    const isWall = BaseGridLayer.isWallAsset(entity.asset_type, entity);
    const effectiveStandalone = this.scene.textures.exists(entity.asset_type)
      ? entity.asset_type
      : (entity.asset_type === "cedar_tub" && this.scene.textures.exists("cedar_tub_pixel"))
        ? "cedar_tub_pixel"
        : null;
    const frame = effectiveStandalone ? "" : this.resolveAtlasFrame(entity.asset_type);
    const baseScale = BaseGridLayer.ASSET_SCALES[frame] || BaseGridLayer.ASSET_SCALES[entity.asset_type] || 0.72;
    const originY = isWall ? 0.80 : 0.88;

    const entContainer = this.scene.add.container(coords.x, coords.y);

    // 1. Pixel-Art Silhouette Contour Outline (NO round floor shadow, NO unfocused selection ellipse!)
    const contourCont = this.scene.add.container(0, 0);
    const offsets: Array<[number, number]> = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
      [-1.5, -1.5],
      [1.5, -1.5],
      [-1.5, 1.5],
      [1.5, 1.5],
    ];
    for (const [ox, oy] of offsets) {
      const outlineSpr = effectiveStandalone
        ? this.scene.add.sprite(ox, oy, effectiveStandalone)
        : this.scene.add.sprite(ox, oy, "spa_atlas", frame);
      outlineSpr.setOrigin(0.5, originY);
      outlineSpr.setScale(baseScale);
      outlineSpr.setFlipX(flipX);
      outlineSpr.setTintFill(0xffb03b);
      contourCont.add(outlineSpr);
    }
    contourCont.setVisible(false);
    entContainer.add(contourCont);
    this.entityContours.set(entity.id, contourCont);

    // 2. Main Pixel Art Sprite from Atlas or Standalone
    const spr = effectiveStandalone
      ? this.scene.add.sprite(0, 0, effectiveStandalone)
      : this.scene.add.sprite(0, 0, "spa_atlas", frame);
    spr.setOrigin(0.5, originY);
    spr.setScale(baseScale);
    spr.setFlipX(flipX);
    entContainer.add(spr);
    this.entitySprites.set(entity.id, spr);

    // 3. Floating tooltip label (shown on hover / drag)
    const dragLabel = this.scene.add.text(0, -spr.displayHeight * originY - 12, `[${entity.name || entity.id}]`, {
      fontSize: "11px",
      fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
      color: "#fdfcfc",
      backgroundColor: "#201d1d",
      padding: { x: 8, y: 4 },
      fontStyle: "bold"
    }).setOrigin(0.5, 0.5).setAlpha(0).setName("drag_label");
    entContainer.add(dragLabel);

    // 4. Subtle Character Idle Breathing
    if (isCharacter) {
      this.scene.tweens.add({
        targets: [spr, ...contourCont.list],
        scaleY: { from: baseScale, to: baseScale * 1.03 },
        scaleX: { from: baseScale, to: baseScale * 0.988 },
        duration: 1300 + Math.random() * 350,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }

    // 5. Pop-in spawn animation
    if (animatePop) {
      entContainer.setScale(0.1);
      this.scene.tweens.add({
        targets: entContainer,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: "Back.easeOut"
      });
    }

    // 6. Interactive Hit Area + Drag-and-Drop
    const hitW = Math.max(36, Math.round(spr.displayWidth * 0.88));
    const hitH = Math.max(40, Math.round(spr.displayHeight * 0.88));
    const hitZone = this.scene.add.zone(0, -hitH * 0.42, hitW, hitH);
    hitZone.setInteractive({ useHandCursor: true, draggable: true });
    entContainer.add(hitZone);

    let dragMovedDistance = 0;
    let startX = coords.x;
    let startY = coords.y;

    hitZone.on("pointerover", () => {
      if (!this.isDraggingEntity) {
        this.hoveredEntityId = entity.id;
        this.refreshContourVisibility(entity.id, false);
        dragLabel.setAlpha(0.96);
      }
    });

    hitZone.on("pointerout", () => {
      if (this.hoveredEntityId === entity.id) {
        this.hoveredEntityId = null;
      }
      if (!this.isDraggingEntity) {
        this.refreshContourVisibility(entity.id, false);
        dragLabel.setAlpha(0);
      }
    });

    hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      dragMovedDistance = 0;
      startX = entContainer.x;
      startY = entContainer.y;
      this.selectEntity(entity.id);
      const latest = this.entityDataMap.get(entity.id) || entity;
      this.onEntityClick?.(latest);
      if (pointer.rightButtonDown()) {
        this.flipEntity(entity.id);
      }
    });

    hitZone.on("dragstart", () => {
      this.isDraggingEntity = true;
      this.stopWalk(entity.id);
      this.refreshContourVisibility(entity.id, true);
      dragLabel.setAlpha(1);
      spr.setY(-4);
      contourCont.setY(-4);
    });

    hitZone.on("drag", (pointer: Phaser.Input.Pointer) => {
      const parentCont = this.container.parentContainer;
      let localX = entContainer.x;
      let localY = entContainer.y;
      if (parentCont) {
        localX = (pointer.x - parentCont.x) / parentCont.scaleX;
        localY = (pointer.y - parentCont.y) / parentCont.scaleY;
      }

      let snappedX = Phaser.Math.Clamp(Math.round(localX / 2) * 2, -445, 425);
      let snappedY = Phaser.Math.Clamp(Math.round(localY / 2) * 2, -165, 250);

      // Keep furniture and characters strictly on walkable floor (never floating on outer walls)
      if (!isWall) {
        const clamped = SalonNavPhysics.clampToFloor(snappedX, snappedY);
        snappedX = clamped.x;
        snappedY = clamped.y;
      }

      dragMovedDistance += Math.hypot(snappedX - entContainer.x, snappedY - entContainer.y);

      entContainer.setPosition(snappedX, snappedY);
      this.entityPositions.set(entity.id, { x: snappedX, y: snappedY });
      this.recomputeAllDepths();
      dragLabel.setText(`[${entity.name || entity.id}] (${snappedX}, ${snappedY})`);

      this.onPositionTick?.(entity.id, snappedX, snappedY);
    });

    hitZone.on("dragend", () => {
      this.isDraggingEntity = false;
      spr.setY(0);
      contourCont.setY(0);
      this.refreshContourVisibility(entity.id, false);
      dragLabel.setText(`[${entity.name || entity.id}]`);
      dragLabel.setAlpha(0);

      const finalX = entContainer.x;
      const finalY = entContainer.y;
      this.recomputeAllDepths();

      if (dragMovedDistance > 3 || Math.hypot(finalX - startX, finalY - startY) > 2) {
        const latest = this.entityDataMap.get(entity.id) || entity;
        const gridPos = BaseGridLayer.worldToGrid(finalX, finalY);
        latest.grid_position = gridPos;
        latest.state = latest.state || ({} as any);
        latest.state.custom_data = {
          ...(latest.state.custom_data || {}),
          world_x: finalX,
          world_y: finalY,
          flip_x: spr.flipX
        };
        this.entityDataMap.set(entity.id, latest);
        this.onEntityMoved?.(latest, finalX, finalY, spr.flipX);
        this.onEntityClick?.(latest);
      }
    });

    this.container.add(entContainer);
    this.entityContainers.set(entity.id, entContainer);
    this.refreshContourVisibility(entity.id, false);
    this.recomputeAllDepths();
  }

  public selectEntity(id: string | null) {
    const prevId = this.selectedEntityId;
    this.selectedEntityId = id;
    if (prevId && prevId !== id) {
      this.refreshContourVisibility(prevId, false);
    }
    if (id) {
      this.refreshContourVisibility(id, false);
    }
  }

  public flipEntity(id: string): boolean {
    const spr = this.entitySprites.get(id);
    const ent = this.entityDataMap.get(id);
    const pos = this.entityPositions.get(id);
    if (!spr || !ent || !pos) return false;

    const newFlip = !spr.flipX;
    spr.setFlipX(newFlip);
    this.setContourFlipX(id, newFlip);
    this.recomputeAllDepths();

    ent.state = ent.state || ({} as any);
    ent.state.custom_data = {
      ...(ent.state.custom_data || {}),
      world_x: pos.x,
      world_y: pos.y,
      flip_x: newFlip
    };
    this.onEntityMoved?.(ent, pos.x, pos.y, newFlip);
    return newFlip;
  }

  private stopWalk(id: string) {
    const wt = this.walkTweens.get(id);
    if (wt) {
      wt.stop();
      this.walkTweens.delete(id);
    }
    const st = this.stepTweens.get(id);
    if (st) {
      st.stop();
      this.stepTweens.delete(id);
    }
    const spr = this.entitySprites.get(id);
    if (spr) {
      spr.setY(0);
      spr.setAngle(0);
    }
    const contourCont = this.entityContours.get(id);
    if (contourCont) {
      contourCont.setY(0);
      contourCont.setAngle(0);
    }
  }

  // Smooth 2.5D Isometric Walking along Corridor & Doorway Navigation Graph (never walks through walls!)
  public walkEntityTo(id: string, targetX: number, targetY: number, persistToBackend = false) {
    const cont = this.entityContainers.get(id);
    const spr = this.entitySprites.get(id);
    const ent = this.entityDataMap.get(id);
    if (!cont || !spr || !ent) return;

    const isCharacter = ent.type === "staff" || ent.type === "guest";
    const isWall = BaseGridLayer.isWallAsset(ent.asset_type, ent);

    if (isCharacter) {
      const waypoints = SalonNavPhysics.findSalonPath(cont.x, cont.y, targetX, targetY);
      this.walkWaypoints(id, waypoints, persistToBackend);
      return;
    }

    const finalTarget = isWall ? { x: targetX, y: targetY } : SalonNavPhysics.clampToFloor(targetX, targetY);
    this.walkWaypoints(id, [{ x: finalTarget.x, y: finalTarget.y }], persistToBackend);
  }

  private walkWaypoints(id: string, waypoints: Point2D[], persistToBackend: boolean) {
    const cont = this.entityContainers.get(id);
    const spr = this.entitySprites.get(id);
    const contourCont = this.entityContours.get(id);
    const ent = this.entityDataMap.get(id);
    if (!cont || !spr || !ent || waypoints.length === 0) return;

    this.stopWalk(id);

    const isCharacter = ent.type === "staff" || ent.type === "guest";
    if (isCharacter) {
      const stepTargets = contourCont ? [spr, contourCont] : [spr];
      const stepTween = this.scene.tweens.add({
        targets: stepTargets,
        y: { from: 0, to: -5 },
        angle: { from: -3, to: 3 },
        duration: 145,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.stepTweens.set(id, stepTween);
    }

    const runNextSegment = (index: number) => {
      if (index >= waypoints.length) {
        this.stopWalk(id);
        const finalX = Math.round(cont.x);
        const finalY = Math.round(cont.y);
        this.entityPositions.set(id, { x: finalX, y: finalY });
        this.recomputeAllDepths();
        this.onPositionTick?.(id, finalX, finalY);

        ent.grid_position = BaseGridLayer.worldToGrid(finalX, finalY);
        ent.state = ent.state || ({} as any);
        ent.state.custom_data = {
          ...(ent.state.custom_data || {}),
          world_x: finalX,
          world_y: finalY,
          flip_x: spr.flipX
        };
        if (persistToBackend) {
          this.onEntityMoved?.(ent, finalX, finalY, spr.flipX);
        }
        return;
      }

      const wp = waypoints[index];
      const dx = wp.x - cont.x;
      const dy = wp.y - cont.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 2) {
        runNextSegment(index + 1);
        return;
      }

      if (Math.abs(dx) > 3) {
        const f = dx < 0;
        spr.setFlipX(f);
        this.setContourFlipX(id, f);
      }

      const speedPxPerSec = isCharacter ? 82 : 220;
      const duration = Phaser.Math.Clamp((dist / speedPxPerSec) * 1000, 180, 2600);

      const segTween = this.scene.tweens.add({
        targets: cont,
        x: wp.x,
        y: wp.y,
        duration,
        ease: isCharacter ? "Linear" : "Cubic.easeOut",
        onUpdate: () => {
          const cx = Math.round(cont.x);
          const cy = Math.round(cont.y);
          this.entityPositions.set(id, { x: cx, y: cy });
          this.recomputeAllDepths();
          this.onPositionTick?.(id, cx, cy);
        },
        onComplete: () => {
          runNextSegment(index + 1);
        }
      });

      this.walkTweens.set(id, segTween);
    };

    runNextSegment(0);
  }

  public removeEntity(id: string) {
    this.stopWalk(id);
    if (this.selectedEntityId === id) {
      this.selectedEntityId = null;
    }
    if (this.hoveredEntityId === id) {
      this.hoveredEntityId = null;
    }
    const obj = this.entityContainers.get(id);
    if (obj) {
      this.scene.tweens.add({
        targets: obj,
        alpha: 0,
        scaleX: 0.15,
        scaleY: 0.15,
        duration: 220,
        ease: "Back.easeIn",
        onComplete: () => {
          obj.destroy();
          this.entityContainers.delete(id);
          this.entitySprites.delete(id);
          this.entityContours.delete(id);
          this.entityDataMap.delete(id);
          this.entityPositions.delete(id);
          this.recomputeAllDepths();
        }
      });
    }
  }

  public getEntityPosition(id: string): { x: number; y: number } | undefined {
    return this.entityPositions.get(id);
  }
}
