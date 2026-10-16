import { z } from "zod";

export const GridPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});
export type GridPosition = z.infer<typeof GridPositionSchema>;

export const FootprintSchema = z.object({
  w: z.number().int().min(1).default(1),
  h: z.number().int().min(1).default(1),
});
export type Footprint = z.infer<typeof FootprintSchema>;

export const EntityTypeSchema = z.enum([
  "station",
  "lounge",
  "chest",
  "staff",
  "guest",
  "decor",
  "kiosk"
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const EntityStatusSchema = z.enum([
  "idle",
  "in_service",
  "waiting",
  "exhausted",
  "alert",
  "cleaning"
]);
export type EntityStatus = z.infer<typeof EntityStatusSchema>;

export const EntityStateSchema = z.object({
  status: EntityStatusSchema.default("idle"),
  current_session_seconds_left: z.number().min(0).default(0),
  total_session_seconds: z.number().min(0).default(0),
  stamina: z.number().min(0).max(100).default(100),
  wait_duration_seconds: z.number().min(0).default(0),
  assigned_staff_id: z.string().optional(),
  assigned_guest_id: z.string().optional(),
  custom_data: z.record(z.any()).default({}),
});
export type EntityState = z.infer<typeof EntityStateSchema>;

export const EntitySchema = z.object({
  id: z.string().min(1),
  type: EntityTypeSchema,
  asset_type: z.string().min(1),
  grid_position: GridPositionSchema,
  footprint: FootprintSchema.default({ w: 1, h: 1 }),
  state: EntityStateSchema.default({}),
  rules_group_id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});
export type Entity = z.infer<typeof EntitySchema>;
