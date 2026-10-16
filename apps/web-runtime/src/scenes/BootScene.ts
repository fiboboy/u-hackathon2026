import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    const { width, height } = this.scale;

    // Loading title
    this.add.text(width / 2, height / 2 - 25, "[SPATIALTWIN] // LOADING 2.5D DIORAMA...", {
      fontSize: "13px",
      fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
      color: "#fdfcfc",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Progress bar
    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();
    progressBox.fillStyle(0x302c2c, 0.95);
    progressBox.lineStyle(1, 0x646262, 1);
    progressBox.fillRoundedRect(width / 2 - 130, height / 2 + 10, 260, 12, 2);
    progressBox.strokeRoundedRect(width / 2 - 130, height / 2 + 10, 260, 12, 2);

    this.load.on("progress", (val: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xfdfcfc, 1);
      progressBar.fillRoundedRect(width / 2 - 128, height / 2 + 12, 256 * val, 8, 1);
    });

    // 1. Master High-Resolution Diorama Cutaway
    this.load.image("diorama_master", "/assets/diorama_master.png");

    // 2. High-Resolution Sprite Atlas
    this.load.atlas("spa_atlas", "/assets/atlas.png", "/assets/atlas.json");

    // 3. District City Map (Kamphaeng Phet 7 Roi / RCA Alley)
    this.load.image("district_map", "/assets/district_map.jpg");
  }

  create() {
    this.scene.start("DioramaScene");
  }
}
