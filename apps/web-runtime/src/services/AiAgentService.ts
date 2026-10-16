import { z } from "zod";
import { spatialRuntimeDispatcher } from "./SpatialRuntimeDispatcher.js";

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

export interface OpenAIClientConfig {
  apiKey?: string;
  baseURL?: string;
  dangerouslyAllowBrowser?: boolean;
}

/**
 * Vercel AI SDK Client Factory (@ai-sdk/openai compatible)
 */
export function createOpenAI(config: OpenAIClientConfig) {
  const baseURL = config.baseURL || "https://openrouter.ai/api/v1";
  const apiKey = config.apiKey || "";

  return (modelName: string) => {
    return {
      modelId: modelName,
      baseURL,
      apiKey,
      async generateText({
        system,
        messages,
        tools
      }: {
        system: string;
        messages: Array<{ role: string; content: string }>;
        tools: Record<string, any>;
      }) {
        const toolDefinitions = Object.entries(tools).map(([name, t]) => ({
          type: "function",
          function: {
            name,
            description: t.description,
            parameters: t.parameters ? zodToJsonSchema(t.parameters) : undefined
          }
        }));

        const formattedMessages = [
          { role: "system", content: system },
          ...messages
        ];

        const endpoint = baseURL.endsWith("/") ? `${baseURL}chat/completions` : `${baseURL}/chat/completions`;

        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "SpatialTwin Digital Twin"
          },
          body: JSON.stringify({
            model: modelName,
            messages: formattedMessages,
            tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
            tool_choice: "auto"
          })
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          throw new Error(`HTTP ${resp.status} ${resp.statusText}: ${errText.slice(0, 150)}`);
        }

        const data = await resp.json();
        const choice = data.choices?.[0];
        const msg = choice?.message || {};

        const toolCalls: Array<{ toolName: string; args: any; result: string }> = [];

        if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            const fnName = tc.function?.name;
            const targetTool = tools[fnName];
            let parsedArgs = {};
            try {
              parsedArgs = JSON.parse(tc.function?.arguments || "{}");
            } catch {
              parsedArgs = {};
            }

            let resultStr = "Выполнено";
            if (targetTool && typeof targetTool.execute === "function") {
              const res = await targetTool.execute(parsedArgs);
              resultStr = typeof res === "string" ? res : JSON.stringify(res);
            }

            toolCalls.push({
              toolName: fnName,
              args: parsedArgs,
              result: resultStr
            });
          }
        }

        return {
          text: msg.content || (toolCalls.length > 0 ? "Инструменты сцены успешно вызваны." : ""),
          toolCalls
        };
      }
    };
  };
}

/**
 * Minimal lightweight JSON schema converter for Zod objects
 */
function zodToJsonSchema(schema: any): any {
  if (!schema || !schema._def) return { type: "object", properties: {} };
  const shape = schema._def.shape ? (typeof schema._def.shape === "function" ? schema._def.shape() : schema._def.shape) : {};
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, val] of Object.entries(shape as Record<string, any>)) {
    const typeName = val._def?.typeName;
    const isOptional = typeName === "ZodOptional" || typeName === "ZodDefault";
    const innerDef = isOptional ? val._def.innerType._def : val._def;
    const desc = val.description || innerDef?.description;

    let propType = "string";
    let enumVals: string[] | undefined;

    if (innerDef?.typeName === "ZodNumber") propType = "number";
    if (innerDef?.typeName === "ZodBoolean") propType = "boolean";
    if (innerDef?.typeName === "ZodEnum") {
      propType = "string";
      enumVals = innerDef.values;
    }

    properties[key] = {
      type: propType,
      description: desc,
      enum: enumVals
    };

    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined
  };
}

/**
 * Declarative Mutation State: Strictly defined Owner Tools validated via Zod
 */
export const ownerTools = {
  // Tool 1: Update Zone SLA / Rules
  updateZoneRule: {
    description: "Изменяет порог ожидания клиента (SLA) или интервалы мастера для конкретной комнаты/зоны салона",
    parameters: z.object({
      zoneId: z.enum([
        "reception",
        "waiting_lounge",
        "suite_aromatherapy",
        "suite_onsen",
        "suite_double_massage"
      ]).describe("Идентификатор зоны салона"),
      maxWaitMinutes: z.number().min(1).max(120).optional().describe("Максимальное допустимое время ожидания в минутах"),
      alertThresholdMinutes: z.number().min(1).max(120).optional().describe("Порог в минутах, после которого срабатывает визуальное предупреждение (пар, дым или алерт)")
    }),
    execute: async ({
      zoneId,
      maxWaitMinutes,
      alertThresholdMinutes
    }: {
      zoneId: "reception" | "waiting_lounge" | "suite_aromatherapy" | "suite_onsen" | "suite_double_massage";
      maxWaitMinutes?: number;
      alertThresholdMinutes?: number;
    }) => {
      window.dispatchEvent(
        new CustomEvent("spatialtwin:update_rule", {
          detail: { zoneId, maxWaitMinutes, alertThresholdMinutes }
        })
      );
      return `Правила для зоны ${zoneId} успешно обновлены. Порог алерта: ${alertThresholdMinutes ?? "не задан"}м, макс. ожидание: ${maxWaitMinutes ?? "не задано"}м.`;
    }
  },

  // Tool 2: Bind Data Stream / Telemetry
  bindDataSource: {
    description: "Связывает мебель или комнату с колонкой в таблице Google Sheets или ключом CRM (YClients, MoySklad, Telegram)",
    parameters: z.object({
      zoneId: z.string().describe("Идентификатор зоны (напр. suite_aromatherapy)"),
      sourceType: z.enum(["google_sheets", "telegram", "moysklad", "yclients"]).describe("Тип источника данных"),
      targetField: z.string().describe('Название поля или ячейки (например, "Колонка C", "status_visit", "lead_balance")')
    }),
    execute: async ({
      zoneId,
      sourceType,
      targetField
    }: {
      zoneId: string;
      sourceType: "google_sheets" | "telegram" | "moysklad" | "yclients";
      targetField: string;
    }) => {
      window.dispatchEvent(
        new CustomEvent("spatialtwin:bind_stream", {
          detail: { zoneId, sourceType, targetField }
        })
      );
      return `Зона ${zoneId} теперь слушает ${sourceType} (${targetField}). Телеметрия подключена.`;
    }
  },

  // Tool 3: Toggle Interior Furniture Item
  toggleFurnitureItem: {
    description: "Включение или выключение интерактивных объектов интерьера (аромадиффузор, подогрев онсэна, фонарь, чайный столик)",
    parameters: z.object({
      zoneId: z.string().describe("Идентификатор зоны (напр. suite_aromatherapy)"),
      itemType: z.enum([
        "aromatherapy_diffuser",
        "onsen_heater",
        "ambient_lantern",
        "tea_table",
        "sakura_vase"
      ]).describe("Тип предмета интерьера"),
      enabled: z.boolean().describe("true для включения, false для выключения")
    }),
    execute: async ({
      zoneId,
      itemType,
      enabled
    }: {
      zoneId: string;
      itemType: "aromatherapy_diffuser" | "onsen_heater" | "ambient_lantern" | "tea_table" | "sakura_vase";
      enabled: boolean;
    }) => {
      window.dispatchEvent(
        new CustomEvent("spatialtwin:toggle_furniture", {
          detail: { zoneId, itemType, enabled }
        })
      );
      return `Предмет ${itemType} в зоне ${zoneId} переключен в состояние ${enabled ? "ВКЛ" : "ВЫКЛ"}.`;
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
   * Constructs the System Prompt with dynamic real-time scene snapshot
   */
  public buildSystemPrompt(): string {
    const snapshot = spatialRuntimeDispatcher.getStateSnapshot();

    return `Ты ассистент управления салоном SpatialTwin.
Ты помогаешь собственнику настраивать параметры зала, пороги ожидания (SLA) и связывать телеметрию (CRM, Google Sheets, МойСклад, YClients).
Ты можешь выполнять изменения ТОЛЬКО через предоставленные инструменты (updateZoneRule, bindDataSource, toggleFurnitureItem). Код приложения не трогается — изменяется только декларативное состояние сцены.

Текущий JSON-слепок сцены и зон:
${JSON.stringify(snapshot, null, 2)}

Правила поведения:
1. Если пользователь просит изменить время ожидания, порог оповещения, пар/дым при задержке (например: "Сделай так, чтобы после 20 минут ожидания над клиентом на диване появлялся пар") — ОБЯЗАТЕЛЬНО вызывай инструмент updateZoneRule с zoneId: "waiting_lounge" и alertThresholdMinutes: 20.
2. Если просят связать с CRM, таблицей или мессенджером — вызывай bindDataSource.
3. Если просят включить/выключить оборудование (аромадиффузор, подогрев онсэна) — вызывай toggleFurnitureItem.
4. Отвечай лаконично, точно и вежливо на языке пользователя. Объясняй, какой инструмент был вызван и что изменилось на изометрическом холсте.`;
  }

  /**
   * Dispatches a message to the AI SDK provider (or simulation fallback if no key is entered)
   */
  public async sendMessage(
    userText: string,
    history: ChatMessage[] = []
  ): Promise<{ text: string; toolCalls: Array<{ toolName: string; args: any; result: string }> }> {
    const systemPrompt = this.buildSystemPrompt();

    // 1. If user provided their own API key -> use Vercel AI SDK provider client
    if (this.hasApiKey()) {
      try {
        const apiKey = this.getApiKey();
        const baseURL = this.getBaseUrl();
        const modelName = this.getModel();

        const customProvider = createOpenAI({
          apiKey,
          baseURL,
          dangerouslyAllowBrowser: true
        });

        const client = customProvider(modelName);

        const messages = [
          ...history.slice(-8).map(h => ({
            role: h.role,
            content: h.content
          })),
          { role: "user", content: userText }
        ];

        const response = await client.generateText({
          system: systemPrompt,
          messages,
          tools: ownerTools
        });

        return {
          text: response.text || "Изменения применены к сцене.",
          toolCalls: response.toolCalls
        };
      } catch (err: any) {
        console.warn("[AiAgentService] API call failed, falling back to local declarative dispatcher:", err);
        return this.executeLocalSimulation(userText, `[Ошибка API: ${err.message}. Активирован локальный симулятор]`);
      }
    }

    // 2. Fallback Mode: Deterministic heuristic execution when no API key is set
    return this.executeLocalSimulation(userText);
  }

  /**
   * Deterministic local heuristic dispatcher for keyless live demos and testing
   */
  private async executeLocalSimulation(
    userText: string,
    prefixNotice = ""
  ): Promise<{ text: string; toolCalls: Array<{ toolName: string; args: any; result: string }> }> {
    const textLower = userText.toLowerCase();
    const executedTools: Array<{ toolName: string; args: any; result: string }> = [];
    let replyText = "";

    // Heuristic 1: SLA Wait Time / Steam over Sofa
    // e.g. "Сделай так, чтобы после 20 минут ожидания над клиентом на диване появлялся пар"
    if (textLower.includes("пар") || textLower.includes("дым") || textLower.includes("диван") || textLower.includes("ожидани") || textLower.includes("wait") || textLower.includes("sla")) {
      const matchMin = textLower.match(/(\d+)\s*(мин|m|min)/i);
      const minutes = matchMin ? parseInt(matchMin[1], 10) : 20;

      let zoneId: any = "waiting_lounge";
      if (textLower.includes("ресепшн") || textLower.includes("reception")) zoneId = "reception";
      if (textLower.includes("арома") || textLower.includes("suite_aromatherapy")) zoneId = "suite_aromatherapy";
      if (textLower.includes("онсэн") || textLower.includes("onsen")) zoneId = "suite_onsen";

      const res = await ownerTools.updateZoneRule.execute({
        zoneId,
        alertThresholdMinutes: minutes,
        maxWaitMinutes: minutes + 10
      });

      executedTools.push({
        toolName: "updateZoneRule",
        args: { zoneId, alertThresholdMinutes: minutes, maxWaitMinutes: minutes + 10 },
        result: String(res)
      });

      replyText = `Я обновил правило SLA для зоны «${zoneId}». Теперь, если гость ожидает более ${minutes} минут, над зоной моментально поднимается предупреждающий пар/дым. Таймер и частицы на холсте активированы.`;
    }
    // Heuristic 2: Bind Data Stream
    // e.g. "Привяжи YClients к Suite Aromatherapy"
    else if (textLower.includes("yclients") || textLower.includes("sheets") || textLower.includes("таблиц") || textLower.includes("telegram") || textLower.includes("moysklad") || textLower.includes("свяжи") || textLower.includes("привяжи")) {
      let sourceType: any = "yclients";
      if (textLower.includes("sheet") || textLower.includes("таблиц")) sourceType = "google_sheets";
      if (textLower.includes("telegram") || textLower.includes("тг")) sourceType = "telegram";
      if (textLower.includes("moysklad") || textLower.includes("склад")) sourceType = "moysklad";

      let zoneId: any = "suite_aromatherapy";
      if (textLower.includes("reception") || textLower.includes("ресепшн")) zoneId = "reception";
      if (textLower.includes("onsen") || textLower.includes("онсэн")) zoneId = "suite_onsen";
      if (textLower.includes("lounge") || textLower.includes("диван") || textLower.includes("ожидани")) zoneId = "waiting_lounge";

      const targetField = sourceType === "yclients" ? "status_visit" : sourceType === "google_sheets" ? "Sheet1!F12" : "event_payload";

      const res = await ownerTools.bindDataSource.execute({
        zoneId,
        sourceType,
        targetField
      });

      executedTools.push({
        toolName: "bindDataSource",
        args: { zoneId, sourceType, targetField },
        result: String(res)
      });

      replyText = `Источник данных ${sourceType.toUpperCase()} с параметром «${targetField}» успешно привязан к зоне «${zoneId}». Камера сфокусирована, телеметрия транслируется в реальном времени.`;
    }
    // Heuristic 3: Toggle Furniture (Diffuser / Heater / Lantern)
    // e.g. "Включи аромадиффузор"
    else if (textLower.includes("диффузор") || textLower.includes("подогрев") || textLower.includes("фонар") || textLower.includes("включи") || textLower.includes("выключи") || textLower.includes("toggle")) {
      const enable = !textLower.includes("выключи") && !textLower.includes("off");
      let itemType: any = "aromatherapy_diffuser";
      let zoneId: any = "suite_aromatherapy";

      if (textLower.includes("подогрев") || textLower.includes("онсэн")) {
        itemType = "onsen_heater";
        zoneId = "suite_onsen";
      } else if (textLower.includes("фонар")) {
        itemType = "ambient_lantern";
        zoneId = "reception";
      }

      const res = await ownerTools.toggleFurnitureItem.execute({
        zoneId,
        itemType,
        enabled: enable
      });

      executedTools.push({
        toolName: "toggleFurnitureItem",
        args: { zoneId, itemType, enabled: enable },
        result: String(res)
      });

      replyText = `Элемент интерьера «${itemType}» в зоне «${zoneId}» переведен в режим ${enable ? "ВКЛЮЧЕН" : "ВЫКЛЮЧЕН"}. Визуальный эффект запущен на холсте.`;
    }
    // Default response
    else {
      replyText = `Я ассистент SpatialTwin. Вы можете поручить мне настройку зала. Например:
• «Сделай так, чтобы после 20 минут ожидания над клиентом на диване появлялся пар»
• «Привяжи YClients со статусом visit_status к комнате Suite Aromatherapy»
• «Включи аромадиффузор в комнате ароматерапии»
• Либо укажите свой API ключ в меню [⚙ KEY] для прямого общения через OpenRouter / OpenAI.`;
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
