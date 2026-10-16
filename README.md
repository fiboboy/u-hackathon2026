# [SPATIALTWIN] // v2.5D Digital Twin Engine

> **Open-source 2.5D isometric pixel-art digital twin framework that transforms live business metrics, CRM webhooks, and ERP spreadsheets into a tactile, real-time spatial diorama controlled by operators and external AI agents via the Model Context Protocol (MCP).**

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Engine: Phaser 3](https://img.shields.io/badge/Phaser-3.87-brightgreen.svg)](https://phaser.io/)
[![Backend: FastAPI](https://img.shields.io/badge/FastAPI-0.115-blue.svg)](https://fastapi.tiangolo.com/)
[![MCP: Enabled](https://img.shields.io/badge/MCP-Protocol%20Ready-purple.svg)](https://modelcontextprotocol.io/)
[![Design System: OpenCode](https://img.shields.io/badge/Design%20System-OpenCode%20Monospace-201d1d.svg)](DESIGN-opencode.ai.md)
[![Live Demo: Vercel](https://img.shields.io/badge/Live%20Demo-Vercel%20Production-ffaa33.svg)](https://fearless-bohr-pink.vercel.app)

> **🚀 Live Web Production Demo:** [https://fearless-bohr-pink.vercel.app](https://fearless-bohr-pink.vercel.app)  
> **📦 GitHub Repository:** [https://github.com/fiboboy/u-hackathon2026](https://github.com/fiboboy/u-hackathon2026)

---

## [01] NORTH STAR: ACTIVE VISUALIZED HOURS (AVH)
Small business owners and floor managers look at traditional BI dashboards for 3–5 minutes a week. When a spatial digital twin stays active for hours on a reception display or operator terminal, it wins the most critical battle in operational management — **continuous peripheral awareness of live bottlenecks, SLA thresholds, and staff stamina**.

---

## [02] MONOREPO ARCHITECTURE

```
spatialtwin/
├── DESIGN-opencode.ai.md    # OpenCode editorial terminal-native monospace design system
├── apps/
│   ├── web-runtime/         # Phaser 3 / Vite 2.5D isometric client with 4-layer render pipeline
│   └── cloud-bridge/        # FastAPI WebSocket state broker, Rules & Stamina Engine
├── packages/
│   ├── core-schema/         # Zod / TypeScript schemas for world.json and WS event envelopes
│   ├── mcp-server/          # Model Context Protocol (MCP) server for AI agent spatial control
│   ├── asset-pipeline/      # Autonomous pixel-art slicer, modular wall extractor & atlas builder
│   └── sheets-connector/    # Google Sheets & Google Apps Script webhook connector
├── docs/
│   ├── live-demo-runbook.md # 6-stage interactive demo runbook
│   └── sessions/            # Daily engineering session logs
└── docker/
    └── docker-compose.yml   # Single-command container orchestration
```

---

## [03] QUICK START

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Local Development Environment

In two terminal sessions:

```bash
# Terminal 1: Cloud Bridge Backend (FastAPI + WebSockets)
cd apps/cloud-bridge
python -m uvicorn app.main:app --reload --port 8000

# Terminal 2: Web Runtime Client (Phaser 3 + Vite)
cd apps/web-runtime
pnpm dev --port 3000
```

Open **`http://localhost:3000`** in your browser.

### 3. Run via Docker Compose
```bash
docker compose -f docker/docker-compose.yml up --build
```

---

## [04] AI AGENT INTEGRATION (CLAUDE DESKTOP / CURSOR) VIA MCP

SpatialTwin implements the open **Model Context Protocol (MCP)** so AI agents can inspect the floor plan, spawn modular 2.5D walls or treatment stations, bind data streams, and configure SLA rules in real time.

Add the following entry to `claude_desktop_config.json`:

## [04] MODEL CONTEXT PROTOCOL (MCP) INTEGRATION & PRODUCTION DEPLOYMENT

SpatialTwin provides a **fully compliant Model Context Protocol (MCP v1.1.0, Protocol Spec 2024-11-05)** server deployed directly on Vercel as serverless functions with zero external dependencies required. Any external AI agent (Claude Desktop, Cursor, Antigravity, OpenRouter, or custom LLM bots) can connect remotely over **SSE** or direct **JSON-RPC 2.0 HTTP** to inspect the facility, add physical equipment, update room assignments, and remove excess or decommissioned units.

### 🌐 Live Production Endpoints:
- **Web Console & Interactive Tester:** [https://fearless-bohr-pink.vercel.app/api/mcp](https://fearless-bohr-pink.vercel.app/api/mcp)
- **MCP SSE Remote Endpoint:** `https://fearless-bohr-pink.vercel.app/api/mcp?sse=true`
- **MCP JSON-RPC 2.0 Endpoint:** `https://fearless-bohr-pink.vercel.app/api/mcp`
- **Equipment Inventory REST API:** [https://fearless-bohr-pink.vercel.app/api/equipment](https://fearless-bohr-pink.vercel.app/api/equipment)

---

### 🤖 Remote Agent Configuration

#### Option A: Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "spatialtwin-spa": {
      "url": "https://fearless-bohr-pink.vercel.app/api/mcp?sse=true"
    }
  }
}
```

#### Option B: Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "spatialtwin-spa": {
      "url": "https://fearless-bohr-pink.vercel.app/api/mcp?sse=true",
      "transport": "sse"
    }
  }
}
```

#### Option C: Local CLI (Stdio Transport)
```json
{
  "mcpServers": {
    "spatialtwin-local": {
      "command": "node",
      "args": ["./packages/mcp-server/dist/index.js"]
    }
  }
}
```

---

### 🛠️ Complete MCP Tool Catalog:

| Tool Name | Description | Key Arguments |
|:---|:---|:---|
| `list_equipment` | Lists all operational stations and equipment (massage tables, Hinoki tubs, POS registers, saunas, diffusers). | `room?`, `category?`, `status?` |
| `add_equipment` | Adds a new piece of equipment with auto-slot placement or custom grid coordinates. | `id`, `name`, `asset_type`, `room`, `category`, `power_kw` |
| `remove_equipment` | Decommissions and removes redundant, broken, or excess equipment by ID (*"удалить лишнее"*). | `id`, `reason?` |
| `update_equipment` | Updates operating status (`idle`, `in_service`, `maintenance`, `cleaning`, `offline`), condition, room, or staff assignment. | `id`, `status?`, `condition?`, `room?`, `maintenance_notes?` |
| `get_equipment` | Fetches full telemetry, power rating, and service history for a specific unit. | `id` |
| `clear_inactive_equipment` | Bulk purges offline, obsolete, or excess equipment to optimize room capacity. | `criteria` (`offline`, `maintenance`, `unused`, `all_excess`) |
| `get_facility_layout` | Returns room boundaries, dimensions, capacity, and equipment density breakdown. | *(none)* |
| `place_object` | Places a station, furniture, or decor sprite directly on the isometric canvas diorama. | `id`, `asset_type`, `grid_x`, `grid_y` |
| `remove_object` | Removes an object from the diorama and unbinds associated telemetry streams. | `id` |
| `bind_data_stream` | Binds equipment to Google Sheets (`Sheet1!D5`) or CRM webhook (`$.payment.amount`). | `entity_id`, `source_type`, `source_locator` |
| `configure_business_rules` | Calibrates SLA wait limits and staff fatigue recovery thresholds. | `rules_group_id`, `rule_overrides` |

### 📚 MCP Resources:
- `equipment://catalog` — Live equipment inventory in JSON format.
- `equipment://stats` — Operational metrics: occupancy rate, active stations, total power load.
- `facility://layout` — Architectural room boundaries, dimensions, and capacities.

### 💡 MCP Prompts:
- `audit_equipment` — AI agent prompt to conduct a space and inventory audit, identifying underutilized or excess equipment.
- `daily_maintenance_check` — Checklist prompt for equipment servicing and status tracking.

---

## [05] 4-LAYER 2.5D VISUAL PIPELINE & MODULAR WALL OCCLUSION

1. **Layer 1 — Base Isometric Grid & Modular 2.5D Walls (`BaseGridLayer`):**
   - Open-floor architectural stage (`diorama_master.png`) with independent draggable 2.5D wall sprites (`wall_front_shoji`, `wall_back_shoji`, `wall_partition`, `wall_onsen`, `wall_reception`, `wall_garden`).
   - Diagonal plane projection depth sorting (`recomputeAllDepths()`) so walls partially occlude objects and characters physically behind them while objects in front render cleanly in front of the wall.
   - Pixel-art silhouette contour outline on hover/focus/drag and via `[#] Highlight All Objects` (zero artificial floor drop shadows).
2. **Layer 2 — Additive Light Shader (`LightShaderLayer`):**
   - Warm `#FFAA33` additive glow (`Phaser.BlendModes.ADD`) with sinusoidal pulsing $I(t) = I_0 + A \cdot \sin(\omega t)$ on active treatment beds and lanterns.
3. **Layer 3 — Particle Emitters (`ParticleLayer`):**
   - Onsen cypress steam, tea table vapor, gold coin fountain on `payment_received`, SLA violation smoke, and 5-star review sakura petals.
4. **Layer 4 — Monospace World HUD (`WorldHUDLayer`):**
   - High-contrast OpenCode monospace session countdown badges (`[+] SESSION · 59:59`), stamina progress bars, and `[!] BREAK NEEDED` alerts.

---

## [06] STAMINA ENGINE MODEL

$$\text{Stamina}_{t} = \max\left(0, \; \min\left(100, \; \text{Stamina}_{t-1} - (\Delta t_{\text{work}} \cdot k_{\text{drain}}) + (\Delta t_{\text{break}} \cdot k_{\text{regen}})\right)\right)$$

* **Deep Thai Massage:** $k_{\text{drain}} = 0.55\text{ min}^{-1}$, $k_{\text{regen}} = 0.80\text{ min}^{-1}$.
* **Aroma / Facial Therapy:** $k_{\text{drain}} = 0.20\text{ min}^{-1}$, $k_{\text{regen}} = 1.00\text{ min}^{-1}$.
* When stamina drops below $20\%$, staff state transitions to `exhausted` and triggers the `[!] BREAK NEEDED` HUD alert.

---

## [07] DESIGN SYSTEM
All UI chrome, sidebars, drawers, and canvas HUD elements strictly follow the **OpenCode Design System** documented in [`DESIGN-opencode.ai.md`](DESIGN-opencode.ai.md):
- **100% Monospace Typography** (`Berkeley Mono`, `JetBrains Mono`, `IBM Plex Mono`)
- **Warm Alabaster Light Chrome (`#fdfcfc`) + Deep Carbon Dark Viewport (`#201d1d`)**
- **Exposed `1px` Hairline Grid Architecture** (`0px` container radius, `4px` button radius, zero drop shadows)

---

## [08] LICENSE
MIT License (c) 2026 SpatialTwin Contributors.
