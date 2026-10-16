import { Entity, World } from "@spatialtwin/core-schema";
import { soundManager } from "../services/SoundManager.js";

export interface OwnerStationItem {
  id: string;
  name: string;
  room: string;
  status: "in_use" | "ready" | "alert";
  badgeText: string;
  iconTag: string;
  entityId?: string;
  temp?: string;
}

export interface OwnerStaffItem {
  id: string;
  name: string;
  role: string;
  status: "treating" | "ready" | "break";
  badgeText: string;
  staminaPct: number;
  entityId?: string;
}

export class OwnerOverviewPanel {
  private stationsListEl!: HTMLElement;
  private staffListEl!: HTMLElement;
  private revValEl!: HTMLElement;
  private occValEl!: HTMLElement;

  public onSelectEntity?: (entityId: string) => void;
  public onSelectStation?: (stationId: string) => void;
  public onSelectStaff?: (staffId: string) => void;
  public onOpenAiModal?: () => void;

  constructor() {
    this.initElements();
  }

  private initElements() {
    this.stationsListEl = document.getElementById("owner-stations-list") as HTMLElement;
    this.staffListEl = document.getElementById("owner-staff-list") as HTMLElement;
    this.revValEl = document.getElementById("owner-kpi-rev") as HTMLElement;
    this.occValEl = document.getElementById("owner-kpi-occ") as HTMLElement;

    document.getElementById("btn-owner-add-equipment")?.addEventListener("click", () => {
      this.onOpenAiModal?.();
    });

    this.renderDefaultData();
  }

  public updateFromWorld(world: World) {
    if (!this.stationsListEl || !this.staffListEl) return;

    const entities = world.entities || [];
    const stations: OwnerStationItem[] = [];
    const staffMembers: OwnerStaffItem[] = [];

    // Collect Stations
    entities.forEach(ent => {
      if (ent.type === "station" || ent.type === "chest" || ent.type === "lounge") {
        const isChest = ent.asset_type.includes("cash_chest") || ent.asset_type.includes("reception");
        const isOnsen = ent.asset_type.includes("onsen");
        const isBed = ent.asset_type.includes("bed");
        const isLounge = ent.type === "lounge" || ent.asset_type.includes("armchair");

        let status: OwnerStationItem["status"] = "ready";
        let badgeText = "[READY]";
        let iconTag = "[BED]";

        if (isChest) {
          iconTag = "[POS]";
          badgeText = "[ONLINE · ฿14,500]";
          status = "ready";
        } else if (isOnsen) {
          iconTag = "[TUB]";
          badgeText = "[IN SERVICE · 38.4°C]";
          status = "in_use";
        } else if (isBed) {
          iconTag = "[BED]";
          const secs = ent.state?.current_session_seconds_left || 0;
          if (secs > 0 || ent.state?.status === "in_service") {
            const min = Math.ceil(secs / 60) || 52;
            badgeText = `[IN SERVICE · ${min}m]`;
            status = "in_use";
          } else {
            badgeText = "[READY · Clean]";
            status = "ready";
          }
        } else if (isLounge) {
          iconTag = "[LNG]";
          badgeText = "[1 GUEST]";
          status = "in_use";
        }

        stations.push({
          id: ent.id,
          name: ent.name || ent.asset_type,
          room: isChest ? "Reception Desk" : isOnsen ? "Bath & Garden Suite" : isLounge ? "Tea Lounge" : "Treatment Room",
          status,
          badgeText,
          iconTag,
          entityId: ent.id
        });
      }

      if (ent.type === "staff") {
        const stamina = ent.state?.stamina ?? 85;
        let badgeText = "[ACTIVE]";
        let status: OwnerStaffItem["status"] = "treating";

        if (stamina < 30) {
          badgeText = "[TEA BREAK]";
          status = "break";
        } else if (ent.state?.status === "idle") {
          badgeText = "[READY]";
          status = "ready";
        }

        staffMembers.push({
          id: ent.id,
          name: ent.name || ent.id,
          role: ent.name?.includes("Somchai") ? "Master Therapist · Floor Lead" :
                ent.name?.includes("Ken") ? "Master Traditional Nuad" :
                ent.name?.includes("Yuki") ? "Aromatherapist" : "Spa Specialist",
          status,
          badgeText,
          staminaPct: stamina,
          entityId: ent.id
        });
      }
    });

    if (stations.length > 0) {
      this.renderStations(stations);
    }
    if (staffMembers.length > 0) {
      this.renderStaff(staffMembers);
    }
  }

  private renderDefaultData() {
    const defaultStations: OwnerStationItem[] = [
      {
        id: "reception_counter",
        name: "Main Register & POS",
        room: "Reception Counter",
        status: "ready",
        badgeText: "[OPEN · ฿14,500]",
        iconTag: "[POS]",
        entityId: "reception_counter"
      },
      {
        id: "massage_bed_01",
        name: "Tatami Treatment Bed #1",
        room: "Room 1 (Aromatherapy)",
        status: "in_use",
        badgeText: "[IN SERVICE · 51m left]",
        iconTag: "[BED]",
        entityId: "massage_bed_01"
      },
      {
        id: "onsen_tub_01",
        name: "Hinoki Wood Onsen Tub",
        room: "Bath & Garden Wing",
        status: "in_use",
        badgeText: "[IN SERVICE · 38.4°C]",
        iconTag: "[TUB]",
        entityId: "onsen_tub_01"
      },
      {
        id: "massage_bed_02",
        name: "Cedar Wood Treatment Table",
        room: "Room 2 (Traditional)",
        status: "ready",
        badgeText: "[READY · Idle]",
        iconTag: "[BED]",
        entityId: "massage_bed_02"
      },
      {
        id: "sofa_armchair_01",
        name: "Tea Tasting Armchairs",
        room: "Waiting Lounge",
        status: "in_use",
        badgeText: "[1 GUEST · Kenji]",
        iconTag: "[LNG]",
        entityId: "sofa_armchair_01"
      }
    ];

    const defaultStaff: OwnerStaffItem[] = [
      {
        id: "master_somchai",
        name: "Somchai Thaworn",
        role: "Lead Master Therapist · 12 yrs exp",
        status: "treating",
        badgeText: "[IN SERVICE · R1]",
        staminaPct: 82,
        entityId: "master_somchai"
      },
      {
        id: "master_ken",
        name: "Kenji Sato",
        role: "Nuad Thai Traditional Master",
        status: "ready",
        badgeText: "[AVAILABLE]",
        staminaPct: 94,
        entityId: "master_ken"
      },
      {
        id: "master_yuki",
        name: "Yuki Tanaka",
        role: "Aromatherapy & Herbal Lead",
        status: "treating",
        badgeText: "[IN SERVICE · Onsen]",
        staminaPct: 68,
        entityId: "master_yuki"
      },
      {
        id: "staff_receptionist",
        name: "Nong Napat",
        role: "Concierge & Cashier Hostess",
        status: "ready",
        badgeText: "[RECEPTION · Open]",
        staminaPct: 98,
        entityId: "staff_receptionist"
      }
    ];

    this.renderStations(defaultStations);
    this.renderStaff(defaultStaff);
  }

  private renderStations(items: OwnerStationItem[]) {
    if (!this.stationsListEl) return;
    this.stationsListEl.innerHTML = "";

    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "owner-station-row";
      row.title = `Click to inspect ${item.name}`;

      const left = document.createElement("div");
      left.className = "owner-row-left";

      const icon = document.createElement("span");
      icon.className = "owner-row-icon";
      icon.textContent = item.iconTag;

      const info = document.createElement("div");
      info.style.minWidth = "0";

      const title = document.createElement("div");
      title.className = "owner-row-title";
      title.textContent = item.name;

      const sub = document.createElement("div");
      sub.className = "owner-row-subtitle";
      sub.textContent = item.room;

      info.appendChild(title);
      info.appendChild(sub);
      left.appendChild(icon);
      left.appendChild(info);

      const badge = document.createElement("span");
      badge.className = `owner-row-badge ${item.status === "in_use" ? "badge-in-use" : "badge-ready"}`;
      badge.textContent = item.badgeText;

      row.appendChild(left);
      row.appendChild(badge);

      row.addEventListener("click", () => {
        soundManager.playAction("tap");
        if (item.entityId) {
          this.onSelectEntity?.(item.entityId);
          this.onSelectStation?.(item.entityId);
        }
      });

      this.stationsListEl.appendChild(row);
    });
  }

  private getStaffAvatar(id: string): string {
    const lower = id.toLowerCase();
    if (lower.includes("somchai") || lower.includes("room1")) return "/assets/avatars/avatar_somchai.png";
    if (lower.includes("ken") || lower.includes("room2")) return "/assets/avatars/avatar_ken.png";
    if (lower.includes("yuki") || lower.includes("room4")) return "/assets/avatars/avatar_yuki.png";
    if (lower.includes("reception") || lower.includes("napat") || lower.includes("lin") || lower.includes("aiko")) return "/assets/avatars/avatar_receptionist.png";
    return "/assets/avatars/avatar_somchai.png";
  }

  private renderStaff(staff: OwnerStaffItem[]) {
    if (!this.staffListEl) return;
    this.staffListEl.innerHTML = "";

    staff.forEach(s => {
      const row = document.createElement("div");
      row.className = "owner-staff-row";
      row.title = `Click to view profile and CRM card of ${s.name}`;

      const left = document.createElement("div");
      left.className = "owner-row-left";

      const avatarBox = document.createElement("div");
      avatarBox.className = "owner-avatar-frame";
      const img = document.createElement("img");
      img.className = "owner-avatar-img";
      img.src = this.getStaffAvatar(s.id);
      img.alt = s.name;
      avatarBox.appendChild(img);

      const info = document.createElement("div");
      info.style.minWidth = "0";

      const title = document.createElement("div");
      title.className = "owner-row-title";
      title.textContent = s.name;

      const sub = document.createElement("div");
      sub.className = "owner-row-subtitle";
      sub.textContent = `${s.role} · Stamina ${s.staminaPct}%`;

      info.appendChild(title);
      info.appendChild(sub);
      left.appendChild(avatarBox);
      left.appendChild(info);

      const badge = document.createElement("span");
      badge.className = `owner-row-badge ${s.status === "treating" ? "badge-in-use" : s.status === "break" ? "badge-busy" : "badge-ready"}`;
      badge.textContent = s.badgeText;

      row.appendChild(left);
      row.appendChild(badge);

      row.addEventListener("click", () => {
        soundManager.playAction("tap");
        if (s.entityId) {
          this.onSelectEntity?.(s.entityId);
          this.onSelectStaff?.(s.entityId);
        }
      });

      this.staffListEl.appendChild(row);
    });
  }
}
