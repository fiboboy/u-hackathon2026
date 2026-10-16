import { aiAgentService, ChatMessage } from "../services/AiAgentService.js";
import { soundManager } from "../services/SoundManager.js";

export class AiOwnerChatWidget {
  private containerEl!: HTMLElement;
  private launcherBtn!: HTMLElement;
  private chatWindowEl!: HTMLElement;
  private messagesStreamEl!: HTMLElement;
  private inputFieldEl!: HTMLInputElement;
  private sendBtnEl!: HTMLButtonElement;
  private keyModalEl!: HTMLElement;
  private statusPillEl!: HTMLElement;
  private launcherDotEl!: HTMLElement;

  private isChatOpen = false;
  private isProcessing = false;
  private messages: ChatMessage[] = [];

  constructor() {
    this.initUI();
    this.loadInitialGreeting();
    this.updateKeyStatusUI();
  }

  private initUI() {
    // Create main container injected into body
    this.containerEl = document.createElement("div");
    this.containerEl.id = "ai-owner-chat-widget-root";
    this.containerEl.innerHTML = `
      <!-- Floating Launcher Button in Bottom-Right -->
      <button id="ai-chat-launcher" class="ai-chat-launcher-btn" title="Open SpatialTwin AI Assistant (Declarative Scene Mutation)">
        <span class="ai-launcher-icon">[★]</span>
        <span class="ai-launcher-label">AI COPILOT</span>
        <span class="ai-launcher-status-dot" id="ai-launcher-dot"></span>
      </button>

      <!-- Floating Chat Panel -->
      <div id="ai-chat-panel" class="ai-chat-panel" style="display: none;">
        <!-- Header -->
        <div class="ai-chat-header">
          <div class="ai-header-left">
            <span class="ai-header-tag">[AI]</span>
            <div class="ai-header-titles">
              <span class="ai-title">SPATIALTWIN ASSISTANT</span>
              <span class="ai-subtitle">Declarative Mutation Engine</span>
            </div>
          </div>
          <div class="ai-header-right">
            <span class="ai-status-pill pill-demo" id="ai-status-pill">DEMO MODE</span>
            <button class="ai-btn-ctrl" id="ai-btn-settings" title="Configure OpenRouter / OpenAI API Key">[⚙ KEY]</button>
            <button class="ai-btn-ctrl" id="ai-btn-clear" title="Clear chat history">[CLEAR]</button>
            <button class="ai-btn-ctrl" id="ai-btn-close" title="Minimize chat window">[-]</button>
          </div>
        </div>

        <!-- API Key Settings Flyout / Modal -->
        <div id="ai-key-modal" class="ai-key-modal" style="display: none;">
          <div class="ai-key-modal-content">
            <div class="ai-key-titlebar">
              <span>[⚙] LLM PROVIDER & API KEY CONFIG</span>
              <button class="ai-btn-ctrl" id="ai-key-close">[x]</button>
            </div>
            <div class="ai-key-body">
              <div class="ai-key-desc">
                Ключ сохраняется <strong>локально в localStorage браузера</strong> и передается напрямую в Vercel AI SDK клиент с <code>dangerouslyAllowBrowser: true</code>.
              </div>

              <div class="ai-field-group">
                <label class="ai-field-label">API KEY (OpenRouter / OpenAI):</label>
                <div class="ai-input-with-toggle">
                  <input type="password" id="ai-input-api-key" class="ai-text-input" placeholder="sk-or-v1-... or sk-proj-..." />
                  <button type="button" class="ai-btn-toggle-vis" id="ai-btn-toggle-key-vis" title="Toggle visibility">[👁]</button>
                </div>
              </div>

              <div class="ai-field-group">
                <label class="ai-field-label">PROVIDER PRESET:</label>
                <div class="ai-provider-chips">
                  <button type="button" class="ai-chip-btn active" data-url="https://openrouter.ai/api/v1" data-model="openai/gpt-4o-mini">OpenRouter</button>
                  <button type="button" class="ai-chip-btn" data-url="https://api.openai.com/v1" data-model="gpt-4o-mini">OpenAI Direct</button>
                  <button type="button" class="ai-chip-btn" data-url="https://api.groq.com/openai/v1" data-model="llama-3.3-70b-versatile">Groq</button>
                </div>
              </div>

              <div class="ai-two-col">
                <div class="ai-field-group">
                  <label class="ai-field-label">BASE URL:</label>
                  <input type="text" id="ai-input-base-url" class="ai-text-input" value="https://openrouter.ai/api/v1" />
                </div>
                <div class="ai-field-group">
                  <label class="ai-field-label">MODEL NAME:</label>
                  <input type="text" id="ai-input-model" class="ai-text-input" value="openai/gpt-4o-mini" />
                </div>
              </div>

              <div class="ai-key-actions">
                <button type="button" class="ai-action-btn btn-save" id="ai-btn-save-key">[★ SAVE CONFIG]</button>
                <button type="button" class="ai-action-btn btn-clear-key" id="ai-btn-clear-key">[DELETE KEY]</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Messages Stream -->
        <div class="ai-chat-messages" id="ai-chat-messages"></div>

        <!-- Quick Prompt Chips Row -->
        <div class="ai-preset-chips-row">
          <span class="ai-chips-tag">PROMPTS:</span>
          <button class="ai-prompt-chip" data-prompt="Сделай так, чтобы после 20 минут ожидания над клиентом на диване появлялся пар">[Пар после 20м]</button>
          <button class="ai-prompt-chip" data-prompt="Привяжи источник данных yclients с полем status_visit к зоне suite_aromatherapy">[YClients CRM]</button>
          <button class="ai-prompt-chip" data-prompt="Включи аромадиффузор в комнате ароматерапии suite_aromatherapy">[Диффузор ON]</button>
          <button class="ai-prompt-chip" data-prompt="Установи максимальное время ожидания 15 минут в зоне reception">[SLA 15м Ресепшн]</button>
        </div>

        <!-- Input Bar -->
        <form class="ai-chat-input-bar" id="ai-chat-form">
          <input
            type="text"
            id="ai-chat-input"
            class="ai-chat-input"
            placeholder="Напишите команду (напр.: сделай пар после 20 минут)..."
            autocomplete="off"
          />
          <button type="submit" class="ai-send-btn" id="ai-btn-send">[>] SEND</button>
        </form>
      </div>
    `;

    document.body.appendChild(this.containerEl);

    // Elements
    this.launcherBtn = document.getElementById("ai-chat-launcher") as HTMLElement;
    this.chatWindowEl = document.getElementById("ai-chat-panel") as HTMLElement;
    this.messagesStreamEl = document.getElementById("ai-chat-messages") as HTMLElement;
    this.inputFieldEl = document.getElementById("ai-chat-input") as HTMLInputElement;
    this.sendBtnEl = document.getElementById("ai-btn-send") as HTMLButtonElement;
    this.keyModalEl = document.getElementById("ai-key-modal") as HTMLElement;
    this.statusPillEl = document.getElementById("ai-status-pill") as HTMLElement;
    this.launcherDotEl = document.getElementById("ai-launcher-dot") as HTMLElement;

    this.bindEvents();
    this.initKeyModalInputs();
  }

  private bindEvents() {
    // Toggle Launcher
    this.launcherBtn?.addEventListener("click", () => this.toggleChat());

    // Close / Minimize
    document.getElementById("ai-btn-close")?.addEventListener("click", () => this.toggleChat(false));

    // Clear history
    document.getElementById("ai-btn-clear")?.addEventListener("click", () => {
      this.messages = [];
      this.messagesStreamEl.innerHTML = "";
      this.loadInitialGreeting();
      soundManager.playAction("tap");
    });

    // Open Key Settings Modal
    document.getElementById("ai-btn-settings")?.addEventListener("click", () => {
      this.openKeyModal(true);
    });

    document.getElementById("ai-key-close")?.addEventListener("click", () => {
      this.openKeyModal(false);
    });

    // Toggle Key Password Visibility
    const btnToggleVis = document.getElementById("ai-btn-toggle-key-vis");
    const inputKey = document.getElementById("ai-input-api-key") as HTMLInputElement;
    btnToggleVis?.addEventListener("click", () => {
      if (inputKey) {
        inputKey.type = inputKey.type === "password" ? "text" : "password";
      }
    });

    // Provider Chips
    const providerChips = document.querySelectorAll<HTMLButtonElement>(".ai-chip-btn");
    const inputBaseUrl = document.getElementById("ai-input-base-url") as HTMLInputElement;
    const inputModel = document.getElementById("ai-input-model") as HTMLInputElement;

    providerChips.forEach(btn => {
      btn.addEventListener("click", () => {
        providerChips.forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        if (inputBaseUrl && btn.dataset.url) inputBaseUrl.value = btn.dataset.url;
        if (inputModel && btn.dataset.model) inputModel.value = btn.dataset.model;
        soundManager.playAction("tap");
      });
    });

    // Save Key Config
    document.getElementById("ai-btn-save-key")?.addEventListener("click", () => {
      if (inputKey && inputBaseUrl && inputModel) {
        aiAgentService.setApiKey(inputKey.value);
        aiAgentService.setBaseUrl(inputBaseUrl.value);
        aiAgentService.setModel(inputModel.value);
        this.updateKeyStatusUI();
        this.openKeyModal(false);
        soundManager.playZenChime();
        this.appendSystemNotice(
          aiAgentService.hasApiKey()
            ? `[✓] API Ключ успешно сохранен! Модель: ${inputModel.value}. Готов к работе через Vercel AI SDK.`
            : `[i] API Ключ очищен. Включен локальный режим симуляции.`
        );
      }
    });

    // Clear Key
    document.getElementById("ai-btn-clear-key")?.addEventListener("click", () => {
      aiAgentService.setApiKey("");
      if (inputKey) inputKey.value = "";
      this.updateKeyStatusUI();
      soundManager.playAction("tap");
      this.appendSystemNotice("[i] Ключ удален из localStorage.");
    });

    // Quick Prompt Chips
    const promptChips = document.querySelectorAll<HTMLButtonElement>(".ai-prompt-chip");
    promptChips.forEach(chip => {
      chip.addEventListener("click", () => {
        const text = chip.dataset.prompt;
        if (text) {
          if (this.inputFieldEl) this.inputFieldEl.value = text;
          this.handleSendMessage(text);
        }
      });
    });

    // Chat Form Submit
    const form = document.getElementById("ai-chat-form") as HTMLFormElement;
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = this.inputFieldEl.value.trim();
      if (val) {
        this.handleSendMessage(val);
      }
    });
  }

  private initKeyModalInputs() {
    const inputKey = document.getElementById("ai-input-api-key") as HTMLInputElement;
    const inputBaseUrl = document.getElementById("ai-input-base-url") as HTMLInputElement;
    const inputModel = document.getElementById("ai-input-model") as HTMLInputElement;

    if (inputKey) inputKey.value = aiAgentService.getApiKey();
    if (inputBaseUrl) inputBaseUrl.value = aiAgentService.getBaseUrl();
    if (inputModel) inputModel.value = aiAgentService.getModel();
  }

  public updateKeyStatusUI() {
    const hasKey = aiAgentService.hasApiKey();

    if (this.launcherDotEl) {
      this.launcherDotEl.className = `ai-launcher-status-dot ${hasKey ? "dot-online" : "dot-demo"}`;
      this.launcherDotEl.title = hasKey ? "API Key Connected" : "Local Demo / Simulator Mode";
    }

    if (this.statusPillEl) {
      if (hasKey) {
        this.statusPillEl.className = "ai-status-pill pill-online";
        this.statusPillEl.textContent = "● VERCEL AI SDK";
        this.statusPillEl.title = `Connected to ${aiAgentService.getModel()}`;
      } else {
        this.statusPillEl.className = "ai-status-pill pill-demo";
        this.statusPillEl.textContent = "○ LOCAL DEMO";
        this.statusPillEl.title = "Local Declarative State Simulator (Click [⚙ KEY] to use OpenAI / OpenRouter)";
      }
    }
  }

  public toggleChat(forceOpen?: boolean) {
    this.isChatOpen = typeof forceOpen === "boolean" ? forceOpen : !this.isChatOpen;
    if (this.chatWindowEl) {
      this.chatWindowEl.style.display = this.isChatOpen ? "flex" : "none";
      if (this.isChatOpen) {
        soundManager.playAction("tap");
        this.inputFieldEl?.focus();
        this.scrollToBottom();
      }
    }
    if (this.launcherBtn) {
      this.launcherBtn.classList.toggle("active-launcher", this.isChatOpen);
    }
  }

  public openKeyModal(open: boolean) {
    if (this.keyModalEl) {
      this.keyModalEl.style.display = open ? "flex" : "none";
      if (open) soundManager.playAction("tap");
    }
  }

  private getTime(): string {
    const d = new Date();
    return d.toTimeString().split(" ")[0];
  }

  private loadInitialGreeting() {
    this.appendMessage({
      id: "greeting",
      role: "assistant",
      timestamp: this.getTime(),
      content: `Здравствуйте! Я ассистент управления салоном SpatialTwin на базе **Vercel AI SDK**.

Я работаю по принципу **Declarative Mutation State** — код приложения не модифицируется, а все команды выполняются через строго валидированные инструменты:
• \`updateZoneRule\`: SLA ожидания и таймеры оповещений
• \`bindDataSource\`: подключение Google Sheets / CRM
• \`toggleFurnitureItem\`: управление оборудованием зала

Попробуйте нажать кнопку ниже или ввести команду своими словами!`
    });
  }

  private appendMessage(msg: ChatMessage) {
    this.messages.push(msg);

    const row = document.createElement("div");
    row.className = `ai-msg-row ai-msg-${msg.role}`;

    const header = document.createElement("div");
    header.className = "ai-msg-header";

    const senderTag = document.createElement("span");
    senderTag.className = "ai-sender-tag";
    senderTag.textContent = msg.role === "user" ? "[YOU]" : "[AI ASSISTANT]";

    const timeTag = document.createElement("span");
    timeTag.className = "ai-time-tag";
    timeTag.textContent = `[${msg.timestamp}]`;

    header.appendChild(senderTag);
    header.appendChild(timeTag);
    row.appendChild(header);

    const body = document.createElement("div");
    body.className = "ai-msg-body";
    body.innerHTML = this.formatMarkdown(msg.content);
    row.appendChild(body);

    // If there are tool calls, render tool cards
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      const toolContainer = document.createElement("div");
      toolContainer.className = "ai-tool-calls-container";

      msg.toolCalls.forEach(tc => {
        const card = document.createElement("div");
        card.className = "ai-tool-call-card";

        const cardHeader = document.createElement("div");
        cardHeader.className = "ai-tool-header";
        cardHeader.innerHTML = `
          <span class="ai-tool-icon">[⚡ TOOL CALL]</span>
          <span class="ai-tool-name">${tc.toolName}</span>
          <span class="ai-tool-badge">● EXECUTED</span>
        `;

        const argsBlock = document.createElement("div");
        argsBlock.className = "ai-tool-args";
        argsBlock.textContent = JSON.stringify(tc.args, null, 2);

        const resultBlock = document.createElement("div");
        resultBlock.className = "ai-tool-result";
        resultBlock.innerHTML = `<span class="ai-result-tag">[RESULT]:</span> ${tc.result || "Success"}`;

        card.appendChild(cardHeader);
        card.appendChild(argsBlock);
        card.appendChild(resultBlock);
        toolContainer.appendChild(card);
      });

      row.appendChild(toolContainer);
    }

    this.messagesStreamEl.appendChild(row);
    this.scrollToBottom();
  }

  private appendSystemNotice(text: string) {
    const row = document.createElement("div");
    row.className = "ai-msg-notice";
    row.textContent = text;
    this.messagesStreamEl.appendChild(row);
    this.scrollToBottom();
  }

  private scrollToBottom() {
    if (this.messagesStreamEl) {
      this.messagesStreamEl.scrollTop = this.messagesStreamEl.scrollHeight;
    }
  }

  private formatMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br/>");
  }

  private async handleSendMessage(text: string) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    soundManager.playAction("tap");

    // Add user message
    this.appendMessage({
      id: `usr_${Date.now()}`,
      role: "user",
      timestamp: this.getTime(),
      content: text
    });

    if (this.inputFieldEl) {
      this.inputFieldEl.value = "";
    }

    // Temporary streaming / processing indicator
    const indicator = document.createElement("div");
    indicator.className = "ai-msg-row ai-msg-assistant ai-processing-indicator";
    indicator.innerHTML = `
      <div class="ai-msg-header">
        <span class="ai-sender-tag">[AI ASSISTANT]</span>
        <span class="ai-time-tag">[${this.getTime()}]</span>
      </div>
      <div class="ai-msg-body"><span class="ai-dot-pulse">● ● ●</span> Анализ запроса и валидация инструментов...</div>
    `;
    this.messagesStreamEl.appendChild(indicator);
    this.scrollToBottom();

    if (this.sendBtnEl) {
      this.sendBtnEl.disabled = true;
      this.sendBtnEl.textContent = "[...]";
    }

    try {
      const response = await aiAgentService.sendMessage(text, this.messages);
      indicator.remove();

      this.appendMessage({
        id: `ai_${Date.now()}`,
        role: "assistant",
        timestamp: this.getTime(),
        content: response.text,
        toolCalls: response.toolCalls
      });
    } catch (err: any) {
      indicator.remove();
      this.appendMessage({
        id: `err_${Date.now()}`,
        role: "assistant",
        timestamp: this.getTime(),
        content: `Произошла ошибка при выполнении: ${err.message}`
      });
    } finally {
      this.isProcessing = false;
      if (this.sendBtnEl) {
        this.sendBtnEl.disabled = false;
        this.sendBtnEl.textContent = "[>] SEND";
      }
      this.inputFieldEl?.focus();
    }
  }
}

export const aiOwnerChatWidget = new AiOwnerChatWidget();
