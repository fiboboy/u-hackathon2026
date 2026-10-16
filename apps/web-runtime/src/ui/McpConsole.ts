export interface McpLogEntry {
  timestamp: string;
  type: "MCP:IN" | "MCP:OUT" | "PIPELINE" | "ENGINE" | "SYNC";
  message: string;
  payload?: any;
}

export class McpConsole {
  private containerEl!: HTMLElement;
  private logListEl!: HTMLElement;
  private headerEl!: HTMLElement;
  private minBtn!: HTMLButtonElement;
  private isMinimized = false;

  public onToolTestRequested?: (toolName: string, args: Record<string, any>) => void;

  constructor() {
    this.initElements();
  }

  private initElements() {
    this.containerEl = document.getElementById("mcp-console-widget") as HTMLElement;
    this.logListEl = document.getElementById("mcp-log-stream") as HTMLElement;
    this.headerEl = document.getElementById("mcp-console-header") as HTMLElement;
    this.minBtn = document.getElementById("mcp-toggle-min") as HTMLButtonElement;

    this.minBtn?.addEventListener("click", () => this.toggleMinimize());
    this.headerEl?.addEventListener("dblclick", () => this.toggleMinimize());

    document.getElementById("btn-mcp-clear")?.addEventListener("click", () => {
      this.clear();
      this.logEngine("CONSOLE_CLEARED", "Terminal stream reset by operator");
    });

    document.getElementById("btn-mcp-test-place")?.addEventListener("click", () => {
      this.onToolTestRequested?.("place_station", {
        asset_type: "cedar_tub_pixel",
        footprint: "2x2",
        grid_x: 9,
        grid_y: 8,
        label: "Cedar Herbal Tub"
      });
    });

    document.getElementById("btn-mcp-test-remove")?.addEventListener("click", () => {
      this.onToolTestRequested?.("remove_object", {
        id: "cedar_tub_ai_01"
      });
    });

    document.getElementById("btn-mcp-test-bind")?.addEventListener("click", () => {
      this.onToolTestRequested?.("bind_data_stream", {
        station_id: "onsen_tub_01",
        data_source: "Sheet1!F12",
        metric: "phytotherapy_timer"
      });
    });

    document.getElementById("btn-mcp-test-list-eq")?.addEventListener("click", async () => {
      this.logMcpIn("list_equipment", {});
      try {
        const res = await fetch("/api/equipment");
        const data = await res.json();
        this.logMcpOut("list_equipment", { count: data.count, summary: data.summary });
      } catch (err: any) {
        this.logMcpOut("list_equipment", { error: err.message });
      }
    });

    document.getElementById("btn-mcp-test-add-eq")?.addEventListener("click", async () => {
      const sample = {
        id: `cryo_pod_${Date.now().toString().slice(-4)}`,
        name: "Cryotherapy Recovery Pod",
        category: "thermal",
        asset_type: "onsen_tub",
        room: "suite_onsen",
        power_kw: 4.8
      };
      this.logMcpIn("add_equipment", sample);
      try {
        const res = await fetch("/api/equipment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sample)
        });
        const data = await res.json();
        this.logMcpOut("add_equipment", data);
      } catch (err: any) {
        this.logMcpOut("add_equipment", { error: err.message });
      }
    });

    document.getElementById("btn-mcp-test-del-eq")?.addEventListener("click", async () => {
      this.logMcpIn("remove_equipment", { reason: "Decommissioning excess equipment" });
      try {
        const resList = await fetch("/api/equipment");
        const listData = await resList.json();
        const items = listData.equipment || [];
        const toDelete = items.find((i: any) => i.id.startsWith("cryo_pod_")) || items[items.length - 1];
        if (toDelete && items.length > 5) {
          const res = await fetch(`/api/equipment?id=${encodeURIComponent(toDelete.id)}`, { method: "DELETE" });
          const data = await res.json();
          this.logMcpOut("remove_equipment", data);
        } else {
          this.logMcpOut("remove_equipment", { status: "preserved", message: "Minimum core equipment preserved" });
        }
      } catch (err: any) {
        this.logMcpOut("remove_equipment", { error: err.message });
      }
    });

    // Initial system boot logs
    this.logEngine("SYSTEM_INIT", "SpatialTwin Remote MCP Server active on /api/mcp (SSE & JSON-RPC ready)");
    this.logMcpIn("tools/list", { count: 11, server: "spatialtwin-mcp", protocol: "2024-11-05" });
    this.logMcpOut("tools/list", {
      available_tools: [
        "list_equipment",
        "add_equipment",
        "remove_equipment",
        "update_equipment",
        "get_equipment",
        "clear_inactive_equipment",
        "get_facility_layout",
        "place_object",
        "remove_object",
        "bind_data_stream",
        "configure_business_rules"
      ]
    });
  }

  private getTimestamp(): string {
    const d = new Date();
    return d.toTimeString().split(" ")[0];
  }

  public logMcpIn(toolName: string, args: Record<string, any>) {
    this.appendEntry("MCP:IN", `tools/call -> ${toolName}`, args);
  }

  public logMcpOut(toolName: string, result: Record<string, any>) {
    this.appendEntry("MCP:OUT", `result -> ${toolName}`, result);
  }

  public logPipeline(stepNum: number, totalSteps: number, name: string, detail?: string) {
    const msg = `[${stepNum}/${totalSteps}] ${name}${detail ? ` -> ${detail}` : ""}`;
    this.appendEntry("PIPELINE", msg);
  }

  public logEngine(event: string, message: string) {
    this.appendEntry("ENGINE", `${event} : ${message}`);
  }

  public logSync(message: string, payload?: any) {
    this.appendEntry("SYNC", message, payload);
  }

  private appendEntry(type: McpLogEntry["type"], message: string, payload?: any) {
    if (!this.logListEl) return;

    const row = document.createElement("div");
    row.className = `mcp-log-row mcp-type-${type.replace(":", "-").toLowerCase()}`;

    const timeSpan = document.createElement("span");
    timeSpan.className = "mcp-time";
    timeSpan.textContent = `[${this.getTimestamp()}]`;

    const tagSpan = document.createElement("span");
    tagSpan.className = "mcp-tag";
    tagSpan.textContent = `[${type}]`;

    const msgSpan = document.createElement("span");
    msgSpan.className = "mcp-msg";
    msgSpan.textContent = message;

    row.appendChild(timeSpan);
    row.appendChild(tagSpan);
    row.appendChild(msgSpan);

    if (payload !== undefined) {
      const payloadCode = document.createElement("span");
      payloadCode.className = "mcp-payload";
      payloadCode.textContent = " " + JSON.stringify(payload);
      row.appendChild(payloadCode);
    }

    this.logListEl.appendChild(row);

    // Keep scrolled to bottom
    this.logListEl.scrollTop = this.logListEl.scrollHeight;

    // Cap history at 120 lines
    while (this.logListEl.children.length > 120) {
      this.logListEl.removeChild(this.logListEl.firstChild!);
    }
  }

  public toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    if (this.containerEl) {
      this.containerEl.classList.toggle("minimized", this.isMinimized);
      if (this.minBtn) {
        this.minBtn.textContent = this.isMinimized ? "[+]" : "[-]";
      }
    }
  }

  public clear() {
    if (this.logListEl) {
      this.logListEl.innerHTML = "";
    }
  }
}

export const mcpConsole = new McpConsole();
