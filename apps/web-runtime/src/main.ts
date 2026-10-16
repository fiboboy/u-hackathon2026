import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { DioramaScene } from "./scenes/DioramaScene.js";
import { DemoControlPanel } from "./ui/DemoControlPanel.js";
import { EntityInspector } from "./ui/EntityInspector.js";
import { wsClient } from "./services/WebSocketClient.js";

window.addEventListener("DOMContentLoaded", () => {
  const gameContainer = document.getElementById("game-container");
  gameContainer?.addEventListener("contextmenu", (e) => e.preventDefault());

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: gameContainer?.clientWidth || window.innerWidth - 268,
    height: gameContainer?.clientHeight || window.innerHeight - 140,
    backgroundColor: "#201d1d",
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, DioramaScene],
  };

  const game = new Phaser.Game(config);
  (window as any).__PHASER_GAME__ = game;
  const demoPanel = new DemoControlPanel();
  const inspector = new EntityInspector();

  wsClient.onConnectionChange = (connected) => {
    demoPanel.updateConnectionStatus(connected);
  };

  game.events.on("step", () => {
    const dioramaScene = game.scene.getScene("DioramaScene") as DioramaScene;
    if (dioramaScene && !dioramaScene.onEntitySelected) {
      dioramaScene.onEntitySelected = (entity) => {
        inspector.show(entity);
      };

      dioramaScene.onEntityMovedUI = (entity) => {
        if (inspector.currentEntity?.id === entity.id) {
          inspector.show(entity);
        }
      };

      demoPanel.onToggleAutoWalk = () => {
        dioramaScene.autoWalkEnabled = !dioramaScene.autoWalkEnabled;
        return dioramaScene.autoWalkEnabled;
      };

      demoPanel.onToggleHighlightAll = () => {
        return dioramaScene.toggleHighlightAll();
      };

      demoPanel.onCenterCamera = () => {
        dioramaScene.resetCamera();
      };

      inspector.onFlipRequested = (entityId) => {
        dioramaScene.baseLayer.flipEntity(entityId);
        demoPanel.showToast("[~]", "Entity orientation flipped", 1500);
      };

      inspector.onDeleteRequested = async (entityId) => {
        await fetch(`http://localhost:8000/api/v1/world/entities/${entityId}`, {
          method: "DELETE"
        }).catch(() => {});
        demoPanel.showToast("[-]", "Entity removed from stage", 2000);
      };

      inspector.onWalkRequested = (entityId, x, y) => {
        dioramaScene.commandCharacterWalk(entityId, x, y);
        demoPanel.showToast("[>]", "Character walking to target zone...", 2200);
      };

      inspector.onActionToast = (icon, message) => {
        demoPanel.showToast(icon, message, 3000);
      };
    }
  });
});
