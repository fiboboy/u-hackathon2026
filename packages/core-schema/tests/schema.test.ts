import test from "node:test";
import assert from "node:assert";
import { WorldSchema, EntitySchema, RuleGroupSchema } from "../src/index.js";

test("WorldSchema should validate blueprint default world", () => {
  const sampleWorld = {
    $schema: "https://spatialtwin.org/schemas/v1/world.json",
    version: "1.0.0",
    meta: {
      title: "Zen Massage & Onsen Spa",
      theme: "japanese_wood_zen",
      dimensions: { grid_x: 16, grid_y: 12, tile_width: 64, tile_height: 32 }
    },
    entities: [
      {
        id: "massage_bed_01",
        type: "station",
        asset_type: "massage_bed_wood",
        grid_position: { x: 3, y: 2 },
        footprint: { w: 2, h: 1 },
        state: {
          status: "idle",
          current_session_seconds_left: 0
        },
        rules_group_id: "standard_treatment_bed"
      },
      {
        id: "reception_lounge_sofa",
        type: "lounge",
        asset_type: "sofa_armchair",
        grid_position: { x: 10, y: 8 },
        footprint: { w: 2, h: 1 },
        state: {
          status: "waiting",
          wait_duration_seconds: 120
        },
        rules_group_id: "guest_waiting_rules"
      }
    ],
    rules_groups: [
      {
        rules_group_id: "guest_waiting_rules",
        metric_tracked: "guest_wait_duration_seconds",
        thresholds: [
          {
            operator: ">=",
            value: 600,
            state_label: "tea_served_comfort",
            actions: [{ type: "show_bubble", icon: "tea_cup" }]
          },
          {
            operator: ">=",
            value: 1800,
            state_label: "critical_breach",
            actions: [
              { type: "emit_particles", emitter_id: "irritation_smoke" },
              { type: "apply_shader", shader_id: "warning_tint_pulse" }
            ]
          }
        ]
      }
    ],
    data_streams: []
  };

  const parsed = WorldSchema.parse(sampleWorld);
  assert.strictEqual(parsed.entities.length, 2);
  assert.strictEqual(parsed.entities[0].id, "massage_bed_01");
  assert.strictEqual(parsed.rules_groups[0].rules_group_id, "guest_waiting_rules");
});

test("EntitySchema should validate and apply defaults", () => {
  const minimalEntity = {
    id: "chest_01",
    type: "chest",
    asset_type: "cash_chest",
    grid_position: { x: 5, y: 5 },
  };

  const parsed = EntitySchema.parse(minimalEntity);
  assert.strictEqual(parsed.footprint.w, 1);
  assert.strictEqual(parsed.footprint.h, 1);
  assert.strictEqual(parsed.state.status, "idle");
  assert.strictEqual(parsed.state.stamina, 100);
});
