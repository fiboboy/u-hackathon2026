/**
 * Google Sheets Poller and Simulator for SpatialTwin
 */

export interface SheetCellEvent {
  sheetName: string;
  cell: string;
  oldValue: string;
  newValue: string;
}

export class SheetsPoller {
  private bridgeUrl: string;

  constructor(bridgeUrl = "http://localhost:8000") {
    this.bridgeUrl = bridgeUrl;
  }

  public async notifyBridge(cellEvent: SheetCellEvent) {
    console.log(`[SheetsConnector] Cell update detected: ${cellEvent.sheetName}!${cellEvent.cell} = "${cellEvent.newValue}"`);
    try {
      const resp = await fetch(`${this.bridgeUrl}/api/v1/webhook/google_sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "google_sheets",
          event: cellEvent,
          booking: {
            bed_id: "massage_bed_01",
            duration_minutes: 60
          }
        })
      });
      const data = await resp.json();
      console.log(`[SheetsConnector] Bridge acknowledged update:`, data);
    } catch (err: any) {
      console.error(`[SheetsConnector] Failed to notify bridge: ${err.message}`);
    }
  }

  public async runInteractiveSimulator() {
    console.log("==================================================");
    console.log("  SpatialTwin: Google Sheets Simulator");
    console.log("==================================================");
    console.log("Simulating operator editing cell Sheet1!B2 -> 'Session 60m'...");
    
    await this.notifyBridge({
      sheetName: "Sheet1",
      cell: "B2",
      oldValue: "Available",
      newValue: "Session 60m"
    });

    console.log("Simulated successfully. Check diorama client to verify amber light and timer.");
  }
}

// CLI
if (process.argv[1] && process.argv[1].includes("poller")) {
  const bridge = process.env.SPATIALTWIN_BRIDGE_URL || "http://localhost:8000";
  const poller = new SheetsPoller(bridge);
  poller.runInteractiveSimulator();
}
