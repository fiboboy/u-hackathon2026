import { Entity } from "@spatialtwin/core-schema";

export interface ClientCrmProfile {
  fullName: string;
  clientId: string;
  tier: string;
  tierClass: string;
  ltv: string;
  totalVisits: number;
  frequency: string;
  lastVisit: string;
  preferredService: string;
  preferredMaster: string;
  rating: string;
  healthNotes: string;
  healthAlert?: boolean;
  todayBooking: string;
}

export interface StaffCardProfile {
  fullName: string;
  staffId: string;
  roleTitle: string;
  certifications: string;
  shiftHours: string;
  sessionsToday: string;
  commissionToday: string;
  monthlyGross: string;
  rating: string;
  specialties: string;
}

export class EntityInspector {
  private drawer: HTMLElement;
  private titleEl: HTMLElement;
  private typeEl: HTMLElement;
  private badgesEl: HTMLElement;
  private bodyEl: HTMLElement;
  private closeBtn: HTMLElement;

  public currentEntity: Entity | null = null;
  public onFlipRequested?: (entityId: string) => void;
  public onDeleteRequested?: (entityId: string) => void;
  public onWalkRequested?: (entityId: string, x: number, y: number) => void;
  public onActionToast?: (icon: string, message: string) => void;

  // Curated CRM Client Database for Spa Guests
  private static readonly CLIENT_DATABASE: Record<string, ClientCrmProfile> = {
    guest_kenji: {
      fullName: "Kenji Takahashi",
      clientId: "#CL-8821",
      tier: "VIP Gold Member · 15% Off",
      tierClass: "insp-badge-gold",
      ltv: "$1,640.00",
      totalVisits: 18,
      frequency: "Every 10-14 days (Loyal Regular)",
      lastVisit: "5 days ago (Oct 11)",
      preferredService: "90m Traditional Thai Deep Tissue",
      preferredMaster: "Therapist Somchai",
      rating: "5.0 ★★★★★ (6 reviews)",
      healthNotes: "Severe upper trapezius & cervical stiffness from desk work. Prefers firm/hard pressure. Lavender allergy — substitute with eucalyptus oil.",
      healthAlert: true,
      todayBooking: "Waiting in Lounge for Room #1 (Sakura)"
    },
    guest_customer: {
      fullName: "Airi Tanaka",
      clientId: "#CL-9403",
      tier: "VIP Platinum Member · 20% Off",
      tierClass: "insp-badge-gold",
      ltv: "$2,280.00",
      totalVisits: 24,
      frequency: "Weekly (Fridays)",
      lastVisit: "Yesterday (Oct 15)",
      preferredService: "Hinoki Onsen Soak & Zen Facial",
      preferredMaster: "Therapist Yuki",
      rating: "4.9 ★★★★★ (12 reviews)",
      healthNotes: "Sensitive facial skin; prefers gentle pressure and warm cypress water; loves hot sencha green tea after session.",
      healthAlert: false,
      todayBooking: "Today's Payment (/pay 4500 settled)"
    },
    guest_yukata: {
      fullName: "Hiroshi Sato",
      clientId: "#CL-7155",
      tier: "Silver Member · 10% Off",
      tierClass: "insp-badge-gold",
      ltv: "$890.00",
      totalVisits: 9,
      frequency: "Monthly",
      lastVisit: "Oct 08 (8 days ago)",
      preferredService: "Shiatsu Acupressure & Hot Stone",
      preferredMaster: "Therapist Ken",
      rating: "4.8 ★★★★★ (4 reviews)",
      healthNotes: "Lower lumbar recovery; avoids heavy twist stretching; prefers medium pressure with warming balm.",
      healthAlert: false,
      todayBooking: "Room #2 (Bamboo) Scheduled"
    }
  };

  // Curated Employee Roster & Business Performance
  private static readonly STAFF_DATABASE: Record<string, StaffCardProfile> = {
    master_somchai: {
      fullName: "Somchai Prasert",
      staffId: "#EMP-104",
      roleTitle: "Lead Thai Massage Master",
      certifications: "Wat Pho Traditional Medicine Alumni · Royal Nuad Thai Master (Level 3)",
      shiftHours: "Today 09:00 - 19:00 (7.5h elapsed)",
      sessionsToday: "5 completed (310 mins total)",
      commissionToday: "$195.00 commission + $68.00 tips",
      monthlyGross: "$5,120.00 (Rank #1)",
      rating: "4.98 ★★★★★ (184 reviews)",
      specialties: "Deep Tissue Trigger Point · Thai Acupressure · Herbal Ball Compress"
    },
    master_ken: {
      fullName: "Kenichi Morimoto",
      staffId: "#EMP-108",
      roleTitle: "Senior Shiatsu & Reflexology Specialist",
      certifications: "Japan Shiatsu College Certified · Reflexology Board Certified",
      shiftHours: "Today 10:00 - 20:00 (6.0h elapsed)",
      sessionsToday: "4 completed (240 mins total)",
      commissionToday: "$160.00 commission + $45.00 tips",
      monthlyGross: "$4,250.00 (Rank #2)",
      rating: "4.92 ★★★★★ (120 reviews)",
      specialties: "Meridian Shiatsu · Foot Reflexology · Hot Stone Therapy"
    },
    master_yuki: {
      fullName: "Yuki Ishikawa",
      staffId: "#EMP-112",
      roleTitle: "Master Aromatherapist & Aesthetician",
      certifications: "CIDESCO International Diploma · Holistic Aromatherapy Guild",
      shiftHours: "Today 11:00 - 21:00 (5.0h elapsed)",
      sessionsToday: "4 completed (220 mins total)",
      commissionToday: "$170.00 commission + $55.00 tips",
      monthlyGross: "$4,680.00 (Rank #3)",
      rating: "4.96 ★★★★★ (135 reviews)",
      specialties: "Hinoki Cypress Scrub · Lymphatic Facial · Essential Oils Blending"
    },
    staff_receptionist: {
      fullName: "Mei Lin",
      staffId: "#EMP-101",
      roleTitle: "Spa Concierge & Guest Relations Manager",
      certifications: "Hospitality Management BA · Spa Booking Software Certified",
      shiftHours: "Today 08:30 - 18:30 (8.0h elapsed)",
      sessionsToday: "34 bookings handled today",
      commissionToday: "$2,480.00 register volume processed",
      monthlyGross: "$54,200.00 total salon gross",
      rating: "4.99 ★★★★★ (210 reviews)",
      specialties: "VIP Guest Care · Schedule Optimization · Multilingual Concierge"
    }
  };

  constructor() {
    this.drawer = document.getElementById("inspector-drawer")!;
    this.titleEl = document.getElementById("insp-title")!;
    this.typeEl = document.getElementById("insp-type")!;
    this.badgesEl = document.getElementById("insp-badges")!;
    this.bodyEl = document.getElementById("insp-body")!;
    this.closeBtn = document.getElementById("insp-close")!;

    this.closeBtn.addEventListener("click", () => this.hide());
  }

  public show(entity: Entity) {
    this.currentEntity = entity;
    const isCashRegister = this.checkIsCashRegister(entity);
    const isStaff = entity.type === "staff";
    const isGuest = entity.type === "guest";

    if (isCashRegister) {
      this.renderCashRegisterDashboard(entity);
    } else if (isGuest) {
      this.renderGuestCrmCard(entity);
    } else if (isStaff) {
      this.renderStaffDossierCard(entity);
    } else {
      this.renderStandardStationInspector(entity);
    }

    this.drawer.style.display = "block";
  }

  private checkIsCashRegister(entity: Entity): boolean {
    const id = entity.id.toLowerCase();
    const asset = (entity.asset_type || "").toLowerCase();
    const name = (entity.name || "").toLowerCase();
    return id.includes("cash") || id.includes("chest") || id.includes("reception_desk") ||
           asset.includes("cash") || asset.includes("reception") ||
           name.includes("cash") || name.includes("treasury") || name.includes("register");
  }

  /**
   * 1. Cash Register / Treasury — Core Spa Business & Financial Metrics Dashboard
   */
  private renderCashRegisterDashboard(entity: Entity) {
    this.titleEl.textContent = "Treasury & POS Register";
    this.typeEl.textContent = "Spa Financial Telemetry · Live Real-Time Integration";

    this.badgesEl.innerHTML = `
      <span class="insp-badge insp-badge-pos">[+] REGISTER OPEN</span>
      <span class="insp-badge insp-badge-staff">[!] TELEGRAM & STRIPE CONNECTED</span>
    `;

    this.bodyEl.innerHTML = `
      <!-- Financial Top Line Metrics -->
      <div class="insp-section-title">[+] TODAY'S FINANCIAL PERFORMANCE</div>
      <div class="insp-kpi-grid">
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Gross Revenue</div>
          <div class="insp-kpi-num">$2,480.00</div>
          <div class="insp-kpi-sub">+18.4% vs Daily Target</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Average Check</div>
          <div class="insp-kpi-num">$88.50</div>
          <div class="insp-kpi-sub">+5.2% vs Last Week</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Tips Collected</div>
          <div class="insp-kpi-num">$340.00</div>
          <div class="insp-kpi-sub">13.7% Staff Tip Rate</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Total Transactions</div>
          <div class="insp-kpi-num">28 Settled</div>
          <div class="insp-kpi-sub">0 Disputed / 0 Refunds</div>
        </div>
      </div>

      <!-- Operational Spa KPIs -->
      <div class="insp-section-title" style="margin-top: 10px;">[+] SPA OPERATIONAL EFFICIENCY (RevPASH)</div>
      <div class="insp-kpi-grid-3">
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Room Occupancy</div>
          <div class="insp-kpi-num">78.5%</div>
          <div class="insp-kpi-sub">Target: &gt;70%</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">SLA Adherence</div>
          <div class="insp-kpi-num">94.2%</div>
          <div class="insp-kpi-sub">&lt;10m Wait Target</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Avg Session</div>
          <div class="insp-kpi-num">68 min</div>
          <div class="insp-kpi-sub">Turnover: 12 min</div>
        </div>
      </div>

      <!-- Payment Breakdown -->
      <div class="insp-card-section">
        <div class="insp-section-title">[+] PAYMENT METHOD DISTRIBUTION</div>
        <div class="metric-row">
          <span class="metric-label">Credit / Debit Card (Stripe)</span>
          <span class="metric-val">62% · $1,537.60</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Cash at Register</span>
          <span class="metric-val">26% · $644.80</span>
        </div>
        <div class="metric-row" style="border-bottom: none;">
          <span class="metric-label">Telegram Pay / QR / Crypto</span>
          <span class="metric-val">12% · $297.60</span>
        </div>
      </div>

      <!-- Top Treatments Sold Today -->
      <div class="insp-card-section">
        <div class="insp-section-title">[+] TOP SERVICE REVENUE GENERATORS</div>
        <div class="metric-row">
          <span class="metric-label">1. Traditional Thai Deep Tissue (90m)</span>
          <span class="metric-val">14 sessions · $1,260</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">2. Hinoki Onsen Soak & VIP Scrub</span>
          <span class="metric-val">9 sessions · $720</span>
        </div>
        <div class="metric-row" style="border-bottom: none;">
          <span class="metric-label">3. Zen Aromatherapy & Facial Therapy</span>
          <span class="metric-val">5 sessions · $500</span>
        </div>
      </div>

      <!-- Quick Operational Actions -->
      <div class="inspector-actions">
        <button class="btn-insp" id="btn-z-report" title="Print daily Z-Report and shift reconciliation summary">
          [+] Z-Report
        </button>
        <button class="btn-insp" id="btn-cash-drop" title="Record register safe deposit drop">
          [$] Cash Drop
        </button>
        <button class="btn-insp" id="btn-demo-pay" title="Simulate client payment via Telegram Pay">
          [~] Pay Demo
        </button>
        <button class="btn-insp btn-danger" id="insp-btn-delete" title="Remove cash chest">
          [x] Remove
        </button>
      </div>
    `;

    document.getElementById("btn-z-report")?.addEventListener("click", () => {
      this.onActionToast?.("[+]", "Z-Report generated: Total $2,480.00 reconciled successfully");
    });

    document.getElementById("btn-cash-drop")?.addEventListener("click", () => {
      this.onActionToast?.("[$]", "Cash Drop recorded: $500.00 transferred to back-office safe");
    });

    document.getElementById("btn-demo-pay")?.addEventListener("click", () => {
      fetch("http://localhost:8000/api/v1/demo/stage3_payment_coin", { method: "POST" }).catch(() => {});
      this.onActionToast?.("[3]", "Payment received: $45.00 via Telegram Pay -> Gold coins bursting!");
    });

    this.bindDeleteAndFlip(entity);
  }

  /**
   * 2. Customer / Guest — CRM Client Profile & Health History Card
   */
  private renderGuestCrmCard(entity: Entity) {
    const profile = EntityInspector.CLIENT_DATABASE[entity.id] || {
      fullName: entity.name || "Spa Client",
      clientId: `#CL-${Math.abs(entity.id.split("").reduce((a, b) => a + b.charCodeAt(0), 1000))}`,
      tier: "Regular Member · 10% Off",
      tierClass: "insp-badge-gold",
      ltv: "$950.00",
      totalVisits: 8,
      frequency: "Every 2-3 weeks",
      lastVisit: "10 days ago",
      preferredService: "Traditional Thai Herbal Compress",
      preferredMaster: "Therapist Somchai",
      rating: "5.0 ★★★★★ (4 reviews)",
      healthNotes: "Prefers firm pressure on shoulder blades. No known essential oil allergies.",
      healthAlert: false,
      todayBooking: "Relaxing in Salon"
    };

    const state = entity.state || ({} as any);
    const status = state.status || "waiting";

    this.titleEl.textContent = profile.fullName;
    this.typeEl.textContent = `CRM Client Dossier · ${profile.clientId}`;

    this.badgesEl.innerHTML = `
      <span class="insp-badge ${profile.tierClass}">[★] ${profile.tier}</span>
      <span class="tag-status tag-${status}">${status.toUpperCase()}</span>
    `;

    this.bodyEl.innerHTML = `
      <!-- Financial & Visit Metrics -->
      <div class="insp-kpi-grid">
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Lifetime Value (LTV)</div>
          <div class="insp-kpi-num">${profile.ltv}</div>
          <div class="insp-kpi-sub">${profile.totalVisits} Total Visits</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Client Rating</div>
          <div class="insp-kpi-num insp-stars">5.0 ★</div>
          <div class="insp-kpi-sub">NPS: 10 / Promotor</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Visit Cadence</div>
          <div class="insp-kpi-num" style="font-size: 13px;">${profile.frequency}</div>
          <div class="insp-kpi-sub neutral">Last: ${profile.lastVisit}</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Preferred Therapist</div>
          <div class="insp-kpi-num" style="font-size: 13px;">${profile.preferredMaster}</div>
          <div class="insp-kpi-sub">Requested 92% of visits</div>
        </div>
      </div>

      <!-- Treatment Preferences & Health Notes -->
      <div class="insp-card-section">
        <div class="insp-section-title">[+] HEALTH NOTES &amp; CONTRAINDICATIONS</div>
        <div class="insp-note-box ${profile.healthAlert ? 'alert' : ''}">
          ${profile.healthAlert ? '<strong>[!] ALLERGY &amp; PRESSURE NOTE:</strong><br>' : ''}
          ${profile.healthNotes}
        </div>
        <div class="metric-row">
          <span class="metric-label">Preferred Treatment</span>
          <span class="metric-val">${profile.preferredService}</span>
        </div>
        <div class="metric-row" style="border-bottom: none;">
          <span class="metric-label">Active State</span>
          <span class="metric-val">${profile.todayBooking}</span>
        </div>
      </div>

      <!-- CRM Action Buttons -->
      <div class="inspector-actions">
        <button class="btn-insp" id="btn-book-visit" title="Schedule client's next session in CRM calendar">
          [+] Book Visit
        </button>
        <button class="btn-insp" id="btn-send-tea" title="Offer herbal tea / water bubble above guest">
          [~] Offer Tea
        </button>
        <button class="btn-insp" id="insp-btn-flip" title="Flip isometric character direction">
          [~] Flip
        </button>
        <button class="btn-insp btn-danger" id="insp-btn-delete" title="Check out / remove guest from stage">
          [x] Check Out
        </button>
      </div>

      <!-- Walk Navigation Graph -->
      <div class="sidebar-section-title" style="margin-top: 14px;">[+] WALK GUEST TO ZONE</div>
      <div class="walk-grid">
        <button class="btn-insp" data-walk-x="-275" data-walk-y="148">[&gt;] Reception</button>
        <button class="btn-insp" data-walk-x="-145" data-walk-y="195">[&gt;] Lounge</button>
        <button class="btn-insp" data-walk-x="-195" data-walk-y="35">[&gt;] Room #1</button>
        <button class="btn-insp" data-walk-x="-45" data-walk-y="-38">[&gt;] Room #2</button>
        <button class="btn-insp" data-walk-x="155" data-walk-y="-45">[&gt;] Onsen Bath</button>
        <button class="btn-insp" data-walk-x="145" data-walk-y="95">[&gt;] Room #3</button>
      </div>
    `;

    document.getElementById("btn-book-visit")?.addEventListener("click", () => {
      this.onActionToast?.("[+]", `Next session booked for ${profile.fullName}: Oct 23, 14:00 (Room #1)`);
    });

    document.getElementById("btn-send-tea")?.addEventListener("click", () => {
      fetch("http://localhost:8000/api/v1/webhook/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "tea_served",
          entity_id: entity.id,
          guest_name: profile.fullName
        })
      }).catch(() => {});
      this.onActionToast?.("[~]", `Warm Sencha Green Tea served to ${profile.fullName}`);
    });

    this.bindWalkButtons(entity);
    this.bindDeleteAndFlip(entity);
  }

  /**
   * 3. Staff / Employee Card — Therapist Performance, Stamina & Daily Commission
   */
  private renderStaffDossierCard(entity: Entity) {
    const profile = EntityInspector.STAFF_DATABASE[entity.id] || {
      fullName: entity.name || "Spa Therapist",
      staffId: `#EMP-${Math.abs(entity.id.split("").reduce((a, b) => a + b.charCodeAt(0), 100))}`,
      roleTitle: "Certified Spa Therapist",
      certifications: "Holistic Bodywork Certified",
      shiftHours: "Today 10:00 - 20:00 (6.0h elapsed)",
      sessionsToday: "4 sessions completed",
      commissionToday: "$150.00 commission + $40.00 tips",
      monthlyGross: "$4,100.00",
      rating: "4.94 ★★★★★ (98 reviews)",
      specialties: "Traditional Massage · Herbal Therapy"
    };

    const state = entity.state || ({} as any);
    const staminaVal = Math.round(state.stamina ?? 100);
    const staminaClass = staminaVal < 20 ? "low" : staminaVal < 50 ? "mid" : "";
    const staminaStatus = staminaVal < 20 ? "EXHAUSTED [!] BREAK MANDATORY" : staminaVal < 50 ? "FATIGUED (Break Recommended)" : "OPTIMAL RECOVERY";

    this.titleEl.textContent = profile.fullName;
    this.typeEl.textContent = `${profile.roleTitle} · ${profile.staffId}`;

    this.badgesEl.innerHTML = `
      <span class="insp-badge insp-badge-staff">[EMP] ACTIVE ON SHIFT</span>
      <span class="insp-badge ${staminaVal < 20 ? 'insp-badge-gold' : 'insp-badge-pos'}">[STAMINA: ${staminaVal}%]</span>
    `;

    this.bodyEl.innerHTML = `
      <!-- Live Stamina & Fatigue Bar -->
      <div class="insp-card-section" style="margin-top: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="insp-section-title" style="margin-bottom: 0;">[+] STAMINA &amp; FATIGUE INDEX</span>
          <span style="font-size: 11px; font-weight: 700; color: ${staminaVal < 20 ? 'var(--danger)' : 'var(--ink)'};">${staminaVal}% (${staminaStatus})</span>
        </div>
        <div class="stamina-meter">
          <div class="stamina-meter-fill ${staminaClass}" style="width: ${staminaVal}%;"></div>
        </div>
      </div>

      <!-- Business Performance Metrics -->
      <div class="insp-kpi-grid">
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Today's Earnings</div>
          <div class="insp-kpi-num" style="font-size: 14px;">${profile.commissionToday.split('+')[0]}</div>
          <div class="insp-kpi-sub">+ ${profile.commissionToday.split('+')[1] || '$0 tips'}</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Client Rating</div>
          <div class="insp-kpi-num insp-stars">${profile.rating.split(' ')[0]} ★</div>
          <div class="insp-kpi-sub">${profile.rating.split('(')[1]?.replace(')', '') || 'Top Rated'}</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Sessions Done</div>
          <div class="insp-kpi-num" style="font-size: 13px;">${profile.sessionsToday.split('(')[0]}</div>
          <div class="insp-kpi-sub neutral">${profile.sessionsToday.split('(')[1]?.replace(')', '') || 'Today'}</div>
        </div>
        <div class="insp-kpi-card">
          <div class="insp-kpi-label">Monthly Gross</div>
          <div class="insp-kpi-num">${profile.monthlyGross.split(' ')[0]}</div>
          <div class="insp-kpi-sub">${profile.monthlyGross.split('(')[1]?.replace(')', '') || 'Ranked'}</div>
        </div>
      </div>

      <!-- Certifications & Shift Details -->
      <div class="insp-card-section">
        <div class="insp-section-title">[+] CERTIFICATIONS &amp; SPECIALTIES</div>
        <div class="insp-note-box">
          <strong>Credentials:</strong> ${profile.certifications}<br>
          <strong>Focus:</strong> ${profile.specialties}
        </div>
        <div class="metric-row">
          <span class="metric-label">Today's Shift</span>
          <span class="metric-val">${profile.shiftHours}</span>
        </div>
      </div>

      <!-- Staff Actions -->
      <div class="inspector-actions">
        <button class="btn-insp" id="btn-send-break" title="Direct therapist to the tea table for stamina recovery">
          [☕] Send to Break
        </button>
        <button class="btn-insp" id="btn-assign-room" title="Assign therapist to next waiting room">
          [+] Assign Room
        </button>
        <button class="btn-insp" id="insp-btn-flip" title="Flip isometric character direction">
          [~] Flip
        </button>
        <button class="btn-insp btn-danger" id="insp-btn-delete" title="Clock out / remove staff">
          [x] Clock Out
        </button>
      </div>

      <!-- Walk Navigation Graph -->
      <div class="sidebar-section-title" style="margin-top: 14px;">[+] DISPATCH THERAPIST TO ZONE</div>
      <div class="walk-grid">
        <button class="btn-insp" data-walk-x="-275" data-walk-y="148">[&gt;] Reception</button>
        <button class="btn-insp" data-walk-x="-145" data-walk-y="195">[&gt;] Tea Table</button>
        <button class="btn-insp" data-walk-x="-195" data-walk-y="35">[&gt;] Room #1</button>
        <button class="btn-insp" data-walk-x="-45" data-walk-y="-38">[&gt;] Room #2</button>
        <button class="btn-insp" data-walk-x="155" data-walk-y="-45">[&gt;] Onsen Bath</button>
        <button class="btn-insp" data-walk-x="145" data-walk-y="95">[&gt;] Room #3</button>
      </div>
    `;

    document.getElementById("btn-send-break")?.addEventListener("click", () => {
      this.onWalkRequested?.(entity.id, -145, 185);
      fetch("http://localhost:8000/api/v1/webhook/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "staff_break_started",
          staff_id: entity.id,
          staff_name: profile.fullName
        })
      }).catch(() => {});
      this.onActionToast?.("[☕]", `${profile.fullName} sent to Tea Table for stamina recovery`);
    });

    document.getElementById("btn-assign-room")?.addEventListener("click", () => {
      this.onWalkRequested?.(entity.id, -195, 35);
      this.onActionToast?.("[+]", `${profile.fullName} dispatched to Treatment Room #1`);
    });

    this.bindWalkButtons(entity);
    this.bindDeleteAndFlip(entity);
  }

  /**
   * 4. Treatment Station / Modular Wall / Furniture Inspector
   */
  private renderStandardStationInspector(entity: Entity) {
    const isStation = entity.type === "station";
    const state = entity.state || ({} as any);
    const status = state.status || "idle";
    const cd = state.custom_data || {};
    const wx = cd.world_x ?? 0;
    const wy = cd.world_y ?? 0;

    const secsLeft = state.current_session_seconds_left || 0;
    let timerText = "Inactive";
    if (secsLeft > 0) {
      const m = Math.floor(secsLeft / 60);
      const s = secsLeft % 60;
      timerText = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    this.titleEl.textContent = entity.name || entity.id;
    this.typeEl.textContent = `Type: ${entity.type.toUpperCase()} · Grid: (${entity.grid_position.x}, ${entity.grid_position.y})`;

    this.badgesEl.innerHTML = `
      <span class="tag-status tag-${status}">${status.toUpperCase()}</span>
      <span class="insp-badge insp-badge-staff">Asset: ${entity.asset_type}</span>
    `;

    this.bodyEl.innerHTML = `
      <div class="metric-row">
        <span class="metric-label">[+] Current Status</span>
        <span class="metric-val">${status.toUpperCase()}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">[+] 2.5D Coordinates</span>
        <span class="metric-val">X: ${Math.round(wx)}, Y: ${Math.round(wy)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">[+] Active Session Timer</span>
        <span class="metric-val" style="color: ${secsLeft > 0 ? 'var(--warning)' : 'var(--ink)'}; font-weight: 700;">${timerText}</span>
      </div>
      ${isStation ? `
      <div class="metric-row">
        <span class="metric-label">[+] Telemetry Binding</span>
        <span class="metric-val">Google Sheets: Sheet1!B2</span>
      </div>
      <div class="metric-row" style="border-bottom: none;">
        <span class="metric-label">[+] Light Glow Effect</span>
        <span class="metric-val" style="color: var(--warning);">Additive Warm Glow (590nm)</span>
      </div>
      ` : ''}

      <div class="inspector-actions" style="margin-top: 14px;">
        <button class="btn-insp" id="insp-btn-flip" title="Flip isometric left/right orientation">
          [~] Flip
        </button>
        <button class="btn-insp btn-danger" id="insp-btn-delete" title="Remove this entity from stage">
          [x] Remove
        </button>
      </div>
    `;

    this.bindDeleteAndFlip(entity);
  }

  private bindDeleteAndFlip(entity: Entity) {
    document.getElementById("insp-btn-flip")?.addEventListener("click", () => {
      this.onFlipRequested?.(entity.id);
    });

    document.getElementById("insp-btn-delete")?.addEventListener("click", () => {
      this.onDeleteRequested?.(entity.id);
      this.hide();
    });
  }

  private bindWalkButtons(entity: Entity) {
    const walkBtns = this.bodyEl.querySelectorAll<HTMLButtonElement>("button[data-walk-x]");
    walkBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tx = Number(btn.dataset.walkX || 0);
        const ty = Number(btn.dataset.walkY || 0);
        this.onWalkRequested?.(entity.id, tx, ty);
      });
    });
  }

  public hide() {
    this.drawer.style.display = "none";
    this.currentEntity = null;
  }
}
