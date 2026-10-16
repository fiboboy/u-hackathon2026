import { mcpConsole } from "./McpConsole";

export interface CatalogItem {
  id: string;
  name: string;
  assetType: string;
  category: "all" | "massage" | "onsen" | "reception" | "walls" | "decor";
  roomLabel: string;
  entityType: "station" | "lounge" | "decor" | "staff" | "guest";
  footprint: "1x1" | "2x1" | "2x2";
  syncStatus: "in_atlas" | "queued" | "placeholder";
  iconTag: string;
}

export class AssetStudioDrawer {
  private containerEl!: HTMLElement;
  private itemsListEl!: HTMLElement;
  private categoryTabs: HTMLButtonElement[] = [];
  private activeCategory: string = "all";

  public onOpenAiModal?: () => void;
  public onItemSpawnRequested?: (item: CatalogItem, worldX?: number, worldY?: number) => void;
  public onGhostDragMove?: (assetType: string, clientX: number, clientY: number) => void;
  public onGhostDragEnd?: () => void;

  public static readonly CATALOG: CatalogItem[] = [
    // Room 1: Massage & Treatment
    {
      id: "cat_tatami_bed",
      name: "Tatami Treatment Bed",
      assetType: "massage_bed_wood_left",
      category: "massage",
      roomLabel: "Treatment R1",
      entityType: "station",
      footprint: "2x1",
      syncStatus: "in_atlas",
      iconTag: "[+BED]"
    },
    {
      id: "cat_wood_bed",
      name: "Cedar Massage Table",
      assetType: "massage_bed_wood_right",
      category: "massage",
      roomLabel: "Treatment R2",
      entityType: "station",
      footprint: "2x1",
      syncStatus: "in_atlas",
      iconTag: "[+BED]"
    },
    {
      id: "cat_aroma_burner",
      name: "Aroma Diffuser Lamp",
      assetType: "aroma_burner_01",
      category: "massage",
      roomLabel: "Treatment R1/R2",
      entityType: "decor",
      footprint: "1x1",
      syncStatus: "in_atlas",
      iconTag: "[+ARM]"
    },
    {
      id: "cat_shoji_screen",
      name: "Shoji Screen Partition",
      assetType: "shoji_screen",
      category: "massage",
      roomLabel: "Treatment R2",
      entityType: "decor",
      footprint: "1x1",
      syncStatus: "in_atlas",
      iconTag: "[+SCR]"
    },

    // Room 2: Onsen & Hydrotherapy
    {
      id: "cat_onsen_tub",
      name: "Hinoki Wood Onsen Tub",
      assetType: "onsen_tub",
      category: "onsen",
      roomLabel: "Onsen Bath",
      entityType: "station",
      footprint: "2x2",
      syncStatus: "in_atlas",
      iconTag: "[+TUB]"
    },
    {
      id: "cat_onsen_vip",
      name: "VIP Hinoki Royal Onsen",
      assetType: "onsen_tub_vip",
      category: "onsen",
      roomLabel: "VIP Spa Suite",
      entityType: "station",
      footprint: "2x2",
      syncStatus: "in_atlas",
      iconTag: "[+VIP]"
    },
    {
      id: "cat_cedar_herbal_tub",
      name: "Cedar Phytotherapy Barrel",
      assetType: "cedar_tub_pixel",
      category: "onsen",
      roomLabel: "Herbal Suite",
      entityType: "station",
      footprint: "2x2",
      syncStatus: "in_atlas",
      iconTag: "[+BAR]"
    },
    {
      id: "cat_stone_footbath",
      name: "Mineral Stone Footbath",
      assetType: "onsen_tub",
      category: "onsen",
      roomLabel: "Hydrotherapy",
      entityType: "station",
      footprint: "1x1",
      syncStatus: "queued",
      iconTag: "[+FTH]"
    },

    // Room 3: Reception & Lounge
    {
      id: "cat_reception_counter",
      name: "Main Reception Counter",
      assetType: "reception_desk",
      category: "reception",
      roomLabel: "Reception Desk",
      entityType: "station",
      footprint: "2x1",
      syncStatus: "in_atlas",
      iconTag: "[+DSK]"
    },
    {
      id: "cat_cash_chest",
      name: "Treasury Cash Chest (POS)",
      assetType: "cash_chest",
      category: "reception",
      roomLabel: "Cashier Station",
      entityType: "station",
      footprint: "1x1",
      syncStatus: "in_atlas",
      iconTag: "[+POS]"
    },
    {
      id: "cat_lounge_sofa",
      name: "Cream Lounge Sofa",
      assetType: "sofa_armchair_cream",
      category: "reception",
      roomLabel: "Waiting Lounge",
      entityType: "lounge",
      footprint: "2x1",
      syncStatus: "in_atlas",
      iconTag: "[+SFA]"
    },
    {
      id: "cat_purple_armchair",
      name: "Plum Guest Armchair",
      assetType: "armchair_purple_01",
      category: "reception",
      roomLabel: "Waiting Lounge",
      entityType: "lounge",
      footprint: "1x1",
      syncStatus: "in_atlas",
      iconTag: "[+CHR]"
    },
    {
      id: "cat_tea_table",
      name: "Zen Tea Table",
      assetType: "tea_table_wood",
      category: "reception",
      roomLabel: "Tea Corner",
      entityType: "decor",
      footprint: "1x1",
      syncStatus: "in_atlas",
      iconTag: "[+TEA]"
    },

    // Room 4: Modular Walls & Shoji Partitions
    {
      id: "cat_wall_door_left",
      name: "Shoji Door Wall (NW-SE)",
      assetType: "wall_shoji_door_left",
      category: "walls",
      roomLabel: "Room Partition",
      entityType: "decor",
      footprint: "2x1",
      syncStatus: "in_atlas",
      iconTag: "[+WLL]"
    },
    {
      id: "cat_wall_front_right",
      name: "Shoji Room Divider (SW-NE)",
      assetType: "wall_shoji_front_right",
      category: "walls",
      roomLabel: "Room Partition",
      entityType: "decor",
      footprint: "2x1",
      syncStatus: "in_atlas",
      iconTag: "[+DIV]"
    },
    {
      id: "cat_bamboo_screen_wall",
      name: "Acoustic Bamboo Wall",
      assetType: "wall_shoji_sakura_left",
      category: "walls",
      roomLabel: "Garden Wall",
      entityType: "decor",
      footprint: "2x1",
      syncStatus: "placeholder",
      iconTag: "[+PLH]"
    },

    // Room 5: Decor & Lighting
    {
      id: "cat_bamboo_pot",
      name: "Giant Bamboo Planter",
      assetType: "bamboo_plant_01",
      category: "decor",
      roomLabel: "Courtyard Decor",
      entityType: "decor",
      footprint: "1x1",
      syncStatus: "in_atlas",
      iconTag: "[+BMB]"
    },
    {
      id: "cat_staff_therapist",
      name: "Senior Spa Therapist",
      assetType: "char_masseuse_room1",
      category: "decor",
      roomLabel: "Staff Roster",
      entityType: "staff",
      footprint: "1x1",
      syncStatus: "in_atlas",
      iconTag: "[+STF]"
    },
    {
      id: "cat_spa_guest",
      name: "Yukata Spa Guest",
      assetType: "char_guest_yukata",
      category: "decor",
      roomLabel: "Guest Roster",
      entityType: "guest",
      footprint: "1x1",
      syncStatus: "in_atlas",
      iconTag: "[+GST]"
    }
  ];

  constructor() {
    this.initElements();
    this.renderCatalog();
    this.setupDragAndDropToCanvas();
  }

  private initElements() {
    this.containerEl = document.getElementById("builder-sidebar") as HTMLElement;
    this.itemsListEl = document.getElementById("studio-inventory-list") as HTMLElement;

    // AI Creator modal trigger
    document.getElementById("btn-open-ai-creator")?.addEventListener("click", () => {
      this.onOpenAiModal?.();
      mcpConsole.logEngine("MODAL_OPEN", "AI Asset Creator modal opened");
    });

    // Category filter tabs
    this.categoryTabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".studio-tab-btn"));
    this.categoryTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        this.categoryTabs.forEach(t => t.classList.remove("active-tab"));
        tab.classList.add("active-tab");
        this.activeCategory = tab.dataset.category || "all";
        this.renderCatalog();
      });
    });
  }

  public renderCatalog() {
    if (!this.itemsListEl) return;
    this.itemsListEl.innerHTML = "";

    const filtered = AssetStudioDrawer.CATALOG.filter(item => {
      if (this.activeCategory === "all") return true;
      return item.category === this.activeCategory;
    });

    filtered.forEach(item => {
      const card = document.createElement("div");
      card.className = "studio-item-card";
      card.setAttribute("draggable", "true");
      card.dataset.asset = item.assetType;
      card.dataset.id = item.id;

      // Header row: icon, name, footprint
      const topRow = document.createElement("div");
      topRow.className = "studio-item-top";

      const iconSpan = document.createElement("span");
      iconSpan.className = "studio-item-icon";
      iconSpan.textContent = item.iconTag;

      const nameSpan = document.createElement("span");
      nameSpan.className = "studio-item-name";
      nameSpan.textContent = item.name;

      const footprintTag = document.createElement("span");
      footprintTag.className = "studio-item-footprint";
      footprintTag.textContent = item.footprint;

      topRow.appendChild(iconSpan);
      topRow.appendChild(nameSpan);
      topRow.appendChild(footprintTag);

      // Meta row: room label & sync status badge
      const metaRow = document.createElement("div");
      metaRow.className = "studio-item-meta";

      const roomSpan = document.createElement("span");
      roomSpan.className = "studio-item-room";
      roomSpan.textContent = item.roomLabel;

      const statusBadge = document.createElement("span");
      statusBadge.className = `sync-status-badge status-${item.syncStatus}`;
      statusBadge.textContent =
        item.syncStatus === "in_atlas" ? "[IN ATLAS]" :
        item.syncStatus === "queued" ? "[QUEUED]" : "[PLACEHOLDER]";

      metaRow.appendChild(roomSpan);
      metaRow.appendChild(statusBadge);

      card.appendChild(topRow);
      card.appendChild(metaRow);

      // Click: Spawn item directly
      card.addEventListener("click", () => {
        this.onItemSpawnRequested?.(item);
        mcpConsole.logMcpIn("place_station", {
          asset: item.assetType,
          footprint: item.footprint,
          snap_to_grid: true
        });
      });

      // HTML5 Drag and Drop
      card.addEventListener("dragstart", (e) => {
        card.classList.add("dragging");
        e.dataTransfer?.setData("text/plain", JSON.stringify(item));
        mcpConsole.logEngine("DRAG_START", `Dragging "${item.name}" from Asset Studio`);
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        this.onGhostDragEnd?.();
      });

      this.itemsListEl.appendChild(card);
    });
  }

  private setupDragAndDropToCanvas() {
    const gameContainer = document.getElementById("game-container");
    if (!gameContainer) return;

    gameContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
      this.onGhostDragMove?.("", e.clientX, e.clientY);
    });

    gameContainer.addEventListener("dragleave", () => {
      this.onGhostDragEnd?.();
    });

    gameContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      this.onGhostDragEnd?.();
      const dataStr = e.dataTransfer?.getData("text/plain");
      if (!dataStr) return;

      try {
        const item: CatalogItem = JSON.parse(dataStr);
        this.onItemSpawnRequested?.(item, e.clientX, e.clientY);
        mcpConsole.logMcpIn("place_station", {
          id: `${item.assetType}_${Date.now().toString().slice(-4)}`,
          asset: item.assetType,
          footprint: item.footprint,
          client_position: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
          snap_to_grid: true
        });
      } catch (err) {
        console.warn("Invalid drop payload", err);
      }
    });
  }
}
