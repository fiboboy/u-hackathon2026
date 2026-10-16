import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { equipmentStore, SALON_ROOMS } from "./equipmentStore.js";

export class SpatialTwinMcpServer {
  private server: McpServer;
  private bridgeUrl: string;

  constructor(bridgeUrl = "http://localhost:8000") {
    this.bridgeUrl = bridgeUrl;
    this.server = new McpServer({
      name: "spatialtwin-mcp",
      version: "1.1.0",
    });

    this.registerEquipmentTools();
    this.registerSpatialTools();
    this.registerResources();
    this.registerPrompts();
  }

  public getMcpServer(): McpServer {
    return this.server;
  }

  private async fetchBridge(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.bridgeUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Bridge returned error ${response.status}: ${text}`);
      }
      return await response.json();
    } catch (err: any) {
      throw new Error(`Failed to communicate with SpatialTwin Cloud Bridge at ${url}: ${err.message}`);
    }
  }

  /**
   * Equipment Management Tools for AI Agents
   */
  private registerEquipmentTools() {
    // 1. list_equipment
    this.server.tool(
      "list_equipment",
      "Lists equipment and operational stations in the facility (massage beds, Hinoki onsen tubs, POS counters, saunas, tea tables, diffusers). Supports filtering by room, category, and status.",
      {
        room: z.string().optional().describe("Filter by room/zone: 'reception', 'waiting_lounge', 'suite_aromatherapy', 'suite_onsen', 'suite_double_massage'"),
        category: z.enum(["station", "wellness_device", "thermal", "lounge", "sanitary", "decor"]).optional().describe("Filter by category"),
        status: z.enum(["idle", "in_service", "maintenance", "cleaning", "offline"]).optional().describe("Filter by operational status"),
      },
      async (filter) => {
        try {
          const items = equipmentStore.list(filter);
          const stats = equipmentStore.getStats();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "success",
                    count: items.length,
                    facility_summary: stats,
                    equipment: items,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // 2. add_equipment
    this.server.tool(
      "add_equipment",
      "Adds a new piece of equipment or treatment station to the facility (e.g. massage bed, facial steamer, onsen tub, tea table). Auto-calculates available grid coordinates if omitted.",
      {
        id: z.string().describe("Unique identifier, e.g. 'cryo_chamber_vip', 'facial_steamer_01', 'massage_bed_03'"),
        name: z.string().describe("Human-readable title, e.g. 'Cryotherapy Chamber Pro'"),
        category: z.enum(["station", "wellness_device", "thermal", "lounge", "sanitary", "decor"]).default("station").describe("Equipment category"),
        asset_type: z.string().default("massage_bed_wood").describe("Visual sprite identifier from atlas: 'massage_bed_wood', 'onsen_tub', 'reception_desk', 'sofa_armchair', 'tea_table', 'bamboo_plant', 'cash_chest', 'ambient_lantern'"),
        room: z.string().default("general").describe("Target room: 'reception', 'waiting_lounge', 'suite_aromatherapy', 'suite_onsen', 'suite_double_massage', 'general'"),
        grid_x: z.number().int().optional().describe("Grid X coordinate (0-15). If omitted, finds best open slot automatically"),
        grid_y: z.number().int().optional().describe("Grid Y coordinate (0-11). If omitted, finds best open slot automatically"),
        footprint_w: z.number().int().default(1).describe("Footprint width in tiles (default 1)"),
        footprint_h: z.number().int().default(1).describe("Footprint height in tiles (default 1)"),
        status: z.enum(["idle", "in_service", "maintenance", "cleaning", "offline"]).default("idle").describe("Initial status"),
        power_kw: z.number().optional().describe("Power consumption in kW (e.g. 2.5)"),
        serial_number: z.string().optional().describe("Manufacturer serial number"),
        maintenance_notes: z.string().optional().describe("Maintenance specifications or calibration notes"),
      },
      async (params) => {
        try {
          const created = equipmentStore.add(params);

          // Attempt async notification to cloud bridge if online (fail-safe)
          this.fetchBridge("/api/v1/world/entities", {
            method: "POST",
            body: JSON.stringify({
              id: created.id,
              name: created.name,
              asset_type: created.asset_type,
              grid_x: created.grid_x,
              grid_y: created.grid_y,
              footprint_w: created.footprint_w,
              footprint_h: created.footprint_h,
              entity_type: created.category === "station" ? "station" : "decor",
              state: {
                status: created.status,
                custom_data: {
                  power_kw: created.power_kw,
                  room: created.room,
                  serial_number: created.serial_number,
                },
              },
            }),
          }).catch(() => {});

          return {
            content: [
              {
                type: "text",
                text: `Successfully added equipment '${created.id}' (${created.name}) in room '${created.room}' at grid (${created.grid_x}, ${created.grid_y}).\nDetails: ${JSON.stringify(created, null, 2)}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // 3. remove_equipment ("удалить лишнее оборудование")
    this.server.tool(
      "remove_equipment",
      "Decommissions and removes a redundant, broken, or excess piece of equipment from the facility by its ID.",
      {
        id: z.string().describe("ID of the equipment to remove, e.g. 'massage_bed_02', 'diffuser_aromatherapy_01'"),
        reason: z.string().optional().describe("Reason for removal, e.g. 'routine decommission', 'excess furniture', 'floor re-spacing'"),
      },
      async ({ id, reason }) => {
        try {
          const removed = equipmentStore.remove(id);

          // Fail-safe notification to cloud bridge
          this.fetchBridge(`/api/v1/world/entities/${encodeURIComponent(id)}`, {
            method: "DELETE",
          }).catch(() => {});

          return {
            content: [
              {
                type: "text",
                text: `Successfully removed equipment '${id}' (${removed.name})${reason ? ` for reason: ${reason}` : ""}.\nFreed slot at room '${removed.room}', grid (${removed.grid_x}, ${removed.grid_y}). Total active inventory is now ${equipmentStore.list().length} items.`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // 4. update_equipment
    this.server.tool(
      "update_equipment",
      "Updates operational status (idle, in_service, maintenance, cleaning, offline), condition, room location, assigned staff, or notes of existing equipment.",
      {
        id: z.string().describe("Equipment ID to update"),
        status: z.enum(["idle", "in_service", "maintenance", "cleaning", "offline"]).optional().describe("New operational status"),
        condition: z.enum(["excellent", "good", "needs_service", "critical"]).optional().describe("Physical condition"),
        room: z.string().optional().describe("Relocate to room"),
        assigned_staff_id: z.string().nullable().optional().describe("Assigned therapist/operator ID"),
        maintenance_notes: z.string().optional().describe("Updated maintenance notes"),
        grid_x: z.number().int().optional().describe("Relocate grid X coordinate"),
        grid_y: z.number().int().optional().describe("Relocate grid Y coordinate"),
      },
      async ({ id, ...patch }) => {
        try {
          const updated = equipmentStore.update(id, patch);
          return {
            content: [
              {
                type: "text",
                text: `Successfully updated equipment '${id}'.\nUpdated state: ${JSON.stringify(updated, null, 2)}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // 5. get_equipment
    this.server.tool(
      "get_equipment",
      "Fetches full telemetry, specifications, power rating, and maintenance logs for a specific equipment ID.",
      {
        id: z.string().describe("Equipment ID"),
      },
      async ({ id }) => {
        try {
          const item = equipmentStore.get(id);
          if (!item) {
            throw new Error(`Equipment '${id}' not found in registry.`);
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(item, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // 6. clear_inactive_equipment ("очистить лишнее/неактивное")
    this.server.tool(
      "clear_inactive_equipment",
      "Bulk removes offline, excess, or critically degraded equipment from the facility to optimize space and operational efficiency.",
      {
        criteria: z.enum(["offline", "maintenance", "unused", "all_excess"]).default("all_excess").describe("Filter criteria for bulk cleanup"),
      },
      async ({ criteria }) => {
        try {
          const removed = equipmentStore.clearInactive(criteria);
          return {
            content: [
              {
                type: "text",
                text: `Bulk equipment cleanup completed (criteria: ${criteria}). Removed ${removed.length} item(s):\n${removed.map((i) => ` - [${i.id}] ${i.name} (${i.room})`).join("\n") || "None matched criteria"}\nRemaining inventory: ${equipmentStore.list().length} items.`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // 7. get_facility_layout
    this.server.tool(
      "get_facility_layout",
      "Returns facility room names, boundaries, capacity, and current equipment distribution per room.",
      {},
      async () => {
        try {
          const stats = equipmentStore.getStats();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    grid_dimensions: { width: 16, height: 12 },
                    rooms: SALON_ROOMS,
                    distribution: stats.equipment_by_room,
                    stats,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );
  }

  /**
   * Spatial & Diorama Tools (backward compatible with existing frontend diorama)
   */
  private registerSpatialTools() {
    // get_layout
    this.server.tool(
      "get_layout",
      "Returns isometric grid size, coordinates of existing entities, occupied tiles, free slots, and active data streams.",
      {},
      async () => {
        try {
          const items = equipmentStore.list();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    grid_size: { x: 16, y: 12 },
                    entities: items.map((i) => ({
                      id: i.id,
                      name: i.name,
                      asset_type: i.asset_type,
                      grid_position: { x: i.grid_x, y: i.grid_y },
                      footprint: { w: i.footprint_w, h: i.footprint_h },
                      state: { status: i.status },
                      room: i.room,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // place_object
    this.server.tool(
      "place_object",
      "Places a station, furniture, or decor onto the isometric grid. Instantly syncs to web diorama.",
      {
        id: z.string().describe("Unique identifier for the object, e.g. 'onsen_tub_vip'"),
        asset_type: z.string().describe("Sprite from the atlas: 'massage_bed_wood', 'onsen_tub', 'reception_desk', 'sofa_armchair', 'tea_table', 'bamboo_plant', 'cash_chest', etc."),
        grid_x: z.number().int().describe("X coordinate on the grid (0 to 15)"),
        grid_y: z.number().int().describe("Y coordinate on the grid (0 to 11)"),
        footprint_w: z.number().int().default(1).describe("Footprint width in tiles (default 1)"),
        footprint_h: z.number().int().default(1).describe("Footprint height in tiles (default 1)"),
        entity_type: z.enum(["station", "lounge", "chest", "staff", "guest", "decor"]).default("station").describe("Entity category"),
        name: z.string().optional().describe("Human-readable title for the entity"),
      },
      async (params) => {
        try {
          const item = equipmentStore.add({
            id: params.id,
            name: params.name || params.id,
            asset_type: params.asset_type,
            category: params.entity_type === "station" ? "station" : params.entity_type === "lounge" ? "lounge" : "decor",
            room: "general",
            grid_x: params.grid_x,
            grid_y: params.grid_y,
            footprint_w: params.footprint_w,
            footprint_h: params.footprint_h,
            status: "idle",
          });

          this.fetchBridge("/api/v1/world/entities", {
            method: "POST",
            body: JSON.stringify(params),
          }).catch(() => {});

          return {
            content: [
              {
                type: "text",
                text: `Successfully placed object '${params.id}' (${params.asset_type}) at grid (${params.grid_x}, ${params.grid_y}).\nDetails: ${JSON.stringify(item, null, 2)}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // remove_object
    this.server.tool(
      "remove_object",
      "Removes an object from the diorama and unbinds associated data streams.",
      {
        id: z.string().describe("ID of the entity to remove, e.g. 'lounge_sofa_01'"),
      },
      async ({ id }) => {
        try {
          try {
            equipmentStore.remove(id);
          } catch {}

          this.fetchBridge(`/api/v1/world/entities/${encodeURIComponent(id)}`, {
            method: "DELETE",
          }).catch(() => {});

          return {
            content: [
              {
                type: "text",
                text: `Successfully removed object '${id}'.`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // bind_data_stream
    this.server.tool(
      "bind_data_stream",
      "Binds a physical object to a Google Sheets cell or CRM webhook selector.",
      {
        entity_id: z.string().describe("Target entity ID, e.g. 'massage_bed_01'"),
        source_type: z.enum(["google_sheets", "webhook_crm", "rest_poller"]).describe("Data source type"),
        source_locator: z.string().describe("Sheet cell coordinate ('Sheet1!D5') or JSONPath ('$.payment.amount')"),
        visual_trigger: z.string().default("light_glow").describe("Visual effect trigger when data updates (e.g. 'light_glow', 'coin_fountain')"),
      },
      async (params) => {
        try {
          const res = await this.fetchBridge("/api/v1/world/bind", {
            method: "POST",
            body: JSON.stringify(params),
          }).catch(() => ({ binding: params }));

          return {
            content: [
              {
                type: "text",
                text: `Bound entity '${params.entity_id}' to data stream ${params.source_type} (${params.source_locator}).\nBinding: ${JSON.stringify(res.binding, null, 2)}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );

    // configure_business_rules
    this.server.tool(
      "configure_business_rules",
      "Configures SLA waiting thresholds and staff stamina policies.",
      {
        rules_group_id: z.string().describe("Group ID, e.g. 'guest_waiting_rules' or 'standard_treatment_bed'"),
        rule_overrides: z.record(z.any()).describe("Custom SLA thresholds and action definitions"),
      },
      async (params) => {
        try {
          const res = await this.fetchBridge("/api/v1/world/rules", {
            method: "POST",
            body: JSON.stringify(params),
          }).catch(() => ({ rules_group: params }));

          return {
            content: [
              {
                type: "text",
                text: `Updated business rules for group '${params.rules_group_id}':\n${JSON.stringify(res.rules_group, null, 2)}`,
              },
            ],
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [{ type: "text", text: error.message }],
          };
        }
      }
    );
  }

  /**
   * MCP Resources
   */
  private registerResources() {
    this.server.resource(
      "equipment-catalog",
      "equipment://catalog",
      { mimeType: "application/json" },
      async () => ({
        contents: [
          {
            uri: "equipment://catalog",
            text: JSON.stringify(equipmentStore.list(), null, 2),
          },
        ],
      })
    );

    this.server.resource(
      "equipment-stats",
      "equipment://stats",
      { mimeType: "application/json" },
      async () => ({
        contents: [
          {
            uri: "equipment://stats",
            text: JSON.stringify(equipmentStore.getStats(), null, 2),
          },
        ],
      })
    );

    this.server.resource(
      "facility-layout",
      "facility://layout",
      { mimeType: "application/json" },
      async () => ({
        contents: [
          {
            uri: "facility://layout",
            text: JSON.stringify(SALON_ROOMS, null, 2),
          },
        ],
      })
    );
  }

  /**
   * MCP Prompts for AI Agents
   */
  private registerPrompts() {
    this.server.prompt(
      "audit_equipment",
      "Prompt the AI agent to audit equipment inventory, identify underutilized stations, and recommend removals or upgrades.",
      {},
      async () => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please audit the current facility equipment:\n1. Call 'list_equipment' to inspect all items.\n2. Identify any idle or excess equipment that should be removed via 'remove_equipment'.\n3. Check if critical rooms have sufficient capacity based on 'get_facility_layout'.\n4. Formulate an optimization recommendation.`,
            },
          },
        ],
      })
    );

    this.server.prompt(
      "daily_maintenance_check",
      "Prompt the AI agent to conduct a daily maintenance checklist and update equipment condition logs.",
      {},
      async () => ({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Perform a maintenance check:\n1. Retrieve items using 'list_equipment'.\n2. Flag any equipment with status 'maintenance' or 'offline'.\n3. Propose updates or cleaning schedules.`,
            },
          },
        ],
      })
    );
  }
}
