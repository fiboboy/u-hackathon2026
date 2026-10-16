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

      // Corner Minimap & View Mode Switcher
      const minimapWidget = document.getElementById("district-minimap-widget");
      const minimapTitle = document.getElementById("minimap-title");
      const minimapHint = document.getElementById("minimap-hint");
      const minimapThumbImg = document.getElementById("minimap-thumb-img") as HTMLImageElement | null;
      const minimapPin = document.getElementById("minimap-pin");
      const minimapSubtext = document.getElementById("minimap-subtext");
      const minimapBadge = document.getElementById("minimap-badge");
      const tuiStatusText = document.getElementById("tui-status-text");
      const tuiKeysText = document.getElementById("tui-keys-text");

      const btnViewSalon = document.getElementById("btn-view-salon");
      const btnViewDistrict = document.getElementById("btn-view-district");

      minimapWidget?.addEventListener("click", () => {
        dioramaScene.toggleViewMode();
      });

      btnViewSalon?.addEventListener("click", () => {
        dioramaScene.switchToSalonView(true);
      });

      btnViewDistrict?.addEventListener("click", () => {
        dioramaScene.switchToDistrictView(true);
      });

      dioramaScene.onViewModeChanged = (mode: "salon" | "district") => {
        if (mode === "district") {
          btnViewSalon?.classList.remove("active-btn");
          btnViewDistrict?.classList.add("active-btn");

          if (minimapTitle) minimapTitle.textContent = "[::] SALON INTERIOR";
          if (minimapHint) minimapHint.textContent = "CLICK TO ENTER";
          if (minimapThumbImg) minimapThumbImg.src = "/assets/diorama_master.png";
          if (minimapPin) minimapPin.style.display = "none";
          if (minimapSubtext) minimapSubtext.textContent = "Zen Massage · 5 Stations Active";
          if (minimapBadge) minimapBadge.textContent = "[SALON]";
          minimapWidget?.setAttribute("title", "Click to return to Salon Interior");

          if (tuiStatusText) tuiStatusText.textContent = "| Bangkok RCA District  [Kamphaeng Phet 7 Roi · Tap Salon to Enter]";
          if (tuiKeysText) tuiKeysText.textContent = "scroll zoom · drag pan · click [★] ZEN MASSAGE to enter interior";

          demoPanel.showToast("[MAP]", "District Map: Kamphaeng Phet 7 Roi / RCA Alley", 2400);
        } else {
          btnViewSalon?.classList.add("active-btn");
          btnViewDistrict?.classList.remove("active-btn");

          if (minimapTitle) minimapTitle.textContent = "[★] DISTRICT MAP";
          if (minimapHint) minimapHint.textContent = "CLICK TO EXPAND";
          if (minimapThumbImg) minimapThumbImg.src = "/assets/district_map.jpg";
          if (minimapPin) minimapPin.style.display = "flex";
          if (minimapSubtext) minimapSubtext.textContent = "Bangkok RCA · Alley 7";
          if (minimapBadge) minimapBadge.textContent = "[FULLSCREEN]";
          minimapWidget?.setAttribute("title", "Click to view Fullscreen District City Map");

          if (tuiStatusText) tuiStatusText.textContent = "| Build  SpatialTwin 2.5D Engine  [Zen Massage & Onsen Spa]";
          if (tuiKeysText) tuiKeysText.textContent = "scroll zoom · drag canvas pan · click minimap for district";

          demoPanel.showToast("[SALON]", "Zen Massage & Onsen Spa interior active", 2000);
        }
      };
    }
  });
});
