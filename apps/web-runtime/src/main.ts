import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { DioramaScene } from "./scenes/DioramaScene.js";
import { DemoControlPanel } from "./ui/DemoControlPanel.js";
import { EntityInspector } from "./ui/EntityInspector.js";
import { wsClient } from "./services/WebSocketClient.js";
import { mcpConsole } from "./ui/McpConsole.js";
import { AssetStudioDrawer, CatalogItem } from "./ui/AssetStudioDrawer.js";
import { AiAssetCreatorModal, GeneratedAsset } from "./ui/AiAssetCreatorModal.js";
import { OwnerOverviewPanel } from "./ui/OwnerOverviewPanel.js";
import { aiOwnerChatWidget } from "./ui/AiOwnerChatWidget.js";
import { spatialRuntimeDispatcher } from "./services/SpatialRuntimeDispatcher.js";
import { voiceAgentService } from "./services/VoiceAgentService.js";
import { StaffMessengerModal, DispatchEvent } from "./ui/StaffMessengerModal.js";

window.addEventListener("DOMContentLoaded", () => {
  const gameContainer = document.getElementById("game-container");
  gameContainer?.addEventListener("contextmenu", (e) => e.preventDefault());

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    width: gameContainer?.clientWidth || window.innerWidth - 320,
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
  const assetDrawer = new AssetStudioDrawer();
  const aiModal = new AiAssetCreatorModal();
  const ownerPanel = new OwnerOverviewPanel();
  const staffMessenger = new StaffMessengerModal();

  // Mode Switcher: Builder Mode vs Owner Mode
  const btnModeBuilder = document.getElementById("btn-mode-builder");
  const btnModeOwner = document.getElementById("btn-mode-owner");

  function setAppMode(mode: "builder" | "owner") {
    document.body.classList.remove("mode-builder", "mode-owner");
    document.body.classList.add(`mode-${mode}`);

    const sidebarBuilderView = document.getElementById("sidebar-builder-view");
    const sidebarOwnerView = document.getElementById("sidebar-owner-view");
    const sidebarModeBadge = document.getElementById("sidebar-mode-badge");

    if (mode === "owner") {
      btnModeOwner?.classList.add("active-mode");
      btnModeBuilder?.classList.remove("active-mode");
      if (sidebarOwnerView) sidebarOwnerView.style.display = "flex";
      if (sidebarBuilderView) sidebarBuilderView.style.display = "none";
      if (sidebarModeBadge) sidebarModeBadge.textContent = "[★] SALON OVERVIEW";
      demoPanel.showToast("[★]", "Owner View: Salon Operations & Live Hub", 2200);

      const dioramaScene = game.scene.getScene("DioramaScene") as DioramaScene;
      if (dioramaScene?.currentWorld) {
        ownerPanel.updateFromWorld(dioramaScene.currentWorld);
      }
    } else {
      btnModeBuilder?.classList.add("active-mode");
      btnModeOwner?.classList.remove("active-mode");
      if (sidebarOwnerView) sidebarOwnerView.style.display = "none";
      if (sidebarBuilderView) sidebarBuilderView.style.display = "flex";
      if (sidebarModeBadge) sidebarModeBadge.textContent = "[#] STUDIO & STAGE";
      demoPanel.showToast("[#]", "Builder Mode: Stage Geometry & Catalog", 2200);
    }

    const dioramaScene = game.scene.getScene("DioramaScene") as DioramaScene;
    if (dioramaScene) {
      dioramaScene.scale.resize(
        gameContainer?.clientWidth || window.innerWidth - 320,
        gameContainer?.clientHeight || window.innerHeight - (mode === "owner" ? 56 : 108)
      );
    }
  }

  btnModeBuilder?.addEventListener("click", () => setAppMode("builder"));
  btnModeOwner?.addEventListener("click", () => setAppMode("owner"));
  document.body.classList.add("mode-builder");

  // Sidebar Collapse / Expand Functionality
  const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");
  const btnCollapseSidebar = document.getElementById("btn-collapse-sidebar");
  const sidebarExpandTab = document.getElementById("sidebar-expand-tab");

  function toggleSidebar(forceState?: boolean) {
    const isCurrentlyCollapsed = document.body.classList.contains("sidebar-collapsed");
    const willCollapse = typeof forceState === "boolean" ? forceState : !isCurrentlyCollapsed;

    if (willCollapse) {
      document.body.classList.add("sidebar-collapsed");
      if (btnToggleSidebar) btnToggleSidebar.innerHTML = `<span>[▶]</span> Sidebar`;
      localStorage.setItem("spatialtwin_sidebar_collapsed", "true");
      demoPanel.showToast("[◀]", "Sidebar collapsed · Viewport expanded", 1600);
    } else {
      document.body.classList.remove("sidebar-collapsed");
      if (btnToggleSidebar) btnToggleSidebar.innerHTML = `<span>[◀]</span> Sidebar`;
      localStorage.setItem("spatialtwin_sidebar_collapsed", "false");
      demoPanel.showToast("[▶]", "Sidebar restored", 1600);
    }

    // Trigger canvas resize smoothly
    setTimeout(() => {
      const dioramaScene = game.scene.getScene("DioramaScene") as DioramaScene;
      if (dioramaScene && gameContainer) {
        dioramaScene.scale.resize(gameContainer.clientWidth, gameContainer.clientHeight);
      }
    }, 120);
  }

  btnToggleSidebar?.addEventListener("click", () => toggleSidebar());
  btnCollapseSidebar?.addEventListener("click", () => toggleSidebar(true));
  sidebarExpandTab?.addEventListener("click", () => toggleSidebar(false));

  // Keyboard shortcut: '[' or 'Ctrl+B' to toggle sidebar
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      toggleSidebar();
    } else if (e.key === "[" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Restore saved collapse state from session storage / local storage
  if (localStorage.getItem("spatialtwin_sidebar_collapsed") === "true") {
    toggleSidebar(true);
  }

  // Module 1 & 2 triggers
  assetDrawer.onOpenAiModal = () => aiModal.open();
  ownerPanel.onOpenAiModal = () => aiModal.open();
  ownerPanel.onOpenStaffMessenger = (staffId) => staffMessenger.open(staffId);
  inspector.onOpenStaffMessenger = (staffId) => staffMessenger.open(staffId);
  document.getElementById("btn-open-ai-creator")?.addEventListener("click", () => aiModal.open());
  document.getElementById("btn-owner-open-chat")?.addEventListener("click", () => aiOwnerChatWidget.toggleChat(true));
  document.getElementById("btn-open-staff-messenger")?.addEventListener("click", () => staffMessenger.open());

  (window as any).__AI_CHAT_WIDGET__ = aiOwnerChatWidget;
  (window as any).__SPATIAL_DISPATCHER__ = spatialRuntimeDispatcher;
  (window as any).__VOICE_AGENT__ = voiceAgentService;
  (window as any).__STAFF_MESSENGER__ = staffMessenger;

  // Module 5: Staff Messenger Multi-Channel Dispatch (Telegram / LINE / WhatsApp)
  staffMessenger.onMessageDispatched = (event: DispatchEvent) => {
    const dioramaScene = game.scene.getScene("DioramaScene") as DioramaScene;
    if (dioramaScene) {
      const channelBadge = event.channel === "telegram" ? "[TG]" : event.channel === "line" ? "[LINE]" : "[WA]";
      // 1. Show outbound text bubble over staff member on 2.5D diorama
      dioramaScene.hudLayer.showTextBubble(event.staffId, `${channelBadge} → ${event.staffName.split(" ")[0]}:`, event.text, 4500, false);
      demoPanel.showToast(channelBadge, `Dispatched to ${event.staffName} via ${event.channel.toUpperCase()} [200 OK]`, 3000);

      // 2. If it's a tea break prompt, send character to tea lounge and restore stamina!
      if (event.isBreakPrompt) {
        setTimeout(() => {
          dioramaScene.commandCharacterWalk(event.staffId, -145, 185);
          dioramaScene.hudLayer.updateStaminaBar(event.staffId, 85);
          demoPanel.showToast("🍵", `${event.staffName} proceeding to Tea Lounge for recovery break`, 3200);
        }, 1200);
      }

      // 3. Simulate employee reaction bubble on diorama 2.4s later
      setTimeout(() => {
        dioramaScene.hudLayer.showTextBubble(event.staffId, `[${event.staffName.split(" ")[0]}]:`, event.replyText.split("(")[0].trim(), 5000, true);
      }, 2400);
    }
  };

  // Module 2 & 3: AI Asset creation -> In-canvas scaffolding and hot-reload texture replacement
  aiModal.onApplyRequested = async (asset: GeneratedAsset) => {
    mcpConsole.logPipeline(4, 4, "INJECT_ATLAS", `Registered sprite ${asset.id} in spa_atlas.json`);
    mcpConsole.logMcpIn("place_station", {
      asset_type: "cedar_tub_pixel",
      name: asset.name,
      footprint: asset.footprint
    });

    const dioramaScene = game.scene.getScene("DioramaScene") as DioramaScene;
    if (dioramaScene) {
      await dioramaScene.spawnConstructionEntity(
        "cedar_tub_pixel",
        asset.name,
        asset.footprint,
        undefined,
        undefined,
        4200
      );
      mcpConsole.logMcpOut("place_station", {
        status: "ACTIVE",
        id: asset.id,
        name: asset.name,
        footprint: asset.footprint
      });
      demoPanel.showToast("[★]", `Asset "${asset.name}" hot-reloaded into salon!`, 3500);
    }
  };

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

      dioramaScene.onWorldUpdated = (world) => {
        ownerPanel.updateFromWorld(world);
      };

      ownerPanel.onSelectStation = (stationId) => {
        dioramaScene.centerCameraOnEntity(stationId);
        const entity = dioramaScene.currentWorld?.entities.find(e => e.id === stationId);
        if (entity) {
          inspector.show(entity);
        }
      };

      ownerPanel.onSelectStaff = (staffId) => {
        dioramaScene.centerCameraOnEntity(staffId);
        const entity = dioramaScene.currentWorld?.entities.find(e => e.id === staffId);
        if (entity) {
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

      demoPanel.onResetStage = async () => {
        await dioramaScene.loadDefaultWorldFromJson();
      };

      demoPanel.onEmptyStage = () => {
        dioramaScene.clearStage();
      };

      demoPanel.onTriggerScenario = (stageNum: number) => {
        dioramaScene.triggerClientDemoStage(stageNum);
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

      // Module 1: Drag from Asset Studio Drawer onto canvas with snap-to-grid
      assetDrawer.onItemSpawnRequested = async (item: CatalogItem, clientX?: number, clientY?: number) => {
        mcpConsole.logMcpIn("place_station", {
          asset: item.assetType,
          name: item.name,
          footprint: item.footprint
        });
        await dioramaScene.spawnConstructionEntity(
          item.assetType,
          item.name,
          item.footprint,
          clientX,
          clientY,
          3200
        );
        mcpConsole.logMcpOut("place_station", {
          status: "ACTIVE",
          asset: item.assetType,
          name: item.name
        });
        demoPanel.showToast("[+]", `Placed ${item.name} via Snap-to-Grid`, 2500);
      };

      assetDrawer.onGhostDragMove = (_assetType, clientX, clientY) => {
        dioramaScene.showDragGhost(clientX, clientY, "1x1");
      };

      assetDrawer.onGhostDragEnd = () => {
        dioramaScene.hideDragGhost();
      };

      // Module 4: Real-time MCP Tool Call Execution
      mcpConsole.onToolTestRequested = async (toolName, args) => {
        if (toolName === "place_station") {
          demoPanel.showToast("[MCP]", "Executing [place_station] -> Spawning Cedar Herbal Tub with scaffolding", 2800);
          mcpConsole.logMcpIn("place_station", {
            asset: "cedar_tub_pixel",
            label: "Cedar Herbal Tub",
            footprint: "2x2"
          });
          await dioramaScene.spawnConstructionEntity("cedar_tub_pixel", "Cedar Herbal Tub", "2x2", undefined, undefined, 3800);
          mcpConsole.logMcpOut("place_station", {
            success: true,
            station_id: "cedar_tub_ai_01",
            grid_pos: { x: 7, y: 7 },
            status: "ready_for_service"
          });
        } else if (toolName === "remove_object") {
          const entities = dioramaScene.currentWorld?.entities || [];
          const target = entities.find(e => e.id.includes("cedar") || e.id.includes("cat_") || e.id.includes("entity_"));
          if (target) {
            dioramaScene.baseLayer.removeEntity(target.id);
            mcpConsole.logMcpOut("remove_object", { success: true, removed_id: target.id });
            demoPanel.showToast("[-]", `Removed [${target.name || target.id}] via MCP`, 2200);
          } else {
            mcpConsole.logMcpOut("remove_object", { success: false, reason: "No dynamic entity found on stage" });
            demoPanel.showToast("[!]", "No dynamic entity found to remove", 2000);
          }
        } else if (toolName === "bind_data_stream") {
          mcpConsole.logMcpIn("bind_data_stream", {
            station_id: "onsen_tub_01",
            stream: "wss://iot.zenmassage.io/streams/water_temp",
            frequency_hz: 4
          });
          mcpConsole.logMcpOut("bind_data_stream", {
            status: "CONNECTED",
            station_id: "onsen_tub_01",
            metrics: { temp_c: 38.2, level_pct: 95 }
          });
          demoPanel.showToast("[~]", "Connected IoT telemetry stream to Onsen Tub", 2500);
        }
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
          document.body.classList.add("view-district-mode");
          if (gameContainer) gameContainer.style.backgroundColor = "#2f2c35";

          if (minimapTitle) minimapTitle.textContent = "[::] SALON INTERIOR";
          if (minimapHint) minimapHint.textContent = "CLICK TO ENTER";
          if (minimapThumbImg) minimapThumbImg.src = "/assets/salon_thumb.png";
          if (minimapPin) {
            minimapPin.style.display = "flex";
            const pinLabel = minimapPin.querySelector(".minimap-pin-label");
            if (pinLabel) pinLabel.textContent = "RETURN";
          }
          if (minimapSubtext) minimapSubtext.textContent = "Zen Massage · 5 Stations Active";
          if (minimapBadge) minimapBadge.textContent = "[SALON]";
          minimapWidget?.setAttribute("title", "Click to return to Salon Interior");

          if (tuiStatusText) tuiStatusText.textContent = "| Bangkok RCA District  [Kamphaeng Phet 7 Roi · Tap Salon to Enter]";
          if (tuiKeysText) tuiKeysText.textContent = "scroll zoom · drag pan · click [★] ZEN MASSAGE to enter interior";

          demoPanel.showToast("[MAP]", "District Map: Kamphaeng Phet 7 Roi / RCA Alley", 2400);
        } else {
          btnViewSalon?.classList.add("active-btn");
          btnViewDistrict?.classList.remove("active-btn");
          document.body.classList.remove("view-district-mode");
          if (gameContainer) gameContainer.style.backgroundColor = "#201d1d";

          if (minimapTitle) minimapTitle.textContent = "[★] DISTRICT MAP";
          if (minimapHint) minimapHint.textContent = "CLICK TO EXPAND";
          if (minimapThumbImg) minimapThumbImg.src = "/assets/district_map.jpg";
          if (minimapPin) {
            minimapPin.style.display = "flex";
            const pinLabel = minimapPin.querySelector(".minimap-pin-label");
            if (pinLabel) pinLabel.textContent = "SALON";
          }
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
