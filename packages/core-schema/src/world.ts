import { z } from "zod";
import { EntitySchema } from "./entity.js";
import { RuleGroupSchema } from "./rules.js";

export const WorldDimensionsSchema = z.object({
  grid_x: z.number().int().min(4).max(64).default(16),
  grid_y: z.number().int().min(4).max(64).default(12),
  tile_width: z.number().int().default(64),
  tile_height: z.number().int().default(32),
});
export type WorldDimensions = z.infer<typeof WorldDimensionsSchema>;

export const WorldMetaSchema = z.object({
  title: z.string().default("SpatialTwin Diorama"),
  theme: z.string().default("japanese_wood_zen"),
  dimensions: WorldDimensionsSchema.default({}),
  description: z.string().optional(),
});
export type WorldMeta = z.infer<typeof WorldMetaSchema>;

export const DataStreamBindingSchema = z.object({
  id: z.string(),
  entity_id: z.string(),
  source_type: z.enum(["google_sheets", "webhook_crm", "rest_poller"]),
  source_locator: z.string(), // e.g. "Sheet1!D5" or JSONPath "$.payment.amount"
  visual_trigger: z.string().default("highlight"),
  last_synced_at: z.string().optional(),
});
export type DataStreamBinding = z.infer<typeof DataStreamBindingSchema>;

export const WorldSchema = z.object({
  $schema: z.string().optional(),
  version: z.string().default("1.0.0"),
  meta: WorldMetaSchema.default({}),
  entities: z.array(EntitySchema).default([]),
  rules_groups: z.array(RuleGroupSchema).default([]),
  data_streams: z.array(DataStreamBindingSchema).default([]),
});
export type World = z.infer<typeof WorldSchema>;
