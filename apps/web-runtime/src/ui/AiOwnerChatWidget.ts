import { aiAgentService, ChatMessage } from "../services/AiAgentService.js";
import { soundManager } from "../services/SoundManager.js";
import { voiceAgentService, ELEVENLABS_VOICES } from "../services/VoiceAgentService.js";

export class AiOwnerChatWidget {
  private containerEl!: HTMLElement;
  private launcherBtn!: HTMLElement;
  private chatWindowEl!: HTMLElement;
  private messagesStreamEl!: HTMLElement;
  private inputFieldEl!: HTMLInputElement;
  private sendBtnEl!: HTMLButtonElement;
  private micBtnEl!: HTMLButtonElement;
  private keyModalEl!: HTMLElement;
  private statusPillEl!: HTMLElement;
  private voiceStatusPillEl!: HTMLElement;
  private launcherDotEl!: HTMLElement;
  private voiceHudEl!: HTMLElement;

  private isChatOpen = false;
  private isProcessing = false;
  private isSpaceRecording = false;
  private messages: ChatMessage[] = [];

  constructor() {
    this.initUI();
    this.loadInitialGreeting();
    this.updateKeyStatusUI();
    this.bindVoiceEvents();
    this.bindGlobalSpacebar();
  }

  private initUI() {
    this.containerEl = document.createElement("div");
    this.containerEl.id = "ai-owner-chat-widget-root";
    this.containerEl.innerHTML = `
      <!-- Floating Speech Waveform HUD when speaking -->
      <div id="ai-voice-speaking-hud" class="ai-voice-speaking-hud" style="display: none;">
        <div class="ai-voice-speaker-badge">
          <span class="ai-voice-avatar-icon">👩‍💼</span>
          <div class="ai-voice-speaker-meta">
            <span class="ai-voice-speaker-name" id="ai-voice-speaker-name">RECEPTIONIST LIN</span>
            <span class="ai-voice-engine-badge" id="ai-voice-engine-badge">● ELEVENLABS STREAMING</span>
          </div>
        </div>
        <div class="ai-voice-waves">
          <span class="bar bar1"></span>
          <span class="bar bar2"></span>
          <span class="bar bar3"></span>
          <span class="bar bar4"></span>
          <span class="bar bar5"></span>
        </div>
        <div class="ai-voice-live-text" id="ai-voice-live-text">...</div>
      </div>

      <!-- Floating Launcher Button in Bottom-Right -->
      <button id="ai-chat-launcher" class="ai-chat-launcher-btn" title="Open SpatialTwin Voice Copilot (Press SPACE or Click to Chat)">
        <span class="ai-launcher-icon">[🎙️]</span>
        <span class="ai-launcher-label">VOICE COPILOT</span>
        <span class="ai-launcher-status-dot" id="ai-launcher-dot"></span>
      </button>

      <!-- Floating Chat Panel -->
      <div id="ai-chat-panel" class="ai-chat-panel" style="display: none;">
        <!-- Header -->
        <div class="ai-chat-header">
          <div class="ai-header-left">
            <span class="ai-header-tag">[AI · VOICE]</span>
            <div class="ai-header-titles">
              <span class="ai-title">SPATIALTWIN COPILOT</span>
              <span class="ai-subtitle">ElevenLabs Streaming & Declarative Mutation</span>
            </div>
          </div>
          <div class="ai-header-right">
            <span class="ai-status-pill pill-demo" id="ai-status-pill">DEMO MODE</span>
            <span class="ai-status-pill pill-voice-status" id="ai-voice-status-pill" title="Toggle Voice Engine">🎙️ VOICE: ON</span>
            <button class="ai-btn-ctrl" id="ai-btn-settings" title="Configure ElevenLabs & LLM Provider API Keys">[⚙ KEY]</button>
            <button class="ai-btn-ctrl" id="ai-btn-clear" title="Clear chat history">[CLEAR]</button>
            <button class="ai-btn-ctrl" id="ai-btn-close" title="Minimize chat window">[-]</button>
          </div>
        </div>

        <!-- API Key Settings Flyout / Modal -->
        <div id="ai-key-modal" class="ai-key-modal" style="display: none;">
          <div class="ai-key-modal-content">
            <div class="ai-key-titlebar">
              <span>[⚙] ELEVENLABS VOICE & LLM CONFIG</span>
              <button class="ai-btn-ctrl" id="ai-key-close">[x]</button>
            </div>
            <div class="ai-key-body">
              <div class="ai-key-desc">
                Keys are stored <strong>locally in browser localStorage</strong>. Without keys, the runtime operates in autonomous demo mode with Web Speech API and dynamic local reasoning.
              </div>

              <!-- ElevenLabs Section -->
              <div class="ai-section-group" style="background: rgba(255, 170, 51, 0.08); border: 1px solid rgba(255, 170, 51, 0.3); border-radius: 4px; padding: 10px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <strong style="color: #ffaa33; font-size: 12px;">[🎙️ ELEVENLABS NEURAL TTS & CONVAI]</strong>
                  <button type="button" class="ai-btn-ctrl" id="ai-btn-test-voice" style="color: #ffaa33; border-color: #ffaa33;">[▶ TEST VOICE]</button>
                </div>

                <div class="ai-field-group">
                  <label class="ai-field-label">ELEVENLABS API KEY:</label>
                  <div class="ai-input-with-toggle">
                    <input type="password" id="ai-input-elevenlabs-key" class="ai-text-input" placeholder="xi-... (ElevenLabs API Key)" />
                    <button type="button" class="ai-btn-toggle-vis" id="ai-btn-toggle-el-key-vis" title="Toggle visibility">[👁]</button>
                  </div>
                </div>

                <div class="ai-field-group" style="margin-top: 6px;">
                  <label class="ai-field-label">CONVERSATIONAL AI AGENT ID (OPTIONAL):</label>
                  <input type="text" id="ai-input-elevenlabs-agent-id" class="ai-text-input" placeholder="agent_id from ElevenLabs Dashboard" />
                </div>

                <div class="ai-two-col" style="margin-top: 6px;">
                  <div class="ai-field-group">
                    <label class="ai-field-label">VOICE PRESET:</label>
                    <select id="ai-select-voice" class="ai-text-input" style="cursor: pointer;">
                      ${ELEVENLABS_VOICES.map(v => `<option value="${v.id}">${v.name}</option>`).join("")}
                    </select>
                  </div>
                  <div class="ai-field-group">
                    <label class="ai-field-label">TTS MODEL ID:</label>
                    <select id="ai-select-el-model" class="ai-text-input">
                      <option value="eleven_flash_v2_5">eleven_flash_v2_5 (Lowest Latency ~75ms)</option>
                      <option value="eleven_multilingual_v2">eleven_multilingual_v2 (High Quality)</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- LLM Provider Section -->
              <div class="ai-field-group">
                <label class="ai-field-label">LLM API KEY (OpenRouter / OpenAI):</label>
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

              <div class="ai-key-actions" style="margin-top: 12px;">
                <button type="button" class="ai-action-btn btn-save" id="ai-btn-save-key">[★ SAVE ALL CONFIG]</button>
                <button type="button" class="ai-action-btn btn-clear-key" id="ai-btn-clear-key">[DELETE KEYS]</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Messages Stream -->
        <div class="ai-chat-messages" id="ai-chat-messages"></div>

        <!-- Quick Prompt Chips Row -->
        <div class="ai-preset-chips-row">
          <span class="ai-chips-tag">VOICE ACTIONS:</span>
          <button class="ai-prompt-chip highlight-chip" data-prompt="Show today's revenue and send the master on break">[🎙️ Revenue & Staff Break]</button>
          <button class="ai-prompt-chip highlight-chip" data-prompt="Trigger SLA delay alert for waiting lounge">[🚨 SLA Voice Alert]</button>
          <button class="ai-prompt-chip" data-prompt="Set waiting lounge alert threshold to 20 minutes so steam appears over the sofa">[Steam at 20m]</button>
          <button class="ai-prompt-chip" data-prompt="Bind YClients data stream with status_visit to suite_aromatherapy">[YClients CRM]</button>
          <button class="ai-prompt-chip" data-prompt="Turn on aromatherapy diffuser in suite_aromatherapy">[Diffuser ON]</button>
        </div>

        <!-- Voice Push-To-Talk Indicator / Input Bar -->
        <div id="ai-recording-indicator" class="ai-recording-indicator" style="display: none;">
          <span class="rec-dot">●</span>
          <span class="rec-label">LISTENING... Hold SPACEBAR or speak into mic:</span>
          <span class="rec-transcript" id="ai-rec-live-transcript">...</span>
        </div>

        <form class="ai-chat-input-bar" id="ai-chat-form">
          <button type="button" class="ai-mic-btn" id="ai-btn-mic" title="Hold SPACEBAR or click to speak voice command">[🎙️ REC]</button>
          <input
            type="text"
            id="ai-chat-input"
            class="ai-chat-input"
            placeholder="Speak (hold SPACE) or type: show revenue and send master on break..."
            autocomplete="off"
          />
          <button type="submit" class="ai-send-btn" id="ai-btn-send">[>] SEND</button>
        </form>
      </div>
    `;

    document.body.appendChild(this.containerEl);

    this.launcherBtn = document.getElementById("ai-chat-launcher") as HTMLElement;
    this.chatWindowEl = document.getElementById("ai-chat-panel") as HTMLElement;
    this.messagesStreamEl = document.getElementById("ai-chat-messages") as HTMLElement;
    this.inputFieldEl = document.getElementById("ai-chat-input") as HTMLInputElement;
    this.sendBtnEl = document.getElementById("ai-btn-send") as HTMLButtonElement;
    this.micBtnEl = document.getElementById("ai-btn-mic") as HTMLButtonElement;
    this.keyModalEl = document.getElementById("ai-key-modal") as HTMLElement;
    this.statusPillEl = document.getElementById("ai-status-pill") as HTMLElement;
    this.voiceStatusPillEl = document.getElementById("ai-voice-status-pill") as HTMLElement;
    this.launcherDotEl = document.getElementById("ai-launcher-dot") as HTMLElement;
    this.voiceHudEl = document.getElementById("ai-voice-speaking-hud") as HTMLElement;

    this.bindEvents();
    this.initKeyModalInputs();
  }

  private bindEvents() {
    this.launcherBtn?.addEventListener("click", () => this.toggleChat());
    document.getElementById("ai-btn-close")?.addEventListener("click", () => this.toggleChat(false));

    document.getElementById("ai-btn-clear")?.addEventListener("click", () => {
      this.messages = [];
      this.messagesStreamEl.innerHTML = "";
      this.loadInitialGreeting();
      soundManager.playAction("tap");
    });

    document.getElementById("ai-btn-settings")?.addEventListener("click", () => {
      this.openKeyModal(true);
    });

    document.getElementById("ai-key-close")?.addEventListener("click", () => {
      this.openKeyModal(false);
    });

    const btnToggleVis = document.getElementById("ai-btn-toggle-key-vis");
    const inputKey = document.getElementById("ai-input-api-key") as HTMLInputElement;
    btnToggleVis?.addEventListener("click", () => {
      if (inputKey) inputKey.type = inputKey.type === "password" ? "text" : "password";
    });

    const btnToggleElVis = document.getElementById("ai-btn-toggle-el-key-vis");
    const inputElKey = document.getElementById("ai-input-elevenlabs-key") as HTMLInputElement;
    btnToggleElVis?.addEventListener("click", () => {
      if (inputElKey) inputElKey.type = inputElKey.type === "password" ? "text" : "password";
    });

    document.getElementById("ai-btn-test-voice")?.addEventListener("click", () => {
      if (inputElKey && inputElKey.value) {
        voiceAgentService.setApiKey(inputElKey.value);
      }
      const selectVoice = document.getElementById("ai-select-voice") as HTMLSelectElement;
      if (selectVoice) voiceAgentService.setVoiceId(selectVoice.value);

      soundManager.playZenChime();
      voiceAgentService.speak({
        text: "Welcome to SpatialTwin Zen Wellness diorama. I am your AI receptionist powered by ElevenLabs streaming voice. All systems are operational.",
        speaker: "receptionist",
        speakerName: "Receptionist Lin (ElevenLabs)"
      });
    });

    this.voiceStatusPillEl?.addEventListener("click", () => {
      voiceAgentService.setEnabled(!voiceAgentService.isEnabled);
      this.updateKeyStatusUI();
      soundManager.playAction("tap");
    });

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

    document.getElementById("ai-btn-save-key")?.addEventListener("click", () => {
      if (inputKey && inputBaseUrl && inputModel) {
        aiAgentService.setApiKey(inputKey.value);
        aiAgentService.setBaseUrl(inputBaseUrl.value);
        aiAgentService.setModel(inputModel.value);
      }
      if (inputElKey) {
        voiceAgentService.setApiKey(inputElKey.value);
      }
      const inputAgentId = document.getElementById("ai-input-elevenlabs-agent-id") as HTMLInputElement;
      if (inputAgentId) {
        voiceAgentService.setAgentId(inputAgentId.value);
      }
      const selectVoice = document.getElementById("ai-select-voice") as HTMLSelectElement;
      if (selectVoice) voiceAgentService.setVoiceId(selectVoice.value);

      const selectElModel = document.getElementById("ai-select-el-model") as HTMLSelectElement;
      if (selectElModel) voiceAgentService.setModel(selectElModel.value);

      this.updateKeyStatusUI();
      this.openKeyModal(false);
      soundManager.playZenChime();

      this.appendSystemNotice(
        `[✓] Configuration saved. ElevenLabs: ${voiceAgentService.hasApiKey() ? "ONLINE (Streaming)" : "STANDALONE FALLBACK"}. LLM Engine: ${aiAgentService.hasApiKey() ? aiAgentService.getModel() : "Dynamic Heuristic Engine"}.`
      );
    });

    document.getElementById("ai-btn-clear-key")?.addEventListener("click", () => {
      aiAgentService.setApiKey("");
      voiceAgentService.setApiKey("");
      voiceAgentService.setAgentId("");
      if (inputKey) inputKey.value = "";
      if (inputElKey) inputElKey.value = "";
      this.updateKeyStatusUI();
      soundManager.playAction("tap");
      this.appendSystemNotice("[i] Keys removed from local storage.");
    });

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

    const form = document.getElementById("ai-chat-form") as HTMLFormElement;
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = this.inputFieldEl.value.trim();
      if (val) {
        this.handleSendMessage(val);
      }
    });

    this.micBtnEl?.addEventListener("mousedown", () => this.startVoiceRecording());
    this.micBtnEl?.addEventListener("mouseup", () => this.stopVoiceRecording());
    this.micBtnEl?.addEventListener("touchstart", (e) => { e.preventDefault(); this.startVoiceRecording(); });
    this.micBtnEl?.addEventListener("touchend", (e) => { e.preventDefault(); this.stopVoiceRecording(); });
  }

  private bindGlobalSpacebar() {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.code === "Space" && !this.isSpaceRecording) {
        const target = e.target as HTMLElement;
        const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
        if (!isTyping) {
          e.preventDefault();
          this.isSpaceRecording = true;
          this.startVoiceRecording();
        }
      }
    });

    window.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.code === "Space" && this.isSpaceRecording) {
        e.preventDefault();
        this.isSpaceRecording = false;
        this.stopVoiceRecording();
      }
    });
  }

  private startVoiceRecording() {
    const recIndicator = document.getElementById("ai-recording-indicator");
    const liveTranscriptEl = document.getElementById("ai-rec-live-transcript");
    if (recIndicator) recIndicator.style.display = "flex";
    if (this.micBtnEl) this.micBtnEl.classList.add("recording");

    soundManager.playAction("tap");

    voiceAgentService.startListening(
      (interim) => {
        if (liveTranscriptEl) liveTranscriptEl.textContent = interim;
        if (this.inputFieldEl) this.inputFieldEl.value = interim;
      },
      (finalText) => {
        if (recIndicator) recIndicator.style.display = "none";
        if (this.micBtnEl) this.micBtnEl.classList.remove("recording");
        if (finalText.trim()) {
          this.handleSendMessage(finalText.trim(), true);
        }
      },
      (err) => {
        if (recIndicator) recIndicator.style.display = "none";
        if (this.micBtnEl) this.micBtnEl.classList.remove("recording");
        console.warn("[AiOwnerChatWidget] Voice recording error or cancel:", err);
      }
    );
  }

  private stopVoiceRecording() {
    voiceAgentService.stopListening();
    const recIndicator = document.getElementById("ai-recording-indicator");
    if (recIndicator) recIndicator.style.display = "none";
    if (this.micBtnEl) this.micBtnEl.classList.remove("recording");
  }

  private bindVoiceEvents() {
    window.addEventListener("spatialtwin:speech_start", ((e: CustomEvent) => {
      const { text, speakerName } = e.detail || {};
      if (this.voiceHudEl) {
        this.voiceHudEl.style.display = "flex";
        const nameEl = document.getElementById("ai-voice-speaker-name");
        const engineEl = document.getElementById("ai-voice-engine-badge");
        const textEl = document.getElementById("ai-voice-live-text");

        if (nameEl) nameEl.textContent = (speakerName || "VOICE AGENT").toUpperCase();
        if (engineEl) engineEl.textContent = voiceAgentService.hasApiKey() ? "● ELEVENLABS STREAMING" : "○ BROWSER SPEECH SYNTHESIS";
        if (textEl) textEl.textContent = `"${text}"`;
      }
    }) as EventListener);

    window.addEventListener("spatialtwin:speech_end", (() => {
      if (this.voiceHudEl) {
        setTimeout(() => {
          if (!voiceAgentService.isSpeaking) {
            this.voiceHudEl.style.display = "none";
          }
        }, 1200);
      }
    }) as EventListener);
  }

  private initKeyModalInputs() {
    const inputKey = document.getElementById("ai-input-api-key") as HTMLInputElement;
    const inputBaseUrl = document.getElementById("ai-input-base-url") as HTMLInputElement;
    const inputModel = document.getElementById("ai-input-model") as HTMLInputElement;
    const inputElKey = document.getElementById("ai-input-elevenlabs-key") as HTMLInputElement;
    const inputAgentId = document.getElementById("ai-input-elevenlabs-agent-id") as HTMLInputElement;
    const selectVoice = document.getElementById("ai-select-voice") as HTMLSelectElement;
    const selectElModel = document.getElementById("ai-select-el-model") as HTMLSelectElement;

    if (inputKey) inputKey.value = aiAgentService.getApiKey();
    if (inputBaseUrl) inputBaseUrl.value = aiAgentService.getBaseUrl();
    if (inputModel) inputModel.value = aiAgentService.getModel();
    if (inputElKey) inputElKey.value = voiceAgentService.getApiKey();
    if (inputAgentId) inputAgentId.value = voiceAgentService.getAgentId();
    if (selectVoice) selectVoice.value = voiceAgentService.getVoiceId();
    if (selectElModel) selectElModel.value = voiceAgentService.getModel();
  }

  public updateKeyStatusUI() {
    const hasLlmKey = aiAgentService.hasApiKey();
    const hasElevenKey = voiceAgentService.hasApiKey();

    if (this.launcherDotEl) {
      this.launcherDotEl.className = `ai-launcher-status-dot ${hasLlmKey || hasElevenKey ? "dot-online" : "dot-demo"}`;
      this.launcherDotEl.title = hasElevenKey ? "ElevenLabs Online" : "Voice Fallback Ready";
    }

    if (this.statusPillEl) {
      if (hasLlmKey) {
        this.statusPillEl.className = "ai-status-pill pill-online";
        this.statusPillEl.textContent = "● VERCEL AI SDK";
        this.statusPillEl.title = `Connected to ${aiAgentService.getModel()}`;
      } else {
        this.statusPillEl.className = "ai-status-pill pill-demo";
        this.statusPillEl.textContent = "○ LOCAL DEMO";
        this.statusPillEl.title = "Local Dynamic Engine (Click [⚙ KEY] to connect OpenAI / OpenRouter)";
      }
    }

    if (this.voiceStatusPillEl) {
      if (!voiceAgentService.isEnabled) {
        this.voiceStatusPillEl.className = "ai-status-pill pill-voice-mute";
        this.voiceStatusPillEl.textContent = "🔇 VOICE: OFF";
      } else if (hasElevenKey) {
        this.voiceStatusPillEl.className = "ai-status-pill pill-voice-online";
        this.voiceStatusPillEl.textContent = "🎙️ ELEVENLABS";
      } else {
        this.voiceStatusPillEl.className = "ai-status-pill pill-voice-status";
        this.voiceStatusPillEl.textContent = "🎙️ SYNTHESIS";
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
      content: `Welcome to SpatialTwin Voice & Operations Copilot powered by **ElevenLabs** and **Vercel AI SDK**.
You can issue commands via voice (hold **SPACEBAR** or click **[🎙️ REC]**), or click any quick action:

• \`"Show today's revenue and send the master on break"\` — reads revenue metrics and dispatches Master Somchai to the tea lounge
• \`"Trigger SLA delay alert for waiting lounge"\` — Receptionist Lin announces wait-time delay in calm concierge voice
• \`"Set waiting lounge alert threshold to 20 minutes"\` — dynamically configures diorama rules and particle warnings
• Multi-Bot Bus: parallel bots can invoke \`voiceAgentService.speak(...)\` or dispatch \`spatialtwin:voice_speak\`.`
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
    senderTag.textContent = msg.role === "user" ? "[YOU]" : "[AI VOICE COPILOT]";

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

    if (msg.toolCalls && msg.toolCalls.length > 0) {
      const toolContainer = document.createElement("div");
      toolContainer.className = "ai-tool-calls-container";

      msg.toolCalls.forEach(tc => {
        const card = document.createElement("div");
        card.className = "ai-tool-call-card";

        const cardHeader = document.createElement("div");
        cardHeader.className = "ai-tool-header";
        cardHeader.innerHTML = `
          <span class="ai-tool-icon">[⚡ MCP TOOL]</span>
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

  public async handleSendMessage(text: string, isVoice = false) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    soundManager.playAction("tap");

    if (isVoice && !this.isChatOpen) {
      this.toggleChat(true);
    }

    this.appendMessage({
      id: `usr_${Date.now()}`,
      role: "user",
      timestamp: this.getTime(),
      content: isVoice ? `🎙️ "${text}"` : text
    });

    if (this.inputFieldEl) {
      this.inputFieldEl.value = "";
    }

    const indicator = document.createElement("div");
    indicator.className = "ai-msg-row ai-msg-assistant ai-processing-indicator";
    indicator.innerHTML = `
      <div class="ai-msg-header">
        <span class="ai-sender-tag">[AI VOICE COPILOT]</span>
        <span class="ai-time-tag">[${this.getTime()}]</span>
      </div>
      <div class="ai-msg-body"><span class="ai-dot-pulse">● ● ●</span> Reasoning, dispatching MCP tools & synthesizing ElevenLabs stream...</div>
    `;
    this.messagesStreamEl.appendChild(indicator);
    this.scrollToBottom();

    if (this.sendBtnEl) {
      this.sendBtnEl.disabled = true;
      this.sendBtnEl.textContent = "[...]";
    }

    try {
      const response = await aiAgentService.sendMessage(text, this.messages, isVoice);
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
        content: `Execution error: ${err.message}`
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
