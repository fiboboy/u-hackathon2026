import { z } from "zod";
import { WorldSchema } from "./world.js";
import { EntitySchema, EntityStateSchema } from "./entity.js";

export const WsEventTypeSchema = z.enum([
  "INIT_WORLD",
  "ENTITY_UPDATED",
  "ENTITY_PLACED",
  "ENTITY_REMOVED",
  "TRIGGER_EFFECT",
  "METRIC_TICK",
  "STREAM_DATA_RECEIVED",
]);
export type WsEventType = z.infer<typeof WsEventTypeSchema>;

export const WsMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INIT_WORLD"),
    payload: WorldSchema,
  }),
  z.object({
    type: z.literal("ENTITY_UPDATED"),
    payload: z.object({
      id: z.string(),
      state: EntityStateSchema.partial(),
    }),
  }),
  z.object({
    type: z.literal("ENTITY_PLACED"),
    payload: EntitySchema,
  }),
  z.object({
    type: z.literal("ENTITY_REMOVED"),
    payload: z.object({
      id: z.string(),
    }),
  }),
  z.object({
    type: z.literal("TRIGGER_EFFECT"),
    payload: z.object({
      entity_id: z.string().optional(),
      effect: z.enum([
        "coin_fountain",
        "sakura_bloom",
        "rain_cloud",
        "irritation_smoke",
        "chest_jump",
        "light_glow",
        "tea_bubble",
        "coffee_bubble",
      ]),
      intensity: z.number().default(1.0),
      duration_ms: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("METRIC_TICK"),
    payload: z.object({
      timestamp: z.number(),
      updates: z.array(
        z.object({
          id: z.string(),
          stamina: z.number().optional(),
          current_session_seconds_left: z.number().optional(),
          wait_duration_seconds: z.number().optional(),
        })
      ),
    }),
  }),
  z.object({
    type: z.literal("STREAM_DATA_RECEIVED"),
    payload: z.object({
      binding_id: z.string(),
      entity_id: z.string(),
      raw_value: z.any(),
      extracted_value: z.any(),
    }),
  }),
]);
export type WsMessage = z.infer<typeof WsMessageSchema>;
