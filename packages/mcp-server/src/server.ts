import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class SpatialTwinMcpServer {
  private server: McpServer;
  private bridgeUrl: string;

  constructor(bridgeUrl = "http://localhost:8000") {
    this.bridgeUrl = bridgeUrl;
    this.server = new McpServer({
      name: "spatialtwin-mcp",
      version: "1.0.0",
    });

    this.registerTools();
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

  private registerTools() {
    // 1. get_layout
    this.server.tool(
      "get_layout",
      "Returns isometric grid size, coordinates of existing entities, occupied tiles, free slots, and active data streams.",
      {},
      async () => {
        try {
          const layout = await this.fetchBridge("/api/v1/world/layout");
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(layout, null, 2),
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

    // 2. place_object
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
          const res = await this.fetchBridge("/api/v1/world/entities", {
            method: "POST",
            body: JSON.stringify(params),
          });
          return {
            content: [
              {
                type: "text",
                text: `Successfully placed object '${params.id}' (${params.asset_type}) at grid (${params.grid_x}, ${params.grid_y}).\nDetails: ${JSON.stringify(res.entity, null, 2)}`,
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

    // 3. remove_object
    this.server.tool(
      "remove_object",
      "Removes an object from the diorama and unbinds associated data streams.",
      {
        id: z.string().describe("ID of the entity to remove, e.g. 'lounge_sofa_01'"),
      },
      async ({ id }) => {
        try {
          const res = await this.fetchBridge(`/api/v1/world/entities/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
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

    // 4. bind_data_stream
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
          });
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

    // 5. configure_business_rules
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
          });
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
}
