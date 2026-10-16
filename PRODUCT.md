# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

TypeScript, Phaser 3.87, Vite 6, FastAPI 0.115, Python 3.12, WebSockets, Model Context Protocol (MCP), OpenCode Monospace Design System.

## Users

Small business operators, wellness and spa salon managers, franchise operations directors, and digital twin system architects seeking intuitive real-time visibility into physical spaces and business telemetry.

## Product Purpose

SpatialTwin transforms static business metrics, CRM customer queues, and ERP spreadsheets into a tactile, real-time 2.5D isometric pixel-art spatial diorama where human operators and autonomous AI agents collaborate to optimize operations.

## Positioning

Traditional BI dashboards suffer from low operator engagement (viewed 3–5 minutes a week). SpatialTwin delivers high **Active Visualized Hours (AVH)** — a persistent, living digital twin running on venue reception screens and manager monitors that provides peripheral awareness of room utilization, customer SLA thresholds, staff fatigue, and physical equipment bottlenecks.

## Operating Context

- **Front-of-House:** Persistent reception displays showing live customer sessions, bath statuses, and guest wait times.
- **Back-of-House:** Management dashboard for floor redesign, station commissioning, and staff scheduling.
- **AI Agent Orchestration:** Claude Desktop / Cursor agents managing spatial operations via the Model Context Protocol (MCP) in real-time.

## Capabilities and Constraints

- **4-Layer Isometric Render Pipeline:** Depth-sorted entity grid, dynamic 2D lighting shaders with pulsing lantern masks, particle simulation (onsen steam, tea vapor, coin fountains, sakura bloom, SLA smoke), and live HUD overlays (countdown timers, stamina meters, speech bubbles).
- **Module 1: Asset Studio & Inventory Drawer:** Categorized inventory panel grouped by room (Treatment Rooms, Onsen Bath, Reception Lounge, Decor & Plants), drag-and-drop to isometric canvas with Snap-to-Grid, and live synchronization badges (`[IN ATLAS]`, `[QUEUED]`, `[PLACEHOLDER]`).
- **Module 2: AI Asset Creator Modal:** Natural language prompt input, reference photo upload (Image-to-Asset), footprint dimensions ($1 \times 1$, $2 \times 1$, $2 \times 2$ tiles), 4-stage pipeline stepper (AI Engine -> rembg -> Pixel Snapper -> Atlas Injection), and side-by-side approval preview.
- **Module 3: In-Canvas Construction State:** Semi-transparent blueprint wireframe with wooden scaffolding and animated pixel construction dust during generation; hot-reloads texture upon atlas injection without page reload.
- **Module 4: MCP Console & Event Log:** Monospace TUI terminal stream displaying live MCP tool calls (`place_station`, `remove_object`, `bind_data_stream`) and system webhooks.
- **District City Map Integration:** Fullscreen Bangkok RCA Alley navigation with corner minimap widget and bidirectional building transitions.

## Brand Commitments

- Strict adherence to `DESIGN-opencode.ai.md` (OpenCode monospace editorial terminal aesthetic).
- Monospace typography (`Berkeley Mono`, `JetBrains Mono`, `IBM Plex Mono`).
- Dark viewport canvas (`#201d1d`), `#fdfcfc` editorial cards, 1px crisp hairlines, warm amber `#ffaa33` accent, zero unnecessary decorative shadows.
- 100% English terminology and interface copy.

## Evidence on Hand

- Verified 2.5D pixel-art spa with 30 interactive entities and modular walls.
- Fullscreen Bangkok RCA District Map (1024x571) with interactive salon beacon.
- Production deployment on Vercel: `https://fearless-bohr-pink.vercel.app`.
- Public GitHub repository: `https://github.com/fiboboy/u-hackathon2026`.

## Product Principles

1. **Peripheral Awareness First:** Operations should be immediately graspable through spatial visual cues rather than tabular lookup.
2. **Tactile Direct Manipulation:** Every piece of furniture, wall, and character can be inspected, dragged, flipped, or navigated on grid.
3. **Graceful Asynchronous Pipeline:** Never freeze the viewport during AI asset generation; provide animated construction states and seamless hot-reloads.
4. **Transparent AI Agency:** Every external AI modification is logged with exact tool signatures in the operator's MCP console.
