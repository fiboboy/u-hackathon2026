import { z } from "zod";

export const RuleActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("emit_particles"),
    emitter_id: z.string(),
    duration_ms: z.number().optional(),
  }),
  z.object({
    type: z.literal("apply_shader"),
    shader_id: z.string(),
    tint: z.string().optional(),
  }),
  z.object({
    type: z.literal("show_bubble"),
    icon: z.string(),
    duration_ms: z.number().optional(),
  }),
  z.object({
    type: z.literal("notify"),
    channel: z.string(),
    message: z.string().optional(),
  }),
  z.object({
    type: z.literal("set_status"),
    status: z.string(),
  }),
]);
export type RuleAction = z.infer<typeof RuleActionSchema>;

export const ThresholdRuleSchema = z.object({
  operator: z.enum([">=", "<=", ">", "<", "=="]),
  value: z.number(),
  state_label: z.string().optional(),
  actions: z.array(RuleActionSchema).default([]),
});
export type ThresholdRule = z.infer<typeof ThresholdRuleSchema>;

export const RuleGroupSchema = z.object({
  rules_group_id: z.string().min(1),
  metric_tracked: z.string().min(1),
  thresholds: z.array(ThresholdRuleSchema),
  description: z.string().optional(),
});
export type RuleGroup = z.infer<typeof RuleGroupSchema>;

export const StaminaProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  drain_rate_per_min: z.number().default(0.55), // Thai power massage: 0.55/min
  regen_rate_per_min: z.number().default(0.80), // Break: 0.80/min
  critical_threshold: z.number().default(20.0), // Below 20%: exhausted
});
export type StaminaProfile = z.infer<typeof StaminaProfileSchema>;
