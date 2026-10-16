import type { IncomingMessage, ServerResponse } from "node:http";
import { equipmentStore, SALON_ROOMS } from "./_lib/equipmentStore.js";

// Global map to hold active SSE streams for sessions
declare global {
  // eslint-disable-next-line no-var
  var __MCP_SSE_SESSIONS__: Map<string, ServerResponse> | undefined;
}

if (!globalThis.__MCP_SSE_SESSIONS__) {
  globalThis.__MCP_SSE_SESSIONS__ = new Map();
}
const sseSessions = globalThis.__MCP_SSE_SESSIONS__;

// Defined MCP Tools Catalog
const MCP_TOOLS = [
  {
    name: "list_equipment",
    description: "Lists equipment and operational stations in the facility (massage beds, Hinoki onsen tubs, POS counters, saunas, tea tables, diffusers). Supports filtering by room, category, and status.",
    inputSchema: {
      type: "object",
      properties: {
        room: {
          type: "string",
          description: "Filter by room: 'reception', 'waiting_lounge', 'suite_aromatherapy', 'suite_onsen', 'suite_double_massage', 'general'"
        },
        category: {
          type: "string",
          enum: ["station", "wellness_device", "thermal", "lounge", "sanitary", "decor"],
          description: "Filter by equipment category"
        },
        status: {
          type: "string",
          enum: ["idle", "in_service", "maintenance", "cleaning", "offline"],
          description: "Filter by operational status"
        }
      }
    }
  },
  {
    name: "add_equipment",
    description: "Adds a new piece of equipment or treatment station to the facility (e.g. massage bed, facial steamer, onsen tub, tea table). Auto-calculates available grid coordinates if omitted.",
    inputSchema: {
      type: "object",
      required: ["id", "name"],
      properties: {
        id: {
          type: "string",
          description: "Unique identifier, e.g. 'cryo_chamber_vip', 'facial_steamer_01', 'massage_bed_03'"
        },
        name: {
          type: "string",
          description: "Human-readable title, e.g. 'Cryotherapy Chamber Pro'"
        },
        category: {
          type: "string",
          enum: ["station", "wellness_device", "thermal", "lounge", "sanitary", "decor"],
          default: "station",
          description: "Equipment category"
        },
        asset_type: {
          type: "string",
          default: "massage_bed_wood",
          description: "Visual sprite identifier from atlas: 'massage_bed_wood', 'onsen_tub', 'reception_desk', 'sofa_armchair', 'tea_table', 'bamboo_plant', 'cash_chest', 'ambient_lantern'"
        },
        room: {
          type: "string",
          default: "general",
          description: "Target room: 'reception', 'waiting_lounge', 'suite_aromatherapy', 'suite_onsen', 'suite_double_massage', 'general'"
        },
        grid_x: {
          type: "integer",
          description: "Grid X coordinate (0-15). If omitted, finds best open slot automatically"
        },
        grid_y: {
          type: "integer",
          description: "Grid Y coordinate (0-11). If omitted, finds best open slot automatically"
        },
        footprint_w: {
          type: "integer",
          default: 1,
          description: "Footprint width in tiles"
        },
        footprint_h: {
          type: "integer",
          default: 1,
          description: "Footprint height in tiles"
        },
        status: {
          type: "string",
          enum: ["idle", "in_service", "maintenance", "cleaning", "offline"],
          default: "idle"
        },
        power_kw: {
          type: "number",
          description: "Power rating in kW (e.g. 2.4)"
        },
        serial_number: {
          type: "string",
          description: "Serial number or asset tag"
        },
        maintenance_notes: {
          type: "string",
          description: "Maintenance or setup notes"
        }
      }
    }
  },
  {
    name: "remove_equipment",
    description: "Decommissions and removes a redundant, broken, or excess piece of equipment from the facility by its ID ('удалить лишнее оборудование').",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: {
          type: "string",
          description: "ID of the equipment to remove, e.g. 'massage_bed_02', 'diffuser_aromatherapy_01'"
        },
        reason: {
          type: "string",
          description: "Reason for removal, e.g. 'routine decommission', 'excess furniture', 'floor re-spacing'"
        }
      }
    }
  },
  {
    name: "update_equipment",
    description: "Updates operational status (idle, in_service, maintenance, cleaning, offline), condition, room location, assigned staff, or notes of existing equipment.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Equipment ID to update" },
        status: { type: "string", enum: ["idle", "in_service", "maintenance", "cleaning", "offline"] },
        condition: { type: "string", enum: ["excellent", "good", "needs_service", "critical"] },
        room: { type: "string", description: "Relocate to room" },
        assigned_staff_id: { type: "string", description: "Assigned staff member ID" },
        maintenance_notes: { type: "string", description: "Updated maintenance notes" },
        grid_x: { type: "integer", description: "New grid X coordinate" },
        grid_y: { type: "integer", description: "New grid Y coordinate" }
      }
    }
  },
  {
    name: "get_equipment",
    description: "Fetches full telemetry, specifications, power rating, and maintenance logs for a specific equipment ID.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Equipment ID" }
      }
    }
  },
  {
    name: "clear_inactive_equipment",
    description: "Bulk removes offline, excess, or critically degraded equipment from the facility to optimize space and operational efficiency.",
    inputSchema: {
      type: "object",
      properties: {
        criteria: {
          type: "string",
          enum: ["offline", "maintenance", "unused", "all_excess"],
          default: "all_excess",
          description: "Filter criteria for bulk cleanup"
        }
      }
    }
  },
  {
    name: "get_facility_layout",
    description: "Returns facility room names, boundaries, capacity, and current equipment distribution per room.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "place_object",
    description: "Places a station, furniture, or decor onto the isometric grid. Instantly syncs to web diorama.",
    inputSchema: {
      type: "object",
      required: ["id", "asset_type", "grid_x", "grid_y"],
      properties: {
        id: { type: "string" },
        asset_type: { type: "string" },
        grid_x: { type: "integer" },
        grid_y: { type: "integer" },
        footprint_w: { type: "integer", default: 1 },
        footprint_h: { type: "integer", default: 1 },
        entity_type: { type: "string", enum: ["station", "lounge", "chest", "staff", "guest", "decor"], default: "station" },
        name: { type: "string" }
      }
    }
  },
  {
    name: "remove_object",
    description: "Removes an object from the diorama and unbinds associated data streams.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" }
      }
    }
  },
  {
    name: "bind_data_stream",
    description: "Binds a physical object to a Google Sheets cell or CRM webhook selector.",
    inputSchema: {
      type: "object",
      required: ["entity_id", "source_type", "source_locator"],
      properties: {
        entity_id: { type: "string" },
        source_type: { type: "string", enum: ["google_sheets", "webhook_crm", "rest_poller"] },
        source_locator: { type: "string" },
        visual_trigger: { type: "string", default: "light_glow" }
      }
    }
  },
  {
    name: "configure_business_rules",
    description: "Configures SLA waiting thresholds and staff stamina policies.",
    inputSchema: {
      type: "object",
      required: ["rules_group_id", "rule_overrides"],
      properties: {
        rules_group_id: { type: "string" },
        rule_overrides: { type: "object" }
      }
    }
  }
];

// Helper to execute tool calls
async function executeTool(name: string, args: Record<string, any> = {}) {
  switch (name) {
    case "list_equipment": {
      const items = equipmentStore.list({
        room: args.room,
        category: args.category,
        status: args.status
      });
      const stats = equipmentStore.getStats();
      return {
        status: "success",
        count: items.length,
        facility_summary: stats,
        equipment: items
      };
    }
    case "add_equipment": {
      const created = equipmentStore.add(args as any);
      return {
        status: "success",
        message: `Successfully added equipment '${created.id}' (${created.name}) to room '${created.room}' at grid (${created.grid_x}, ${created.grid_y}).`,
        equipment: created
      };
    }
    case "remove_equipment": {
      const removed = equipmentStore.remove(args.id);
      return {
        status: "success",
        message: `Successfully removed equipment '${args.id}' (${removed.name})${args.reason ? ` - Reason: ${args.reason}` : ""}.`,
        freed_slot: { room: removed.room, grid_x: removed.grid_x, grid_y: removed.grid_y },
        remaining_inventory_count: equipmentStore.list().length
      };
    }
    case "update_equipment": {
      const { id, ...patch } = args;
      const updated = equipmentStore.update(id, patch);
      return {
        status: "success",
        message: `Successfully updated equipment '${id}'.`,
        equipment: updated
      };
    }
    case "get_equipment": {
      const item = equipmentStore.get(args.id);
      if (!item) throw new Error(`Equipment '${args.id}' not found in registry.`);
      return item;
    }
    case "clear_inactive_equipment": {
      const removed = equipmentStore.clearInactive(args.criteria || "all_excess");
      return {
        status: "success",
        criteria: args.criteria || "all_excess",
        removed_count: removed.length,
        removed_items: removed.map((i) => ({ id: i.id, name: i.name, room: i.room })),
        remaining_inventory_count: equipmentStore.list().length
      };
    }
    case "get_facility_layout": {
      const stats = equipmentStore.getStats();
      return {
        grid_dimensions: { width: 16, height: 12 },
        rooms: SALON_ROOMS,
        distribution: stats.equipment_by_room,
        stats
      };
    }
    case "place_object": {
      const item = equipmentStore.add({
        id: args.id,
        name: args.name || args.id,
        asset_type: args.asset_type,
        category: args.entity_type === "station" ? "station" : args.entity_type === "lounge" ? "lounge" : "decor",
        room: "general",
        grid_x: args.grid_x,
        grid_y: args.grid_y,
        footprint_w: args.footprint_w || 1,
        footprint_h: args.footprint_h || 1,
        status: "idle"
      });
      return {
        status: "success",
        message: `Placed object '${args.id}' (${args.asset_type}) at grid (${args.grid_x}, ${args.grid_y}).`,
        entity: item
      };
    }
    case "remove_object": {
      try {
        equipmentStore.remove(args.id);
      } catch {}
      return {
        status: "success",
        message: `Removed object '${args.id}' from diorama.`
      };
    }
    case "bind_data_stream": {
      return {
        status: "success",
        message: `Bound entity '${args.entity_id}' to ${args.source_type} (${args.source_locator}).`,
        binding: args
      };
    }
    case "configure_business_rules": {
      return {
        status: "success",
        message: `Updated business rules for group '${args.rules_group_id}'.`,
        rules_group: args
      };
    }
    default:
      throw new Error(`Tool '${name}' not recognized.`);
  }
}

// JSON-RPC Request Handler
async function handleJsonRpc(body: any, baseUrl: string) {
  const { jsonrpc, id, method, params } = body || {};

  if (jsonrpc !== "2.0" && !method) {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32600, message: "Invalid JSON-RPC 2.0 Request" }
    };
  }

  switch (method) {
    case "initialize": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: false, listChanged: false },
            prompts: { listChanged: false }
          },
          serverInfo: {
            name: "spatialtwin-mcp",
            version: "1.1.0"
          },
          instructions: "SpatialTwin MCP Server enables autonomous agents and human operators to inspect, add, update, and remove equipment or stations in the Zen Wellness & Spa diorama."
        }
      };
    }

    case "notifications/initialized": {
      return null; // Notifications do not send a response in JSON-RPC
    }

    case "ping": {
      return {
        jsonrpc: "2.0",
        id,
        result: {}
      };
    }

    case "tools/list": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: MCP_TOOLS
        }
      };
    }

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const executionResult = await executeTool(toolName, toolArgs);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(executionResult, null, 2)
              }
            ],
            isError: false
          }
        };
      } catch (err: any) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `Error executing tool '${toolName}': ${err.message}`
              }
            ],
            isError: true
          }
        };
      }
    }

    case "resources/list": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          resources: [
            {
              uri: `${baseUrl}/equipment/catalog`,
              name: "equipment://catalog",
              description: "Complete equipment inventory in JSON format",
              mimeType: "application/json"
            },
            {
              uri: `${baseUrl}/equipment/stats`,
              name: "equipment://stats",
              description: "Live facility statistics, occupancy, and power metrics",
              mimeType: "application/json"
            },
            {
              uri: `${baseUrl}/facility/layout`,
              name: "facility://layout",
              description: "Facility room boundaries, dimensions, and capacity",
              mimeType: "application/json"
            }
          ]
        }
      };
    }

    case "resources/read": {
      const uri = params?.uri || "";
      if (uri.includes("catalog")) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(equipmentStore.list(), null, 2)
              }
            ]
          }
        };
      } else if (uri.includes("stats")) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(equipmentStore.getStats(), null, 2)
              }
            ]
          }
        };
      } else {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(SALON_ROOMS, null, 2)
              }
            ]
          }
        };
      }
    }

    case "prompts/list": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          prompts: [
            {
              name: "audit_equipment",
              description: "Audit facility equipment, identify underutilized or redundant stations, and recommend removals.",
              arguments: []
            },
            {
              name: "daily_maintenance_check",
              description: "Generate a daily maintenance & inspection checklist for all active equipment.",
              arguments: []
            }
          ]
        }
      };
    }

    case "prompts/get": {
      const promptName = params?.name;
      if (promptName === "audit_equipment") {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            description: "Audit facility equipment and optimize space",
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Please audit the current facility equipment:\n1. Call 'list_equipment' to inspect all items.\n2. Identify any idle or excess equipment that should be removed via 'remove_equipment'.\n3. Check if critical rooms have sufficient capacity based on 'get_facility_layout'.\n4. Formulate an optimization recommendation.`
                }
              }
            ]
          }
        };
      }
      return {
        jsonrpc: "2.0",
        id,
        result: {
          description: "Daily maintenance check",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Inspect active equipment using 'list_equipment' and check for items needing maintenance or cleaning."
              }
            }
          ]
        }
      };
    }

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method '${method}' not found.`
        }
      };
  }
}

// Generate sleek Web Console HTML
function renderWebConsole(host: string, proto: string): string {
  const currentHost = host || "fearless-bohr-pink.vercel.app";
  const baseUrl = `${proto}://${currentHost}`;
  const items = equipmentStore.list();
  const stats = equipmentStore.getStats();

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        "spatialtwin-spa": {
          url: `${baseUrl}/api/mcp?sse=true`
        }
      }
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        "spatialtwin-spa": {
          url: `${baseUrl}/api/mcp?sse=true`,
          transport: "sse"
        }
      }
    },
    null,
    2
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpatialTwin · Production MCP Server</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #121111;
      --card-bg: #1c1a1a;
      --border: #2e2b2b;
      --border-accent: #ffaa33;
      --text: #e6e4e4;
      --text-muted: #8e8b8b;
      --accent: #ffaa33;
      --green: #4ade80;
      --red: #f87171;
      --blue: #60a5fa;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      padding: 24px;
    }
    .container { max-width: 1180px; margin: 0 auto; }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border: 1px solid var(--border-accent);
      background: rgba(255, 170, 51, 0.1);
      color: var(--accent);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-live {
      border-color: var(--green);
      background: rgba(74, 222, 128, 0.1);
      color: var(--green);
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 16px;
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-val { font-size: 26px; font-weight: 700; color: #fff; margin: 4px 0; }
    .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th { text-align: left; padding: 8px; border-bottom: 1px solid var(--border); color: var(--text-muted); font-size: 11px; text-transform: uppercase; }
    td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    tr:hover td { background: rgba(255,255,255,0.02); }
    .status-pill {
      display: inline-block;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      border: 1px solid;
    }
    .status-in_service { border-color: var(--green); color: var(--green); }
    .status-idle { border-color: var(--blue); color: var(--blue); }
    .status-maintenance { border-color: var(--red); color: var(--red); }
    pre {
      background: #0a0909;
      border: 1px solid var(--border);
      padding: 12px;
      overflow-x: auto;
      font-size: 11.5px;
      color: #7dd3fc;
      margin-top: 8px;
    }
    .btn {
      background: #252222;
      border: 1px solid var(--border);
      color: #fff;
      padding: 6px 12px;
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn:hover { border-color: var(--accent); color: var(--accent); }
    .btn-danger { color: var(--red); border-color: rgba(248, 113, 113, 0.4); }
    .btn-danger:hover { background: rgba(248, 113, 113, 0.1); border-color: var(--red); }
    .btn-primary { background: var(--accent); color: #000; font-weight: 600; border-color: var(--accent); }
    .btn-primary:hover { background: #ffbb55; color: #000; }
    .form-row { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    input, select {
      background: #0a0909;
      border: 1px solid var(--border);
      color: #fff;
      padding: 6px 10px;
      font-family: inherit;
      font-size: 12px;
      outline: none;
    }
    input:focus, select:focus { border-color: var(--accent); }
    .tester-area {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 12px;
    }
    @media (max-width: 768px) {
      .tester-area { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1 style="font-size: 18px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
          <span>SPATIALTWIN</span>
          <span style="color: var(--accent);">·</span>
          <span>MCP SERVER</span>
          <span class="badge badge-live">● LIVE v1.1.0</span>
        </h1>
        <p style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">
          Model Context Protocol endpoint for autonomous AI agents & digital twin diorama.
        </p>
      </div>
      <div>
        <a href="/" class="btn" style="text-decoration: none; margin-right: 8px;">← Diorama View</a>
        <a href="/api/equipment" class="btn" style="text-decoration: none;" target="_blank">REST API JSON</a>
      </div>
    </header>

    <!-- KPI Cards -->
    <div class="grid">
      <div class="card">
        <div class="stat-label">Total Equipment</div>
        <div class="stat-val" id="val-total">${stats.total} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">units</span></div>
        <div style="font-size: 11px; color: var(--text-muted);">Active in Zen Wellness & Spa</div>
      </div>
      <div class="card">
        <div class="stat-label">In Service (Occupied)</div>
        <div class="stat-val" style="color: var(--green);">${stats.in_service} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">stations</span></div>
        <div style="font-size: 11px; color: var(--text-muted);">Occupancy: ${stats.occupancy_rate_pct}%</div>
      </div>
      <div class="card">
        <div class="stat-label">Idle / Available</div>
        <div class="stat-val" style="color: var(--blue);">${stats.idle} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">stations</span></div>
        <div style="font-size: 11px; color: var(--text-muted);">Ready for immediate booking</div>
      </div>
      <div class="card">
        <div class="stat-label">Total Power Load</div>
        <div class="stat-val" style="color: var(--accent);">${stats.total_power_kw} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">kW</span></div>
        <div style="font-size: 11px; color: var(--text-muted);">Telemetry load balance</div>
      </div>
    </div>

    <!-- Agent Quick Connect -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-title">
        <span>[+] CONNECT ANY AI AGENT (CLAUDE DESKTOP, CURSOR, ANTIGRAVITY)</span>
        <span class="badge">SSE / JSON-RPC</span>
      </div>
      <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 8px;">
        Add this server to your agent's config to grant it the ability to list, add, update, and remove facility equipment:
      </p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <div style="font-size: 11px; color: var(--accent); font-weight: 600;">Claude Desktop (~/claude_desktop_config.json):</div>
          <pre>${claudeConfig}</pre>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--accent); font-weight: 600;">Cursor (~/.cursor/mcp.json):</div>
          <pre>${cursorConfig}</pre>
        </div>
      </div>
    </div>

    <!-- Live Equipment Inventory Table & Add Form -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-title">
        <span>[#] FACILITY EQUIPMENT REGISTRY (${items.length} ITEMS)</span>
        <button class="btn btn-primary" onclick="toggleAddForm()">+ Add New Equipment</button>
      </div>

      <!-- Add Equipment Form (collapsible) -->
      <div id="add-form" style="display: none; background: #0c0a0a; border: 1px solid var(--border); padding: 12px; margin-bottom: 16px;">
        <div style="font-size: 12px; font-weight: 600; color: var(--accent); margin-bottom: 8px;">PROVISION NEW EQUIPMENT / STATION</div>
        <div class="form-row">
          <input type="text" id="new-id" placeholder="ID (e.g. cryo_bath_01)" style="flex: 1; min-width: 140px;">
          <input type="text" id="new-name" placeholder="Name (e.g. Cryotherapy Bath)" style="flex: 1.5; min-width: 180px;">
          <select id="new-room" style="flex: 1; min-width: 140px;">
            <option value="suite_onsen">Suite: Onsen</option>
            <option value="suite_aromatherapy">Suite: Aromatherapy</option>
            <option value="suite_double_massage">Suite: Double Massage</option>
            <option value="waiting_lounge">Waiting Lounge</option>
            <option value="reception">Reception</option>
            <option value="general">General Floor</option>
          </select>
          <select id="new-category" style="flex: 1; min-width: 120px;">
            <option value="thermal">Thermal</option>
            <option value="station">Station</option>
            <option value="wellness_device">Wellness Device</option>
            <option value="lounge">Lounge</option>
            <option value="decor">Decor</option>
          </select>
          <select id="new-asset" style="flex: 1; min-width: 130px;">
            <option value="onsen_tub">onsen_tub</option>
            <option value="massage_bed_wood">massage_bed_wood</option>
            <option value="tea_table">tea_table</option>
            <option value="sofa_armchair">sofa_armchair</option>
            <option value="ambient_lantern">ambient_lantern</option>
            <option value="bamboo_plant">bamboo_plant</option>
          </select>
          <button class="btn btn-primary" onclick="submitAddEquipment()">Confirm Add</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Room / Zone</th>
            <th>Category</th>
            <th>Grid Slot</th>
            <th>Power</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="equipment-rows">
          ${items
            .map(
              (eq) => `
            <tr id="row-${eq.id}">
              <td style="font-weight: 600; color: #fff;">${eq.id}</td>
              <td>${eq.name}</td>
              <td style="color: var(--accent);">${eq.room}</td>
              <td><span class="badge" style="font-size: 9px; padding: 2px 6px;">${eq.category}</span></td>
              <td>(${eq.grid_x}, ${eq.grid_y})</td>
              <td>${eq.power_kw ?? 0} kW</td>
              <td><span class="status-pill status-${eq.status}">${eq.status}</span></td>
              <td>
                <button class="btn btn-danger" style="padding: 2px 8px; font-size: 11px;" onclick="deleteEquipment('${eq.id}')">Delete</button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <!-- Live JSON-RPC Agent Tester -->
    <div class="card">
      <div class="card-title">
        <span>[&gt;] LIVE JSON-RPC 2.0 AGENT TESTER</span>
        <div style="display: flex; gap: 6px;">
          <button class="btn" onclick="setPreset('tools/list')">tools/list</button>
          <button class="btn" onclick="setPreset('list_equipment')">list_equipment</button>
          <button class="btn" onclick="setPreset('add_equipment')">add_equipment</button>
          <button class="btn" onclick="setPreset('remove_equipment')">remove_equipment</button>
          <button class="btn" onclick="setPreset('ping')">ping</button>
        </div>
      </div>
      <div class="tester-area">
        <div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">REQUEST (POST /api/mcp):</div>
          <textarea id="rpc-req" style="width: 100%; height: 220px; background: #0a0909; border: 1px solid var(--border); color: #4ade80; font-family: inherit; font-size: 12px; padding: 8px; resize: vertical;"></textarea>
          <div style="margin-top: 8px;">
            <button class="btn btn-primary" onclick="sendRpc()">Send JSON-RPC Request</button>
          </div>
        </div>
        <div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">RESPONSE:</div>
          <textarea id="rpc-res" readonly style="width: 100%; height: 220px; background: #0a0909; border: 1px solid var(--border); color: #7dd3fc; font-family: inherit; font-size: 12px; padding: 8px; resize: vertical;"></textarea>
        </div>
      </div>
    </div>
  </div>

  <script>
    function toggleAddForm() {
      const f = document.getElementById('add-form');
      f.style.display = f.style.display === 'none' ? 'block' : 'none';
    }

    async function submitAddEquipment() {
      const id = document.getElementById('new-id').value.trim();
      const name = document.getElementById('new-name').value.trim();
      const room = document.getElementById('new-room').value;
      const category = document.getElementById('new-category').value;
      const asset_type = document.getElementById('new-asset').value;

      if (!id || !name) {
        alert('Please specify both ID and Name');
        return;
      }

      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, room, category, asset_type })
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert('Error: ' + data.error);
      }
    }

    async function deleteEquipment(id) {
      if (!confirm('Are you sure you want to remove equipment "' + id + '"?')) return;
      const res = await fetch('/api/equipment?id=' + encodeURIComponent(id), {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        const row = document.getElementById('row-' + id);
        if (row) row.remove();
        alert('Successfully deleted ' + id);
      } else {
        alert('Error: ' + data.error);
      }
    }

    const PRESETS = {
      'tools/list': {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {}
      },
      'list_equipment': {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "list_equipment",
          arguments: { room: "suite_onsen" }
        }
      },
      'add_equipment': {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "add_equipment",
          arguments: {
            id: "cedar_sauna_02",
            name: "Cedar Herbal Steam Barrel",
            category: "thermal",
            asset_type: "onsen_tub",
            room: "suite_onsen",
            power_kw: 3.2
          }
        }
      },
      'remove_equipment': {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "remove_equipment",
          arguments: {
            id: "cedar_sauna_02",
            reason: "Space optimization"
          }
        }
      },
      'ping': {
        jsonrpc: "2.0",
        id: 5,
        method: "ping"
      }
    };

    function setPreset(key) {
      document.getElementById('rpc-req').value = JSON.stringify(PRESETS[key], null, 2);
    }
    setPreset('tools/list');

    async function sendRpc() {
      const reqText = document.getElementById('rpc-req').value;
      const resArea = document.getElementById('rpc-res');
      resArea.value = 'Sending...';

      try {
        const parsed = JSON.parse(reqText);
        const res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });
        const json = await res.json();
        resArea.value = JSON.stringify(json, null, 2);
      } catch (err) {
        resArea.value = 'Error: ' + err.message;
      }
    }
  </script>
</body>
</html>`;
}

// Vercel Serverless Function Handler
export default async function handler(req: IncomingMessage & { query?: Record<string, string>; body?: any }, res: ServerResponse) {
  // 1. CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, mcp-session-id");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const acceptHeader = (req.headers.accept || "").toLowerCase();
  const host = req.headers.host || "fearless-bohr-pink.vercel.app";
  const proto = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";

  // 2. Handle SSE Connection (GET with Accept: text/event-stream or ?sse=true)
  const isSse = acceptHeader.includes("text/event-stream") || queryParams.sse === "true" || url.pathname.endsWith("/sse");
  if (req.method === "GET" && isSse) {
    const sessionId = `mcp-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    // Send the endpoint event according to MCP SSE Spec
    const postEndpoint = `/api/mcp?sessionId=${sessionId}`;
    res.write(`event: endpoint\ndata: ${postEndpoint}\n\n`);

    sseSessions.set(sessionId, res);

    const keepAliveTimer = setInterval(() => {
      res.write(": keepalive\n\n");
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAliveTimer);
      sseSessions.delete(sessionId);
    });

    return;
  }

  // 3. Handle Browser GET request (render Documentation and Live Web Console)
  if (req.method === "GET") {
    if (acceptHeader.includes("application/json") || queryParams.format === "json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          {
            name: "spatialtwin-mcp",
            version: "1.1.0",
            protocolVersion: "2024-11-05",
            status: "online",
            tools: MCP_TOOLS,
            endpoints: {
              sse: `${proto}://${host}/api/mcp?sse=true`,
              rpc: `${proto}://${host}/api/mcp`,
              equipment_rest: `${proto}://${host}/api/equipment`
            }
          },
          null,
          2
        )
      );
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderWebConsole(host, proto));
    return;
  }

  // 4. Handle POST Requests (MCP JSON-RPC 2.0)
  if (req.method === "POST") {
    let body = req.body;
    if (!body) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString("utf-8");
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }
    }

    const sessionId = (queryParams.sessionId || req.headers["mcp-session-id"] || "") as string;
    const sseClient = sessionId ? sseSessions.get(sessionId) : null;

    const rpcResponse = await handleJsonRpc(body, `${proto}://${host}`);

    // If active SSE session, send event: message over SSE
    if (sseClient && rpcResponse) {
      sseClient.write(`event: message\ndata: ${JSON.stringify(rpcResponse)}\n\n`);
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "delivered_via_sse", sessionId }));
      return;
    }

    // Direct JSON-RPC response
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rpcResponse));
    return;
  }

  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
