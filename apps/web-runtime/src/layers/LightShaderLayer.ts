import Phaser from "phaser";
import { BaseGridLayer } from "./BaseGridLayer.js";

export class LightShaderLayer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private baseLayer: BaseGridLayer;
  private activeGlows: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private lanternGlows: Phaser.GameObjects.Sprite[] = [];

  // Coordinates of the wall lanterns inside the empty spa shell
  public static readonly LANTERNS = [
    { x: -306, y: -38 },  // Left wall lantern 1
    { x: -234, y: -76 },  // Room 1 lantern
    { x: -95, y: -148 },  // Room 2 lantern
    { x: 308, y: -42 },   // Right wall lantern 1
    { x: 412, y: 12 },    // Right wall lantern 2
    { x: 60, y: 10 },     // Room 4 left lantern
    { x: 180, y: -40 },   // Room 4 top lantern
  ];

  constructor(scene: Phaser.Scene, baseLayer: BaseGridLayer) {
    this.scene = scene;
    this.baseLayer = baseLayer;
    this.container = this.scene.add.container(0, 0);
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  private ensureRadialTexture() {
    if (!this.scene.textures.exists("light_mask_radial")) {
      const canvas = this.scene.textures.createCanvas("light_mask_radial", 128, 128);
      if (canvas) {
        const ctx = canvas.getContext();
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
        grad.addColorStop(0.3, "rgba(255, 220, 160, 0.65)");
        grad.addColorStop(0.65, "rgba(255, 170, 50, 0.2)");
        grad.addColorStop(1.0, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        canvas.refresh();
      }
    }
  }

  public initAmbientLanterns() {
    this.clearLanterns();
    this.ensureRadialTexture();

    LightShaderLayer.LANTERNS.forEach((pt, idx) => {
      const halo = this.scene.add.sprite(pt.x, pt.y, "light_mask_radial");
      halo.setBlendMode(Phaser.BlendModes.ADD);
      halo.setTint(0xffaa33);
      halo.setAlpha(Phaser.Math.FloatBetween(0.3, 0.55));
      halo.setScale(0.85);
      halo.setDepth(500);
      this.container.add(halo);
      this.lanternGlows.push(halo);

      this.scene.tweens.add({
        targets: halo,
        alpha: { from: 0.28, to: 0.65 },
        scale: { from: 0.8, to: 1.0 },
        duration: 1800 + idx * 250,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: idx * 200,
      });
    });
  }

  public clearLanterns() {
    for (const l of this.lanternGlows) l.destroy();
    this.lanternGlows = [];
  }

  public syncEntityPosition(entityId: string, x: number, y: number) {
    const glow = this.activeGlows.get(entityId);
    if (glow) {
      glow.setPosition(x, y - 15);
    }
  }

  public setLightGlow(entityId: string, enabled: boolean, tint = 0xffaa33, intensity = 1.0) {
    const existing = this.activeGlows.get(entityId);

    if (!enabled) {
      if (existing) {
        this.scene.tweens.add({
          targets: existing,
          alpha: 0,
          scale: 0.8,
          duration: 400,
          onComplete: () => {
            existing.destroy();
            this.activeGlows.delete(entityId);
          }
        });
      }
      return;
    }

    if (existing) return;

    this.ensureRadialTexture();
    const pos = this.baseLayer.getEntityPosition(entityId) || { x: -198, y: -18 };

    const glow = this.scene.add.sprite(pos.x, pos.y - 15, "light_mask_radial");
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setTint(tint);
    glow.setAlpha(0.6 * intensity);
    glow.setScale(2.2 * intensity);
    glow.setDepth(550);

    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.42 * intensity, to: 0.82 * intensity },
      scaleX: { from: 2.0 * intensity, to: 2.4 * intensity },
      scaleY: { from: 2.0 * intensity, to: 2.4 * intensity },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.container.add(glow);
    this.activeGlows.set(entityId, glow);
  }

  public triggerWarningPulse(entityId: string, durationMs = 5000) {
    this.ensureRadialTexture();
    const pos = this.baseLayer.getEntityPosition(entityId) || { x: -135, y: 152 };

    const pulse = this.scene.add.sprite(pos.x, pos.y - 10, "light_mask_radial");
    pulse.setBlendMode(Phaser.BlendModes.ADD);
    pulse.setTint(0xff3344);
    pulse.setAlpha(0.7);
    pulse.setScale(2.0);
    pulse.setDepth(580);
    this.container.add(pulse);

    this.scene.tweens.add({
      targets: pulse,
      alpha: { from: 0.2, to: 0.75 },
      scale: { from: 1.6, to: 2.3 },
      duration: 450,
      yoyo: true,
      repeat: Math.floor(durationMs / 900),
      onComplete: () => {
        pulse.destroy();
      }
    });
  }

  public removeAll() {
    for (const glow of this.activeGlows.values()) {
      glow.destroy();
    }
    this.activeGlows.clear();
  }
}
