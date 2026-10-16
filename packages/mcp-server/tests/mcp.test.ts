import test from "node:test";
import assert from "node:assert";
import { SpatialTwinMcpServer } from "../src/server.js";
import { equipmentStore } from "../src/equipmentStore.js";

test("SpatialTwinMcpServer initializes with equipment tools and resources", () => {
  const mcp = new SpatialTwinMcpServer("http://localhost:8000");
  const server = mcp.getMcpServer();
  assert.ok(server);
});

test("equipmentStore lists seeded initial equipment", () => {
  const items = equipmentStore.list();
  assert.ok(items.length >= 10, "Should have initial equipment seeded");
  
  const onsen = equipmentStore.get("onsen_tub_01");
  assert.ok(onsen);
  assert.strictEqual(onsen.room, "suite_onsen");
});

test("equipmentStore adds new equipment with auto-slot placement", () => {
  const newDevice = equipmentStore.add({
    id: "cryo_sauna_test",
    name: "Cryo Sauna Unit",
    category: "thermal",
    asset_type: "onsen_tub",
    room: "suite_onsen",
    power_kw: 3.5
  });

  assert.strictEqual(newDevice.id, "cryo_sauna_test");
  assert.ok(typeof newDevice.grid_x === "number");
  assert.ok(typeof newDevice.grid_y === "number");

  const fetched = equipmentStore.get("cryo_sauna_test");
  assert.strictEqual(fetched?.name, "Cryo Sauna Unit");
});

test("equipmentStore removes equipment (удалить лишнее оборудование)", () => {
  const removed = equipmentStore.remove("cryo_sauna_test");
  assert.strictEqual(removed.id, "cryo_sauna_test");
  assert.strictEqual(equipmentStore.get("cryo_sauna_test"), undefined);
});

test("equipmentStore updates equipment status and room", () => {
  const updated = equipmentStore.update("massage_bed_02", {
    status: "in_service",
    condition: "excellent",
    maintenance_notes: "Acupressure oil replenished."
  });

  assert.strictEqual(updated.status, "in_service");
  assert.strictEqual(updated.condition, "excellent");
});

test("equipmentStore calculates facility statistics correctly", () => {
  const stats = equipmentStore.getStats();
  assert.ok(stats.total > 0);
  assert.ok(stats.total_power_kw > 0);
  assert.ok(stats.equipment_by_room["suite_aromatherapy"] >= 1);
});
