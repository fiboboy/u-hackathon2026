import Phaser from "phaser";
import { BaseGridLayer } from "./BaseGridLayer.js";

export class WorldHUDLayer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private baseLayer: BaseGridLayer;
  private activeTimers: Map<string, Phaser.GameObjects.Container> = new Map();
  private activeStaminaBars: Map<string, Phaser.GameObjects.Container> = new Map();
  private activeBubbles: Map<string, Phaser.GameObjects.GameObject> = new Map();

  constructor(scene: Phaser.Scene, baseLayer: BaseGridLayer) {
    this.scene = scene;
    this.baseLayer = baseLayer;
    this.container = this.scene.add.container(0, 0);
  }

  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  public syncEntityPosition(entityId: string, x: number, y: number) {
    const timer = this.activeTimers.get(entityId);
    if (timer) {
      timer.setPosition(x, y - 95);
    }
    const stam = this.activeStaminaBars.get(entityId);
    if (stam) {
      stam.setPosition(x, y - 62);
    }
    const bub = this.activeBubbles.get(entityId) as any;
    if (bub && typeof bub.setPosition === "function") {
      bub.setPosition(x, y - 65);
    }
  }

  public updateTimer(entityId: string, secondsLeft: number) {
    const existing = this.activeTimers.get(entityId);

    if (secondsLeft <= 0) {
      if (existing) {
        this.scene.tweens.add({
          targets: existing,
          alpha: 0,
          scale: 0.8,
          duration: 300,
          onComplete: () => {
            existing.destroy();
            this.activeTimers.delete(entityId);
          }
        });
      }
      return;
    }

    const pos = this.baseLayer.getEntityPosition(entityId) || { x: -198, y: -18 };
    const badgeX = pos.x;
    const badgeY = pos.y - 95;

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timeText = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    if (existing) {
      existing.setPosition(badgeX, badgeY);
      const label = existing.getByName("timer_text") as Phaser.GameObjects.Text;
      if (label) label.setText(`[+] SESSION · ${timeText}`);
      return;
    }

    const pill = this.scene.add.container(badgeX, badgeY);
    pill.setDepth(20000);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x201d1d, 0.96);
    bg.lineStyle(1, 0xff9f0a, 0.95);
    bg.fillRoundedRect(-76, -12, 152, 24, 4);
    bg.strokeRoundedRect(-76, -12, 152, 24, 4);
    pill.add(bg);

    const text = this.scene.add.text(0, 0, `[+] SESSION · ${timeText}`, {
      fontSize: "10px",
      fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
      color: "#fdfcfc",
      fontStyle: "bold"
    });
    text.setName("timer_text");
    text.setOrigin(0.5, 0.5);
    pill.add(text);

    this.container.add(pill);
    this.activeTimers.set(entityId, pill);
  }

  public updateStaminaBar(entityId: string, staminaPercent: number | null | undefined) {
    if (staminaPercent === null || staminaPercent === undefined || isNaN(staminaPercent)) {
      const existing = this.activeStaminaBars.get(entityId);
      if (existing) {
        existing.destroy();
        this.activeStaminaBars.delete(entityId);
      }
      return;
    }

    if (staminaPercent >= 99) {
      const existing = this.activeStaminaBars.get(entityId);
      if (existing) {
        this.scene.tweens.add({
          targets: existing,
          alpha: 0,
          duration: 400,
          onComplete: () => {
            existing.destroy();
            this.activeStaminaBars.delete(entityId);
          }
        });
      }
      return;
    }

    const pos = this.baseLayer.getEntityPosition(entityId) || { x: -242, y: -25 };
    const barX = pos.x;
    const barY = pos.y - 62;

    let barCont = this.activeStaminaBars.get(entityId);
    if (!barCont) {
      barCont = this.scene.add.container(barX, barY);
      barCont.setDepth(20000);
      barCont.setAlpha(0);
      this.container.add(barCont);
      this.activeStaminaBars.set(entityId, barCont);

      this.scene.tweens.add({
        targets: barCont,
        alpha: 1,
        duration: 250,
        ease: "Cubic.easeOut"
      });
    } else {
      barCont.setPosition(barX, barY);
    }

    barCont.removeAll(true);

    const barWidth = 48;
    const barHeight = 8;
    const clamped = Math.max(0, Math.min(100, staminaPercent));
    const fillWidth = (clamped / 100) * barWidth;

    let fillColor = 0x30d158;
    if (clamped < 20) {
      fillColor = 0xff3b30;
    } else if (clamped < 50) {
      fillColor = 0xff9f0a;
    }

    const g = this.scene.add.graphics();
    g.fillStyle(0x201d1d, 0.96);
    g.lineStyle(1, clamped < 20 ? 0xff3b30 : 0x646262, 0.95);
    g.fillRoundedRect(-barWidth / 2 - 2, -barHeight / 2 - 2, barWidth + 4, barHeight + 4, 2);
    g.strokeRoundedRect(-barWidth / 2 - 2, -barHeight / 2 - 2, barWidth + 4, barHeight + 4, 2);

    if (fillWidth > 0) {
      g.fillStyle(fillColor, 1.0);
      g.fillRoundedRect(-barWidth / 2, -barHeight / 2, Math.max(3, fillWidth), barHeight, 1);
    }
    barCont.add(g);

    const pctText = this.scene.add.text(barWidth / 2 + 6, 0, `${Math.round(clamped)}%`, {
      fontSize: "9px",
      fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
      color: clamped < 20 ? "#ff3b30" : "#fdfcfc",
      fontStyle: "bold"
    }).setOrigin(0, 0.5);
    barCont.add(pctText);
  }

  public showBubble(entityId: string, iconFrame = "icon_tea", durationMs = 6000) {
    const existing = this.activeBubbles.get(entityId);
    if (existing) {
      existing.destroy();
      this.activeBubbles.delete(entityId);
    }

    const pos = this.baseLayer.getEntityPosition(entityId) || { x: -135, y: 152 };
    const bubbleX = pos.x;
    const bubbleY = pos.y - 68;

    let bubble: Phaser.GameObjects.GameObject;

    if (iconFrame === "icon_coffee") {
      const c = this.scene.add.container(bubbleX, bubbleY);
      c.setDepth(21000);

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x201d1d, 0.96);
      bg.lineStyle(1, 0xff9f0a, 1.0);
      bg.fillRoundedRect(-64, -12, 128, 24, 4);
      bg.strokeRoundedRect(-64, -12, 128, 24, 4);
      c.add(bg);

      const label = this.scene.add.text(0, 0, "[!] BREAK NEEDED", {
        fontSize: "10px",
        fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
        color: "#ff9f0a",
        fontStyle: "bold"
      }).setOrigin(0.5, 0.5);
      c.add(label);

      bubble = c;
    } else {
      const spr = this.scene.add.sprite(bubbleX, bubbleY, "spa_atlas", iconFrame);
      spr.setOrigin(0.5, 0.5);
      spr.setScale(0);
      spr.setDepth(21000);
      bubble = spr;
    }

    this.container.add(bubble);
    this.activeBubbles.set(entityId, bubble);

    this.scene.tweens.add({
      targets: bubble,
      scale: 1.0,
      duration: 250,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: bubble,
          alpha: 0,
          scale: 0,
          delay: durationMs,
          duration: 220,
          onComplete: () => {
            bubble.destroy();
            this.activeBubbles.delete(entityId);
          }
        });
      }
    });
  }

  /**
   * Display dynamic staff messenger speech bubble above 2.5D character
   */
  public showTextBubble(entityId: string, channelTag: string, text: string, durationMs = 5000, isReply = false) {
    const existing = this.activeBubbles.get(entityId);
    if (existing) {
      existing.destroy();
      this.activeBubbles.delete(entityId);
    }

    const pos = this.baseLayer.getEntityPosition(entityId) || { x: -135, y: 152 };
    const bubbleX = pos.x;
    const bubbleY = pos.y - 78;

    const c = this.scene.add.container(bubbleX, bubbleY);
    c.setDepth(21500);

    const cleanText = text.length > 34 ? text.substring(0, 32) + "..." : text;
    const fullLabel = `${channelTag} ${cleanText}`;
    const boxWidth = Math.max(130, Math.min(240, fullLabel.length * 6.4 + 20));
    const boxHeight = 26;

    // Resolve border color based on channel or reply
    let borderColor = 0x0088cc; // Telegram default
    const tagUpper = channelTag.toUpperCase();
    if (tagUpper.includes("LINE")) {
      borderColor = 0x06c755;
    } else if (tagUpper.includes("WA") || tagUpper.includes("WHATSAPP")) {
      borderColor = 0x25d366;
    } else if (isReply || tagUpper.includes("SOMCHAI") || tagUpper.includes("KEN") || tagUpper.includes("YUKI") || tagUpper.includes("LIN")) {
      borderColor = 0xff9f0a; // Staff warm amber reply
    }

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x201d1d, 0.96);
    bg.lineStyle(1.5, borderColor, 1.0);

    // Pill body
    bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 4);
    bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 4);

    // Little downward speech triangle pointer
    bg.fillStyle(0x201d1d, 0.96);
    bg.beginPath();
    bg.moveTo(-5, boxHeight / 2);
    bg.lineTo(0, boxHeight / 2 + 5);
    bg.lineTo(5, boxHeight / 2);
    bg.closePath();
    bg.fillPath();

    bg.lineStyle(1.5, borderColor, 1.0);
    bg.beginPath();
    bg.moveTo(-5, boxHeight / 2);
    bg.lineTo(0, boxHeight / 2 + 5);
    bg.lineTo(5, boxHeight / 2);
    bg.strokePath();

    c.add(bg);

    const label = this.scene.add.text(0, 0, fullLabel, {
      fontSize: "9px",
      fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
      color: isReply ? "#ff9f0a" : "#fdfcfc",
      fontStyle: "bold"
    }).setOrigin(0.5, 0.5);
    c.add(label);

    c.setScale(0);
    this.container.add(c);
    this.activeBubbles.set(entityId, c);

    this.scene.tweens.add({
      targets: c,
      scale: 1.0,
      y: bubbleY - 4,
      duration: 250,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: c,
          alpha: 0,
          scale: 0.8,
          delay: durationMs,
          duration: 220,
          onComplete: () => {
            c.destroy();
            this.activeBubbles.delete(entityId);
          }
        });
      }
    });
  }

  public removeAll() {
    for (const t of this.activeTimers.values()) t.destroy();
    for (const b of this.activeStaminaBars.values()) b.destroy();
    for (const bub of this.activeBubbles.values()) bub.destroy();
    this.activeTimers.clear();
    this.activeStaminaBars.clear();
    this.activeBubbles.clear();
  }
}
