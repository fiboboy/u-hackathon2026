import Phaser from "phaser";
import { BaseGridLayer } from "./BaseGridLayer.js";
import { soundManager } from "../services/SoundManager.js";

export class ParticleLayer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private baseLayer: BaseGridLayer;

  constructor(scene: Phaser.Scene, baseLayer: BaseGridLayer) {
    this.scene = scene;
    this.baseLayer = baseLayer;
    this.container = this.scene.add.container(0, 0);
    this.ensureTextures();
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  private ensureTextures() {
    if (!this.scene.textures.exists("particle_steam")) {
      const c = this.scene.textures.createCanvas("particle_steam", 16, 16);
      if (c) {
        const ctx = c.getContext();
        const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        g.addColorStop(0, "rgba(240, 248, 255, 0.85)");
        g.addColorStop(0.5, "rgba(220, 235, 250, 0.45)");
        g.addColorStop(1, "rgba(200, 220, 240, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 16, 16);
        c.refresh();
      }
    }
    if (!this.scene.textures.exists("particle_coin")) {
      const c = this.scene.textures.createCanvas("particle_coin", 12, 12);
      if (c) {
        const ctx = c.getContext();
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(6, 6, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.arc(5, 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
        c.refresh();
      }
    }
    if (!this.scene.textures.exists("particle_smoke")) {
      const c = this.scene.textures.createCanvas("particle_smoke", 16, 16);
      if (c) {
        const ctx = c.getContext();
        const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        g.addColorStop(0, "rgba(85, 90, 105, 0.85)");
        g.addColorStop(0.6, "rgba(60, 65, 80, 0.45)");
        g.addColorStop(1, "rgba(30, 35, 45, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 16, 16);
        c.refresh();
      }
    }
    if (!this.scene.textures.exists("particle_sakura")) {
      const c = this.scene.textures.createCanvas("particle_sakura", 10, 10);
      if (c) {
        const ctx = c.getContext();
        ctx.fillStyle = "#f472b6";
        ctx.beginPath();
        ctx.ellipse(5, 5, 4, 2, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        c.refresh();
      }
    }
  }

  // 1. Natural Rising Onsen Steam
  public spawnSteam(x = 183, y = -135, count = 3) {
    this.ensureTextures();
    for (let i = 0; i < count; i++) {
      const p = this.scene.add.sprite(
        x + Phaser.Math.Between(-25, 25),
        y + Phaser.Math.Between(-10, 10),
        "particle_steam"
      );
      p.setAlpha(Phaser.Math.FloatBetween(0.25, 0.55));
      p.setScale(Phaser.Math.FloatBetween(0.6, 1.1));
      p.setDepth(500);
      this.container.add(p);

      this.scene.tweens.add({
        targets: p,
        y: y - Phaser.Math.Between(45, 85),
        x: p.x + Phaser.Math.Between(-20, 20),
        alpha: 0,
        scale: 1.6,
        duration: Phaser.Math.Between(2200, 3400),
        delay: i * 200,
        ease: "Sine.easeOut",
        onComplete: () => p.destroy()
      });
    }
  }

  // 2. Sleeping ZZZ floating letters
  public spawnSleepingZ(x = 125, y = 45) {
    const text = this.scene.add.text(x, y, "z", {
      fontSize: "12px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "#a5b4fc",
      fontStyle: "bold"
    });
    text.setDepth(500);
    this.container.add(text);

    this.scene.tweens.add({
      targets: text,
      y: y - 45,
      x: x + Phaser.Math.Between(15, 30),
      alpha: 0,
      scale: 1.5,
      duration: 2500,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy()
    });
  }

  // 3. Delicate Tea Cup Steam
  public spawnTeaSteam(x = -40, y = 160) {
    this.ensureTextures();
    const puff = this.scene.add.sprite(x + Phaser.Math.Between(-4, 4), y, "particle_steam");
    puff.setAlpha(0.35);
    puff.setScale(0.4);
    puff.setDepth(500);
    this.container.add(puff);

    this.scene.tweens.add({
      targets: puff,
      y: y - 24,
      x: x + Phaser.Math.Between(-6, 6),
      alpha: 0,
      scale: 0.8,
      duration: 1800,
      ease: "Sine.easeOut",
      onComplete: () => puff.destroy()
    });
  }

  // 4. Spectacular Golden Coin Fountain Burst (+4,500 ₽)
  public triggerCoinFountain(entityId = "cash_chest_01", intensity = 2.0) {
    this.ensureTextures();
    soundManager.playCoinChime();

    const pos = this.baseLayer.getEntityPosition(entityId) || { x: -268, y: 45 };
    const originX = pos.x;
    const originY = pos.y - 12;

    // Floating Golden "+4,500 ₽" Badge
    const badge = this.scene.add.text(originX, originY - 10, "+4,500 ₽", {
      fontSize: "14px",
      fontFamily: "'JetBrains Mono', monospace",
      color: "#fbbf24",
      fontStyle: "bold",
      stroke: "#18181b",
      strokeThickness: 3
    });
    badge.setOrigin(0.5, 0.5);
    badge.setDepth(15000);
    this.container.add(badge);

    this.scene.tweens.add({
      targets: badge,
      y: originY - 55,
      scale: 1.25,
      alpha: 0,
      duration: 2200,
      ease: "Back.easeOut",
      onComplete: () => badge.destroy()
    });

    const coinCount = Math.round(16 * intensity);
    for (let i = 0; i < coinCount; i++) {
      const coin = this.scene.add.sprite(originX, originY, "particle_coin");
      coin.setScale(Phaser.Math.FloatBetween(0.8, 1.2));
      coin.setDepth(14000);
      this.container.add(coin);

      const targetX = originX + Phaser.Math.Between(-75, 75);
      const peakY = originY - Phaser.Math.Between(45, 90);
      const groundY = originY + Phaser.Math.Between(10, 35);

      this.scene.tweens.add({
        targets: coin,
        x: targetX,
        duration: 750 + i * 20,
        ease: "Linear"
      });

      this.scene.tweens.add({
        targets: coin,
        y: peakY,
        duration: 380,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.scene.tweens.add({
            targets: coin,
            y: groundY,
            duration: 380,
            ease: "Bounce.easeOut",
            onComplete: () => {
              this.scene.tweens.add({
                targets: coin,
                alpha: 0,
                duration: 500,
                delay: 350,
                onComplete: () => coin.destroy()
              });
            }
          });
        }
      });
    }
  }

  // 5. Irritation Smoke Emitter (SLA Breach)
  public triggerIrritationSmoke(entityId = "lounge_sofa_01", durationMs = 5000) {
    this.ensureTextures();
    soundManager.playAlertChime();

    const pos = this.baseLayer.getEntityPosition(entityId) || { x: -70, y: 135 };
    const originX = pos.x;
    const originY = pos.y - 25;

    this.scene.time.addEvent({
      delay: 200,
      repeat: Math.floor(durationMs / 200),
      callback: () => {
        const puff = this.scene.add.sprite(
          originX + Phaser.Math.Between(-10, 10),
          originY,
          "particle_smoke"
        );
        puff.setAlpha(0.85);
        puff.setScale(0.8);
        puff.setDepth(12000);
        this.container.add(puff);

        this.scene.tweens.add({
          targets: puff,
          y: originY - Phaser.Math.Between(30, 55),
          x: originX + Phaser.Math.Between(-25, 25),
          scale: 1.5,
          alpha: 0,
          duration: 1300,
          ease: "Sine.easeOut",
          onComplete: () => puff.destroy()
        });
      }
    });
  }

  // 6. Grand Sakura Petal Blossom Shower (5-Star Review)
  public triggerSakuraBloom(durationMs = 8000) {
    this.ensureTextures();
    soundManager.playSakuraChime();

    this.scene.time.addEvent({
      delay: 90,
      repeat: Math.floor(durationMs / 90),
      callback: () => {
        const spawnX = Phaser.Math.Between(-450, 450);
        const spawnY = Phaser.Math.Between(-320, -100);

        const petal = this.scene.add.sprite(spawnX, spawnY, "particle_sakura");
        petal.setScale(Phaser.Math.FloatBetween(0.8, 1.4));
        petal.setAlpha(0.95);
        petal.setAngle(Phaser.Math.Between(0, 360));
        petal.setDepth(16000);
        this.container.add(petal);

        this.scene.tweens.add({
          targets: petal,
          x: spawnX + Phaser.Math.Between(120, 280),
          y: spawnY + Phaser.Math.Between(450, 650),
          angle: petal.angle + Phaser.Math.Between(120, 360),
          alpha: 0,
          duration: Phaser.Math.Between(3600, 5200),
          ease: "Sine.easeInOut",
          onComplete: () => petal.destroy()
        });
      }
    });
  }
}
