/**
 * SpatialTwin Equipment Store
 * In-memory persistence with pre-configured Zen Wellness & Spa equipment catalog.
 * Supports CRUD, slot calculation, room distribution, and filtering.
 */

export interface EquipmentItem {
  id: string;
  name: string;
  category: "station" | "wellness_device" | "thermal" | "lounge" | "sanitary" | "decor";
  asset_type: string;
  room: "reception" | "waiting_lounge" | "suite_aromatherapy" | "suite_onsen" | "suite_double_massage" | "general" | string;
  grid_x: number;
  grid_y: number;
  footprint_w: number;
  footprint_h: number;
  status: "idle" | "in_service" | "maintenance" | "cleaning" | "offline";
  condition: "excellent" | "good" | "needs_service" | "critical";
  power_kw?: number;
  serial_number?: string;
  assigned_staff_id?: string | null;
  maintenance_notes?: string;
  last_inspected?: string;
  installed_at?: string;
}

export interface RoomLayoutInfo {
  id: string;
  name: string;
  defaultGrid: { minX: number; maxX: number; minY: number; maxY: number };
  capacity: number;
}

export const SALON_ROOMS: Record<string, RoomLayoutInfo> = {
  reception: {
    id: "reception",
    name: "Reception Counter & Lobby",
    defaultGrid: { minX: 0, maxX: 3, minY: 7, maxY: 10 },
    capacity: 4
  },
  waiting_lounge: {
    id: "waiting_lounge",
    name: "Tea Tasting & Waiting Lounge",
    defaultGrid: { minX: 3, maxX: 6, minY: 6, maxY: 9 },
    capacity: 6
  },
  suite_aromatherapy: {
    id: "suite_aromatherapy",
    name: "Tatami Aromatherapy Suite (Room #1)",
    defaultGrid: { minX: 5, maxX: 8, minY: 3, maxY: 6 },
    capacity: 3
  },
  suite_double_massage: {
    id: "suite_double_massage",
    name: "Traditional Nuad Thai Suite (Room #2)",
    defaultGrid: { minX: 8, maxX: 11, minY: 3, maxY: 6 },
    capacity: 3
  },
  suite_onsen: {
    id: "suite_onsen",
    name: "Hinoki Bath & Mineral Onsen Suite",
    defaultGrid: { minX: 11, maxX: 15, minY: 2, maxY: 7 },
    capacity: 4
  },
  general: {
    id: "general",
    name: "General Facility Area",
    defaultGrid: { minX: 0, maxX: 15, minY: 0, maxY: 11 },
    capacity: 20
  }
};

const INITIAL_EQUIPMENT: EquipmentItem[] = [
  {
    id: "massage_bed_01",
    name: "Tatami Aromatherapy Massage Bed",
    category: "station",
    asset_type: "massage_bed_wood",
    room: "suite_aromatherapy",
    grid_x: 6,
    grid_y: 4,
    footprint_w: 2,
    footprint_h: 1,
    status: "in_service",
    condition: "excellent",
    power_kw: 0.2,
    serial_number: "SN-MBD-2026-01",
    assigned_staff_id: "master_somchai",
    maintenance_notes: "Regular cedar oil polishing performed weekly.",
    last_inspected: "2026-10-14T08:00:00Z",
    installed_at: "2026-01-15T00:00:00Z"
  },
  {
    id: "massage_bed_02",
    name: "Nuad Thai Traditional Hardwood Table",
    category: "station",
    asset_type: "massage_bed_wood",
    room: "suite_double_massage",
    grid_x: 9,
    grid_y: 4,
    footprint_w: 2,
    footprint_h: 1,
    status: "idle",
    condition: "good",
    power_kw: 0.1,
    serial_number: "SN-MBD-2026-02",
    assigned_staff_id: "master_ken",
    maintenance_notes: "Acupressure padding inspected and sanitized.",
    last_inspected: "2026-10-15T09:30:00Z",
    installed_at: "2026-01-20T00:00:00Z"
  },
  {
    id: "onsen_tub_01",
    name: "Hinoki Cedar Mineral Bath Tub",
    category: "thermal",
    asset_type: "onsen_tub",
    room: "suite_onsen",
    grid_x: 12,
    grid_y: 3,
    footprint_w: 2,
    footprint_h: 2,
    status: "in_service",
    condition: "excellent",
    power_kw: 4.5,
    serial_number: "SN-ONS-2026-01",
    assigned_staff_id: "therapist_yuki",
    maintenance_notes: "Water temperature calibrated at 41.5°C; mineral ionizer active.",
    last_inspected: "2026-10-16T06:00:00Z",
    installed_at: "2026-02-01T00:00:00Z"
  },
  {
    id: "onsen_tub_vip",
    name: "Private Herbal VIP Hydro-Bath",
    category: "thermal",
    asset_type: "onsen_tub",
    room: "suite_onsen",
    grid_x: 13,
    grid_y: 6,
    footprint_w: 2,
    footprint_h: 2,
    status: "idle",
    condition: "excellent",
    power_kw: 5.0,
    serial_number: "SN-ONS-2026-VIP",
    assigned_staff_id: null,
    maintenance_notes: "Infused with Japanese cypress and yuzu citrus salts.",
    last_inspected: "2026-10-15T18:00:00Z",
    installed_at: "2026-03-10T00:00:00Z"
  },
  {
    id: "reception_desk_01",
    name: "Front Concierge & POS Terminal",
    category: "station",
    asset_type: "reception_desk",
    room: "reception",
    grid_x: 1,
    grid_y: 8,
    footprint_w: 2,
    footprint_h: 1,
    status: "idle",
    condition: "excellent",
    power_kw: 0.6,
    serial_number: "SN-RCP-2026-01",
    assigned_staff_id: "receptionist_lin",
    maintenance_notes: "POS card reader and appointment kiosk online.",
    last_inspected: "2026-10-16T07:30:00Z",
    installed_at: "2026-01-10T00:00:00Z"
  },
  {
    id: "cash_chest_01",
    name: "Secure POS Cash Box",
    category: "station",
    asset_type: "cash_chest",
    room: "reception",
    grid_x: 2,
    grid_y: 8,
    footprint_w: 1,
    footprint_h: 1,
    status: "in_service",
    condition: "good",
    power_kw: 0.05,
    serial_number: "SN-CSH-2026-01",
    assigned_staff_id: "receptionist_lin",
    maintenance_notes: "Cash reconciliation synchronized with MoySklad.",
    last_inspected: "2026-10-16T08:00:00Z",
    installed_at: "2026-01-10T00:00:00Z"
  },
  {
    id: "sofa_armchair_01",
    name: "Waiting Lounge Plush Armchair",
    category: "lounge",
    asset_type: "sofa_armchair",
    room: "waiting_lounge",
    grid_x: 3,
    grid_y: 7,
    footprint_w: 1,
    footprint_h: 1,
    status: "idle",
    condition: "excellent",
    power_kw: 0,
    serial_number: "SN-SFA-2026-01",
    assigned_staff_id: null,
    maintenance_notes: "Eco-linen fabric steam cleaned daily.",
    last_inspected: "2026-10-15T20:00:00Z",
    installed_at: "2026-01-12T00:00:00Z"
  },
  {
    id: "tea_table_01",
    name: "Herbal Tea Ceremony Table",
    category: "lounge",
    asset_type: "tea_table",
    room: "waiting_lounge",
    grid_x: 4,
    grid_y: 7,
    footprint_w: 1,
    footprint_h: 1,
    status: "in_service",
    condition: "excellent",
    power_kw: 1.2,
    serial_number: "SN-TEA-2026-01",
    assigned_staff_id: null,
    maintenance_notes: "Ceramic electric kettle and organic green tea station.",
    last_inspected: "2026-10-16T08:30:00Z",
    installed_at: "2026-01-12T00:00:00Z"
  },
  {
    id: "diffuser_aromatherapy_01",
    name: "Ultrasonic Essential Oil Diffuser",
    category: "wellness_device",
    asset_type: "ambient_lantern",
    room: "suite_aromatherapy",
    grid_x: 5,
    grid_y: 4,
    footprint_w: 1,
    footprint_h: 1,
    status: "idle",
    condition: "excellent",
    power_kw: 0.04,
    serial_number: "SN-DIF-2026-01",
    assigned_staff_id: "master_somchai",
    maintenance_notes: "Lemongrass and lavender vapor blend replenished.",
    last_inspected: "2026-10-16T07:00:00Z",
    installed_at: "2026-02-15T00:00:00Z"
  },
  {
    id: "bamboo_planter_01",
    name: "Fresh Bamboo Acoustic Partition",
    category: "decor",
    asset_type: "bamboo_plant",
    room: "waiting_lounge",
    grid_x: 2,
    grid_y: 6,
    footprint_w: 1,
    footprint_h: 1,
    status: "idle",
    condition: "excellent",
    power_kw: 0,
    serial_number: "SN-DEC-2026-01",
    assigned_staff_id: null,
    maintenance_notes: "Watered every morning.",
    last_inspected: "2026-10-16T07:00:00Z",
    installed_at: "2026-01-10T00:00:00Z"
  }
];

export class EquipmentStore {
  private static instance: EquipmentStore;
  private equipmentMap: Map<string, EquipmentItem> = new Map();

  constructor() {
    this.seed(INITIAL_EQUIPMENT);
  }

  public static getInstance(): EquipmentStore {
    if (!EquipmentStore.instance) {
      EquipmentStore.instance = new EquipmentStore();
    }
    return EquipmentStore.instance;
  }

  public seed(items: EquipmentItem[]) {
    this.equipmentMap.clear();
    for (const item of items) {
      this.equipmentMap.set(item.id, { ...item });
    }
  }

  public list(filter?: {
    room?: string;
    category?: string;
    status?: string;
  }): EquipmentItem[] {
    const list = Array.from(this.equipmentMap.values());
    return list.filter((item) => {
      if (filter?.room && item.room !== filter.room) return false;
      if (filter?.category && item.category !== filter.category) return false;
      if (filter?.status && item.status !== filter.status) return false;
      return true;
    });
  }

  public get(id: string): EquipmentItem | undefined {
    return this.equipmentMap.get(id);
  }

  public add(item: Omit<EquipmentItem, "footprint_w" | "footprint_h" | "condition" | "grid_x" | "grid_y" | "status"> & {
    grid_x?: number;
    grid_y?: number;
    footprint_w?: number;
    footprint_h?: number;
    status?: EquipmentItem["status"];
    condition?: EquipmentItem["condition"];
  }): EquipmentItem {
    if (this.equipmentMap.has(item.id)) {
      throw new Error(`Equipment with ID '${item.id}' already exists.`);
    }

    // Auto calculate grid coordinates if omitted or -1
    let gx = item.grid_x;
    let gy = item.grid_y;
    if (gx === undefined || gy === undefined || gx < 0 || gy < 0) {
      const autoSlot = this.findAvailableSlot(item.room || "general", item.footprint_w || 1, item.footprint_h || 1);
      gx = autoSlot.x;
      gy = autoSlot.y;
    }

    const fullItem: EquipmentItem = {
      ...item,
      grid_x: gx,
      grid_y: gy,
      footprint_w: item.footprint_w || 1,
      footprint_h: item.footprint_h || 1,
      condition: item.condition || "excellent",
      status: item.status || "idle",
      installed_at: item.installed_at || new Date().toISOString(),
      last_inspected: item.last_inspected || new Date().toISOString(),
      power_kw: item.power_kw ?? 0.5,
      serial_number: item.serial_number || `SN-${item.id.toUpperCase().slice(0, 8)}-${Date.now().toString().slice(-4)}`
    };

    this.equipmentMap.set(fullItem.id, fullItem);
    return fullItem;
  }

  public update(id: string, patch: Partial<EquipmentItem>): EquipmentItem {
    const existing = this.equipmentMap.get(id);
    if (!existing) {
      throw new Error(`Equipment with ID '${id}' not found.`);
    }

    const updated: EquipmentItem = {
      ...existing,
      ...patch,
      id: existing.id // protect ID from alteration
    };

    this.equipmentMap.set(id, updated);
    return updated;
  }

  public remove(id: string): EquipmentItem {
    const existing = this.equipmentMap.get(id);
    if (!existing) {
      throw new Error(`Equipment with ID '${id}' not found.`);
    }
    this.equipmentMap.delete(id);
    return existing;
  }

  public clearInactive(criteria: "offline" | "maintenance" | "unused" | "all_excess" = "all_excess"): EquipmentItem[] {
    const removed: EquipmentItem[] = [];
    for (const [id, item] of this.equipmentMap.entries()) {
      let shouldRemove = false;
      if (criteria === "offline" && item.status === "offline") shouldRemove = true;
      if (criteria === "maintenance" && item.status === "maintenance") shouldRemove = true;
      if (criteria === "unused" && item.status === "idle" && item.category === "decor") shouldRemove = true;
      if (criteria === "all_excess") {
        if (item.status === "offline" || item.condition === "critical") shouldRemove = true;
      }

      if (shouldRemove) {
        this.equipmentMap.delete(id);
        removed.push(item);
      }
    }
    return removed;
  }

  public findAvailableSlot(room: string, w = 1, h = 1): { x: number; y: number } {
    const roomInfo = SALON_ROOMS[room] || SALON_ROOMS.general;
    const { minX, maxX, minY, maxY } = roomInfo.defaultGrid;

    // Check occupied tiles
    const occupied = new Set<string>();
    for (const eq of this.equipmentMap.values()) {
      for (let dx = 0; dx < (eq.footprint_w || 1); dx++) {
        for (let dy = 0; dy < (eq.footprint_h || 1); dy++) {
          occupied.add(`${eq.grid_x + dx},${eq.grid_y + dy}`);
        }
      }
    }

    for (let y = minY; y <= maxY - h + 1; y++) {
      for (let x = minX; x <= maxX - w + 1; x++) {
        let isFree = true;
        for (let dx = 0; dx < w; dx++) {
          for (let dy = 0; dy < h; dy++) {
            if (occupied.has(`${x + dx},${y + dy}`)) {
              isFree = false;
              break;
            }
          }
          if (!isFree) break;
        }
        if (isFree) return { x, y };
      }
    }

    // Fallback: pick any open spot on grid
    return { x: minX, y: minY };
  }

  public getStats() {
    const all = Array.from(this.equipmentMap.values());
    const total = all.length;
    const inService = all.filter((i) => i.status === "in_service").length;
    const idle = all.filter((i) => i.status === "idle").length;
    const maintenance = all.filter((i) => i.status === "maintenance" || i.status === "offline").length;
    const totalPowerKw = Math.round(all.reduce((acc, cur) => acc + (cur.power_kw || 0), 0) * 10) / 10;

    const byRoom: Record<string, number> = {};
    for (const item of all) {
      byRoom[item.room] = (byRoom[item.room] || 0) + 1;
    }

    return {
      total,
      in_service: inService,
      idle,
      maintenance,
      total_power_kw: totalPowerKw,
      occupancy_rate_pct: total > 0 ? Math.round((inService / total) * 100) : 0,
      equipment_by_room: byRoom
    };
  }
}

export const equipmentStore = EquipmentStore.getInstance();
