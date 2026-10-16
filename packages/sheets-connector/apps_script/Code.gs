/**
 * SpatialTwin Google Apps Script Integration
 *
 * Setup Instructions:
 * 1. Open your Google Spreadsheet.
 * 2. Navigate to: Extensions -> Apps Script.
 * 3. Paste this code into Code.gs.
 * 4. Replace BRIDGE_WEBHOOK_URL with the public URL of your Cloud Bridge (e.g., via ngrok or tunnel).
 * 5. Save the project. Every cell edit now updates the SpatialTwin 2.5D diorama in real time.
 */

var BRIDGE_WEBHOOK_URL = "http://localhost:8000/api/v1/webhook/google_sheets";

function onEdit(e) {
  if (!e || !e.range) return;

  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  var cellA1 = e.range.getA1Notation();
  var oldValue = e.oldValue || "";
  var newValue = e.value || "";

  var payload = {
    source: "google_sheets",
    sheet: sheetName,
    cell: cellA1,
    old_value: oldValue,
    new_value: newValue,
    timestamp: new Date().toISOString()
  };

  // Special mapping for demo bed 01
  if (cellA1 === "B2" && String(newValue).toLowerCase().indexOf("session") !== -1) {
    payload.booking = {
      bed_id: "massage_bed_01",
      duration_minutes: 60
    };
  }

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch(BRIDGE_WEBHOOK_URL, options);
  } catch (err) {
    Logger.log("SpatialTwin Webhook Error: " + err);
  }
}
