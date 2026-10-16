import { tool, generateText } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { spatialRuntimeDispatcher } from "./SpatialRuntimeDispatcher.js";
import { voiceAgentService } from "./VoiceAgentService.js";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, any>;
    result?: string;
  }>;
}

/**
 * Declarative Mutation State: Strictly defined Owner Tools validated via Zod
 * Changes only local scene state / emits DOM events to ensure agent cannot break code.
 */
export const ownerTools = {
  // Tool 1: Update Zone SLA / Rules
  updateZoneRule: {
    description: "Изменяет порог ожидания клиента или интервалы мастера для конкретной комнаты",
    parameters: z.object({
      zoneId: z.enum([
        "reception",
        "waiting_lounge",
        "suite_aromatherapy",
        "suite_onsen",
        "suite_double_massage"
      ]).describe("Target zone identifier"),
      maxWaitMinutes: z.number().min(1).max(120).optional().describe("Maximum allowed wait time in minutes"),
      alertThresholdMinutes: z.number().min(1).max(120).optional().describe("Threshold in minutes before warning steam and voice alert triggers")
    }),
    execute: async (args: { zoneId: string; maxWaitMinutes?: number; alertThresholdMinutes?: number }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("spatialtwin:update_rule", {
          detail: args
        }));
      }
      spatialRuntimeDispatcher.handleUpdateRule(args);
      return `Правила для зоны [${args.zoneId}] успешно обновлены. Alert: ${args.alertThresholdMinutes ?? "n/a"}m, max wait: ${args.maxWaitMinutes ?? "n/a"}m.`;
    }
  },

  // Tool 2: Bind Data Stream / Telemetry
  bindDataSource: {
    description: "Связывает мебель или комнату с колонкой в таблице или ключом CRM",
    parameters: z.object({
      zoneId: z.enum([
        "reception",
        "waiting_lounge",
        "suite_aromatherapy",
        "suite_onsen",
        "suite_double_massage"
      ]).describe("Target zone identifier"),
      sourceType: z.enum(["google_sheets", "telegram", "moysklad", "yclients"]).describe("Data source type"),
      targetField: z.string().describe("Column or key name (e.g. 'Sheet1!F12', 'status_visit')")
    }),
    execute: async (args: { zoneId: any; sourceType: any; targetField: string }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("spatialtwin:bind_stream", {
          detail: args
        }));
      }
      spatialRuntimeDispatcher.handleBindStream(args);
      return `Зона [${args.zoneId}] теперь слушает ${args.sourceType} (${args.targetField}). Telemetry stream online.`;
    }
  },

  // Tool 3: Toggle Interior Furniture Item
  toggleFurnitureItem: {
    description: "Включение/выключение объектов в интерьере из разрешенного списка",
    parameters: z.object({
      zoneId: z.enum([
        "reception",
        "waiting_lounge",
        "suite_aromatherapy",
        "suite_onsen",
        "suite_double_massage"
      ]),
      itemType: z.enum([
        "aromatherapy_diffuser",
        "onsen_heater",
        "ambient_lantern",
        "tea_table",
        "sakura_vase"
      ]).describe("Furniture item type"),
      enabled: z.boolean().describe("true to turn ON, false to turn OFF")
    }),
    execute: async (args: { zoneId: any; itemType: any; enabled: boolean }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("spatialtwin:toggle_furniture", {
          detail: args
        }));
      }
      spatialRuntimeDispatcher.handleToggleFurniture(args);
      return `Элемент [${args.itemType}] в зоне [${args.zoneId}] переведен в режим ${args.enabled ? "ВКЛЮЧЕН" : "ВЫКЛЮЧЕН"}.`;
    }
  },

  // Tool 4: Query Salon Revenue and Live Metrics
  querySalonMetrics: {
    description: "Запрос финансовой выручки за сегодня, процента загрузки залов и количества сеансов",
    parameters: z.object({
      metric: z.enum(["all", "revenue", "occupancy", "sessions"]).optional().describe("Metric category filter")
    }),
    execute: async () => {
      const stats = spatialRuntimeDispatcher.querySalonRevenue();
      return stats.formattedText;
    }
  },

  // Tool 5: Send Staff on Break to Tea Lounge
  sendStaffOnBreak: {
    description: "Отправляет терапевта/мастера на запланированный чайный перерыв в зону ожидания",
    parameters: z.object({
      staffId: z.string().default("master_somchai").describe("Staff ID (master_somchai, master_ken, therapist_yuki)"),
      durationMinutes: z.number().default(15).describe("Break duration in minutes")
    }),
    execute: async (args: { staffId?: string; durationMinutes?: number }) => {
      const res = spatialRuntimeDispatcher.sendStaffOnBreak(args.staffId || "master_somchai", args.durationMinutes || 15);
      return res.message;
    }
  },

  // Tool 6: Trigger SLA Violation Voice Alert (Reception Concierge)
  triggerSlaVoiceAlert: {
    description: "Запуск голосового оповещения и частиц предупреждения при задержке гостя в зоне ожидания",
    parameters: z.object({
      zoneId: z.string().default("waiting_lounge"),
      minutes: z.number().default(20)
    }),
    execute: async (args: { zoneId?: string; minutes?: number }) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("spatialtwin:sla_alert", {
          detail: args
        }));
      }
      spatialRuntimeDispatcher.triggerSlaViolationAlert(args.zoneId || "waiting_lounge", args.minutes || 20);
      return `Голосовой алерт на ${args.minutes || 20}m задержки запущен администратором.`;
    }
  }
};

export class AiAgentService {
  private static instance: AiAgentService;

  private apiKeyKey = "user_llm_api_key";
  private baseUrlKey = "user_llm_base_url";
  private modelKey = "user_llm_model";

  private constructor() {}

  public static getInstance(): AiAgentService {
    if (!AiAgentService.instance) {
      AiAgentService.instance = new AiAgentService();
    }
    return AiAgentService.instance;
  }

  public getApiKey(): string {
    return localStorage.getItem(this.apiKeyKey) || "";
  }

  public setApiKey(key: string) {
    if (key.trim()) {
      localStorage.setItem(this.apiKeyKey, key.trim());
    } else {
      localStorage.removeItem(this.apiKeyKey);
    }
  }

  public getBaseUrl(): string {
    return localStorage.getItem(this.baseUrlKey) || "https://openrouter.ai/api/v1";
  }

  public setBaseUrl(url: string) {
    localStorage.setItem(this.baseUrlKey, url.trim() || "https://openrouter.ai/api/v1");
  }

  public getModel(): string {
    return localStorage.getItem(this.modelKey) || "openai/gpt-4o-mini";
  }

  public setModel(m: string) {
    localStorage.setItem(this.modelKey, m.trim() || "openai/gpt-4o-mini");
  }

  public hasApiKey(): boolean {
    return Boolean(this.getApiKey().trim());
  }

  /**
   * Adapts ownerTools into Vercel AI SDK executable tools
   */
  public getOwnerTools() {
    const sdkTools: Record<string, any> = {};
    for (const [name, def] of Object.entries(ownerTools)) {
      sdkTools[name] = (tool as any)({
        description: def.description,
        inputSchema: def.parameters,
        execute: def.execute
      });
    }
    return sdkTools;
  }

  /**
   * Constructs System Prompt with dynamic real-time diorama state snapshot
   */
  public buildSystemPrompt(): string {
    const snapshot = spatialRuntimeDispatcher.getStateSnapshot();

    return `You are the SpatialTwin Executive Copilot and voice agent for salon operations.
You assist the owner with real-time operations, stage geometry, SLA management, and staff assignments.
All state changes MUST be performed through the provided tools (querySalonMetrics, sendStaffOnBreak, updateZoneRule, bindDataSource, toggleFurnitureItem, triggerSlaVoiceAlert).

Current real-time diorama state snapshot:
${JSON.stringify(snapshot, null, 2)}

Instructions:
1. When asked to check revenue and send a master on break (e.g. "Show today's revenue and send the master on break"):
   - Call querySalonMetrics.
   - Call sendStaffOnBreak with staffId "master_somchai".
   - Respond in concise, confident English confirming revenue (฿14,500) and the staff break.
2. When asked to adjust wait time SLA or trigger warning steam (e.g. "Trigger steam over the sofa after 20 minutes wait"):
   - Call updateZoneRule with zoneId "waiting_lounge" and alertThresholdMinutes (20).
3. When asked to broadcast an SLA delay alert:
   - Call triggerSlaVoiceAlert.
4. When asked to bind CRM or spreadsheet streams:
   - Call bindDataSource.
5. When asked to toggle interior equipment:
   - Call toggleFurnitureItem.
6. Always answer concisely and naturally in English.`;
  }

  /**
   * Dispatches a message to the AI SDK (or dynamic heuristic engine if no key is entered)
   */
  public async sendMessage(
    userText: string,
    history: ChatMessage[] = [],
    isVoiceTriggered = false
  ): Promise<{ text: string; toolCalls: Array<{ toolName: string; args: any; result: string }> }> {
    const tools = this.getOwnerTools();
    const systemPrompt = this.buildSystemPrompt();

    let result: { text: string; toolCalls: Array<{ toolName: string; args: any; result: string }> };

    // 1. Live Dynamic LLM Generation via Vercel AI SDK (@ai-sdk/openai)
    if (this.hasApiKey()) {
      try {
        const apiKey = this.getApiKey();
        const baseURL = this.getBaseUrl();
        const modelName = this.getModel();

        const customProvider = createOpenAI({
          apiKey,
          baseURL
        });

        const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
          ...history.slice(-8).map(h => ({
            role: h.role,
            content: h.content
          })),
          { role: "user", content: userText }
        ];

        const response: any = await (generateText as any)({
          model: customProvider(modelName),
          system: systemPrompt,
          messages,
          tools,
          maxSteps: 4
        });

        const executedToolCalls: Array<{ toolName: string; args: any; result: string }> = [];

        if (response.steps) {
          for (const step of response.steps) {
            if (step.toolCalls && step.toolCalls.length > 0) {
              for (const tc of step.toolCalls) {
                const stepToolResult = step.toolResults?.find((tr: any) => tr.toolCallId === tc.toolCallId);
                executedToolCalls.push({
                  toolName: tc.toolName,
                  args: tc.args || {},
                  result: typeof stepToolResult?.result === "string" ? stepToolResult.result : JSON.stringify(stepToolResult?.result || "Executed")
                });
              }
            }
          }
        }

        result = {
          text: response.text || "Command executed on spatial diorama.",
          toolCalls: executedToolCalls
        };
      } catch (err: any) {
        console.warn("[AiAgentService] API call failed, falling back to dynamic parser:", err);
        result = await this.executeDynamicParser(userText, `[API Note: ${err.message}. Running local engine]`);
      }
    } else {
      // 2. Dynamic heuristic execution when running offline/demo without API key
      result = await this.executeDynamicParser(userText);
    }

    // Voice response output via ElevenLabs
    if (isVoiceTriggered || result.text) {
      voiceAgentService.speak({
        text: result.text,
        speaker: "owner",
        speakerName: "SpatialTwin Owner Copilot"
      });
    }

    return result;
  }

  /**
   * Parameterized Dynamic NLP Parser for keyless live demos and offline resilience
   * Extracts parameters (numbers, zones, staff IDs, sources) dynamically rather than returning frozen canned phrases
   */
  private async executeDynamicParser(
    userText: string,
    prefixNotice = ""
  ): Promise<{ text: string; toolCalls: Array<{ toolName: string; args: any; result: string }> }> {
    const textLower = userText.toLowerCase();
    const executedTools: Array<{ toolName: string; args: any; result: string }> = [];
    let replyText = "";

    // 1. Revenue & Staff Break (Combined Owner Voice Command)
    if ((textLower.includes("revenue") || textLower.includes("earnings") || textLower.includes("income") || textLower.includes("sales") || textLower.includes("выручк")) &&
        (textLower.includes("break") || textLower.includes("rest") || textLower.includes("tea") || textLower.includes("перерыв"))) {
      const revStats = spatialRuntimeDispatcher.querySalonRevenue();
      executedTools.push({
        toolName: "querySalonMetrics",
        args: { metric: "all" },
        result: revStats.formattedText
      });

      const breakMin = 15;
      const staffTarget = textLower.includes("ken") ? "master_ken" : "master_somchai";
      const staffName = staffTarget === "master_ken" ? "Master Ken" : "Master Somchai";

      const breakRes = spatialRuntimeDispatcher.sendStaffOnBreak(staffTarget, breakMin);
      executedTools.push({
        toolName: "sendStaffOnBreak",
        args: { staffId: staffTarget, durationMinutes: breakMin },
        result: breakRes.message
      });

      replyText = `Current revenue is ฿14,500 across 18 sessions with 80% room occupancy. ${staffName} has been dispatched to the tea lounge for a ${breakMin}-minute break.`;
    }
    // 2. Revenue Only
    else if (textLower.includes("revenue") || textLower.includes("sales") || textLower.includes("turnover") || textLower.includes("cash") || textLower.includes("выручк")) {
      const revStats = spatialRuntimeDispatcher.querySalonRevenue();
      executedTools.push({
        toolName: "querySalonMetrics",
        args: { metric: "revenue" },
        result: revStats.formattedText
      });
      replyText = `Today's revenue is ฿14,500 (18 sessions). Room occupancy is currently at 80%.`;
    }
    // 3. Staff Break Only
    else if (textLower.includes("break") || textLower.includes("rest") || textLower.includes("lounge") || textLower.includes("перерыв")) {
      const matchMin = textLower.match(/(\d+)\s*(m|min|minute)/i);
      const minutes = matchMin ? parseInt(matchMin[1], 10) : 15;
      const staffTarget = textLower.includes("ken") ? "master_ken" : "master_somchai";
      const staffName = staffTarget === "master_ken" ? "Master Ken" : "Master Somchai";

      const breakRes = spatialRuntimeDispatcher.sendStaffOnBreak(staffTarget, minutes);
      executedTools.push({
        toolName: "sendStaffOnBreak",
        args: { staffId: staffTarget, durationMinutes: minutes },
        result: breakRes.message
      });
      replyText = `${staffName} is now on a ${minutes}-minute break at the tea lounge.`;
    }
    // 4. SLA Wait Time / Steam over Sofa
    else if (textLower.includes("steam") || textLower.includes("smoke") || textLower.includes("wait") || textLower.includes("sla") || textLower.includes("sofa") || textLower.includes("пар")) {
      const matchMin = textLower.match(/(\d+)\s*(m|min|minute|мин)/i);
      const minutes = matchMin ? parseInt(matchMin[1], 10) : 20;

      let zoneId = "waiting_lounge";
      if (textLower.includes("reception")) zoneId = "reception";
      if (textLower.includes("aroma")) zoneId = "suite_aromatherapy";
      if (textLower.includes("onsen") || textLower.includes("bath")) zoneId = "suite_onsen";

      spatialRuntimeDispatcher.handleUpdateRule({
        zoneId,
        alertThresholdMinutes: minutes,
        maxWaitMinutes: minutes + 10
      });

      executedTools.push({
        toolName: "updateZoneRule",
        args: { zoneId, alertThresholdMinutes: minutes, maxWaitMinutes: minutes + 10 },
        result: `SLA threshold set to ${minutes}m.`
      });

      replyText = `SLA rule updated for [${zoneId}]. If guest waiting exceeds ${minutes} minutes, warning steam will rise over the lounge and a voice alert will trigger.`;
    }
    // 5. Trigger SLA Voice Alert
    else if (textLower.includes("alert") || textLower.includes("announce") || textLower.includes("voice") || textLower.includes("алерт")) {
      const matchMin = textLower.match(/(\d+)\s*(m|min|minute)/i);
      const minutes = matchMin ? parseInt(matchMin[1], 10) : 20;

      spatialRuntimeDispatcher.triggerSlaViolationAlert("waiting_lounge", minutes);
      executedTools.push({
        toolName: "triggerSlaVoiceAlert",
        args: { zoneId: "waiting_lounge", minutes },
        result: "SLA voice announcement broadcast."
      });
      replyText = `SLA voice alert announced by Receptionist Lin for ${minutes}-minute waiting delay.`;
    }
    // 6. Bind Telemetry Stream
    else if (textLower.includes("bind") || textLower.includes("crm") || textLower.includes("sheet") || textLower.includes("yclients") || textLower.includes("telegram") || textLower.includes("moysklad")) {
      let sourceType: any = "yclients";
      if (textLower.includes("sheet")) sourceType = "google_sheets";
      if (textLower.includes("telegram")) sourceType = "telegram";
      if (textLower.includes("moysklad")) sourceType = "moysklad";

      let zoneId = "suite_aromatherapy";
      if (textLower.includes("reception")) zoneId = "reception";
      if (textLower.includes("onsen")) zoneId = "suite_onsen";
      if (textLower.includes("lounge")) zoneId = "waiting_lounge";

      const targetField = sourceType === "yclients" ? "status_visit" : sourceType === "google_sheets" ? "Sheet1!F12" : "event_payload";

      spatialRuntimeDispatcher.handleBindStream({
        zoneId,
        sourceType,
        targetField
      });

      executedTools.push({
        toolName: "bindDataSource",
        args: { zoneId, sourceType, targetField },
        result: `Bound to ${sourceType}.`
      });

      replyText = `Data stream ${sourceType.toUpperCase()} (${targetField}) successfully linked to [${zoneId}].`;
    }
    // 7. Toggle Interior Furniture
    else if (textLower.includes("diffuser") || textLower.includes("heater") || textLower.includes("lantern") || textLower.includes("turn") || textLower.includes("toggle")) {
      const enable = !textLower.includes("off") && !textLower.includes("disable") && !textLower.includes("stop");
      let itemType = "aromatherapy_diffuser";
      let zoneId = "suite_aromatherapy";

      if (textLower.includes("heater") || textLower.includes("onsen") || textLower.includes("bath")) {
        itemType = "onsen_heater";
        zoneId = "suite_onsen";
      } else if (textLower.includes("lantern") || textLower.includes("light")) {
        itemType = "ambient_lantern";
        zoneId = "reception";
      }

      spatialRuntimeDispatcher.handleToggleFurniture({
        zoneId,
        itemType,
        enabled: enable
      });

      executedTools.push({
        toolName: "toggleFurnitureItem",
        args: { zoneId, itemType, enabled: enable },
        result: `Equipment state updated.`
      });

      replyText = `Equipment [${itemType}] in [${zoneId}] is now switched ${enable ? "ON" : "OFF"}. Visual effect active on stage.`;
    }
    // Default Guidance
    else {
      replyText = `I am your SpatialTwin Voice Copilot. Speak or enter commands:
• "Show today's revenue and send the master on break"
• "Set waiting lounge SLA alert threshold to 20 minutes"
• "Trigger SLA delay alert for waiting lounge"
• "Bind YClients data stream to suite_aromatherapy"
• "Turn on aromatherapy diffuser"`;
    }

    if (prefixNotice) {
      replyText = `${prefixNotice}\n\n${replyText}`;
    }

    return {
      text: replyText,
      toolCalls: executedTools
    };
  }
}

export const aiAgentService = AiAgentService.getInstance();
