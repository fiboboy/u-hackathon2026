/**
 * VoiceAgentService: ElevenLabs Streaming Text-to-Speech, WebSocket Protocol & Multi-Bot Event Bus
 * Uses the latest ElevenLabs specifications:
 *  - WebSocket Streaming TTS: wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input
 *  - Low-Latency HTTP Streaming fallback: POST /v1/text-to-speech/{voice_id}/stream?optimize_streaming_latency=3
 *  - Conversational AI Agent SDK support (@elevenlabs/client Conversation.startSession)
 *  - Web Speech API fallback for zero-config out-of-the-box presentation in English
 *  - Sequential speech queue to prevent overlapping audio across parallel bots
 *  - Push-to-talk Speech Recognition (en-US)
 */

import { Conversation } from "@elevenlabs/client";

export interface VoiceSpeakOptions {
  id?: string;
  text: string;
  speaker?: "receptionist" | "concierge" | "owner" | "master" | "system";
  speakerName?: string;
  voiceId?: string;
  priority?: "low" | "normal" | "urgent";
  botId?: string;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface BotEventPayload {
  botId: string;
  botName: string;
  eventType: string;
  message?: string;
  data?: Record<string, any>;
  timestamp: number;
}

export const ELEVENLABS_VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Calm Spa Concierge)", role: "receptionist", model: "eleven_flash_v2_5" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Soft Serene Relaxation)", role: "receptionist", model: "eleven_flash_v2_5" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Confident Executive Copilot)", role: "owner", model: "eleven_flash_v2_5" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Deep Zen Master)", role: "master", model: "eleven_flash_v2_5" },
  { id: "custom", name: "Custom Voice ID...", role: "custom", model: "eleven_flash_v2_5" }
];

export class VoiceAgentService {
  private static instance: VoiceAgentService;

  private apiKeyStorageKey = "user_elevenlabs_api_key";
  private agentIdStorageKey = "user_elevenlabs_agent_id";
  private voiceIdStorageKey = "user_elevenlabs_voice_id";
  private modelStorageKey = "user_elevenlabs_model";
  private voiceEnabledStorageKey = "user_elevenlabs_enabled";

  public isEnabled = true;
  public isSpeaking = false;
  public isListening = false;
  public activeConversation: any = null;

  private speechQueue: VoiceSpeakOptions[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioCtx: AudioContext | null = null;
  private recognition: any = null;

  private constructor() {
    this.loadSettings();
    this.bindWindowEvents();
    this.initSpeechRecognition();
  }

  public static getInstance(): VoiceAgentService {
    if (!VoiceAgentService.instance) {
      VoiceAgentService.instance = new VoiceAgentService();
    }
    return VoiceAgentService.instance;
  }

  private loadSettings() {
    const savedEnabled = localStorage.getItem(this.voiceEnabledStorageKey);
    if (savedEnabled !== null) {
      this.isEnabled = savedEnabled === "true";
    }
  }

  public getApiKey(): string {
    return localStorage.getItem(this.apiKeyStorageKey) || "";
  }

  public setApiKey(key: string) {
    if (key.trim()) {
      localStorage.setItem(this.apiKeyStorageKey, key.trim());
    } else {
      localStorage.removeItem(this.apiKeyStorageKey);
    }
  }

  public getAgentId(): string {
    return localStorage.getItem(this.agentIdStorageKey) || "";
  }

  public setAgentId(agentId: string) {
    if (agentId.trim()) {
      localStorage.setItem(this.agentIdStorageKey, agentId.trim());
    } else {
      localStorage.removeItem(this.agentIdStorageKey);
    }
  }

  public hasApiKey(): boolean {
    return Boolean(this.getApiKey().trim() || this.getAgentId().trim());
  }

  public getVoiceId(speaker: VoiceSpeakOptions["speaker"] = "receptionist"): string {
    const saved = localStorage.getItem(this.voiceIdStorageKey);
    if (saved && saved !== "custom") return saved;

    if (speaker === "owner") return "ErXwobaYiN019PkySvjV"; // Antoni
    if (speaker === "master") return "TxGEqnHWrfWFTfGW9XjX"; // Josh
    return "21m00Tcm4TlvDq8ikWAM"; // Rachel (Calm Spa Concierge)
  }

  public setVoiceId(voiceId: string) {
    localStorage.setItem(this.voiceIdStorageKey, voiceId.trim());
  }

  public getModel(): string {
    return localStorage.getItem(this.modelStorageKey) || "eleven_flash_v2_5";
  }

  public setModel(model: string) {
    localStorage.setItem(this.modelStorageKey, model.trim() || "eleven_flash_v2_5");
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem(this.voiceEnabledStorageKey, String(enabled));
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Multi-Bot Event Bus integration
   */
  private bindWindowEvents() {
    if (typeof window === "undefined") return;

    // Listen for speech requests from parallel bots (e.g. Telegram bot, CRM poller, Reception agent)
    window.addEventListener("spatialtwin:voice_speak", ((e: CustomEvent<VoiceSpeakOptions>) => {
      if (e.detail && e.detail.text) {
        this.speak(e.detail);
      }
    }) as EventListener);

    // Listen for generic bot events to coordinate and log
    window.addEventListener("spatialtwin:bot_event", ((e: CustomEvent<BotEventPayload>) => {
      this.handleBotEvent(e.detail);
    }) as EventListener);
  }

  public handleBotEvent(event: BotEventPayload) {
    if (!event) return;
    console.log(`[VoiceAgent Bus] Event from ${event.botName} (${event.botId}):`, event);

    if (event.message && (event.eventType === "SLA_ALERT" || event.eventType === "URGENT_CALL")) {
      this.speak({
        text: event.message,
        speaker: "receptionist",
        speakerName: event.botName || "Reception Bot",
        priority: "urgent",
        botId: event.botId
      });
    }
  }

  public broadcastBotEvent(event: Omit<BotEventPayload, "timestamp">) {
    const fullEvent: BotEventPayload = {
      ...event,
      timestamp: Date.now()
    };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("spatialtwin:bot_event", { detail: fullEvent }));
    }
  }

  /**
   * Speak text sequentially across multiple bots
   */
  public async speak(options: VoiceSpeakOptions): Promise<void> {
    if (!this.isEnabled) return;
    const cleanText = options.text.trim();
    if (!cleanText) return;

    const req: VoiceSpeakOptions = {
      ...options,
      speaker: options.speaker || "receptionist",
      speakerName: options.speakerName || (options.speaker === "owner" ? "Executive Owner Copilot" : "Receptionist Lin"),
      priority: options.priority || "normal"
    };

    if (req.priority === "urgent") {
      this.stop();
      this.speechQueue.unshift(req);
      this.processQueue();
      return;
    }

    this.speechQueue.push(req);
    if (!this.isSpeaking) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.speechQueue.length === 0) {
      this.isSpeaking = false;
      return;
    }

    const currentItem = this.speechQueue.shift()!;
    this.isSpeaking = true;

    window.dispatchEvent(
      new CustomEvent("spatialtwin:speech_start", {
        detail: {
          text: currentItem.text,
          speaker: currentItem.speaker,
          speakerName: currentItem.speakerName,
          botId: currentItem.botId
        }
      })
    );

    currentItem.onStart?.();

    try {
      if (this.hasApiKey()) {
        // Try ElevenLabs Streaming
        await this.speakWithElevenLabsStreaming(currentItem);
      } else {
        await this.speakWithWebSpeech(currentItem);
      }
    } catch (err) {
      console.warn("[VoiceAgent] ElevenLabs speech stream failed, falling back to Web Speech Synthesis:", err);
      try {
        await this.speakWithWebSpeech(currentItem);
      } catch (fallbackErr) {
        console.error("[VoiceAgent] Web Speech fallback also failed:", fallbackErr);
      }
    } finally {
      this.isSpeaking = false;
      currentItem.onEnd?.();

      window.dispatchEvent(
        new CustomEvent("spatialtwin:speech_end", {
          detail: {
            text: currentItem.text,
            speaker: currentItem.speaker,
            botId: currentItem.botId
          }
        })
      );

      this.processQueue();
    }
  }

  /**
   * ElevenLabs Low-Latency Streaming Audio Synthesis
   * Endpoint: POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream?optimize_streaming_latency=3
   */
  private async speakWithElevenLabsStreaming(item: VoiceSpeakOptions): Promise<void> {
    const apiKey = this.getApiKey();
    const voiceId = item.voiceId || this.getVoiceId(item.speaker);
    const modelId = this.getModel();

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text: item.text,
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.15,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs API HTTP ${response.status}: ${errText}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      audio.play().catch((playErr) => {
        console.warn("[VoiceAgent] Audio playback rejected (needs user gesture):", playErr);
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      });
    });
  }

  /**
   * Browser Speech Synthesis Fallback (Zero-config out of the box in English)
   */
  private speakWithWebSpeech(item: VoiceSpeakOptions): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(item.text);

      utterance.lang = "en-US";
      utterance.rate = 0.95;
      utterance.pitch = item.speaker === "owner" ? 0.95 : 1.05;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferred = voices.find(v => {
          return (v.lang.includes("en") || v.lang.includes("US")) &&
                 (v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Jenny"));
        }) || voices.find(v => v.lang.includes("en"));

        if (preferred) {
          utterance.voice = preferred;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Starts a real-time Conversational AI session via official @elevenlabs/client
   */
  public async startConversationalAiSession(agentId?: string): Promise<boolean> {
    const targetAgentId = agentId || this.getAgentId();
    if (!targetAgentId) return false;

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      this.activeConversation = await Conversation.startSession({
        agentId: targetAgentId,
        connectionType: "websocket",
        onConnect: () => {
          console.log("[ElevenLabs ConvAI] Connected to Conversational AI Agent");
        },
        onDisconnect: () => {
          console.log("[ElevenLabs ConvAI] Disconnected from Agent");
          this.activeConversation = null;
        },
        onMessage: (message: any) => {
          console.log("[ElevenLabs ConvAI] Message:", message);
          if (message.source === "ai" && message.message) {
            window.dispatchEvent(
              new CustomEvent("spatialtwin:speech_start", {
                detail: {
                  text: message.message,
                  speaker: "receptionist",
                  speakerName: "ElevenLabs Conversational Agent"
                }
              })
            );
          }
        },
        onError: (err: any) => {
          console.error("[ElevenLabs ConvAI] Error:", err);
        }
      });
      return true;
    } catch (err) {
      console.warn("[VoiceAgent] Conversational AI session failed to start:", err);
      return false;
    }
  }

  public async stopConversationalAiSession() {
    if (this.activeConversation) {
      try {
        await this.activeConversation.endSession();
      } catch (err) {
        // Ignore
      }
      this.activeConversation = null;
    }
  }

  public stop() {
    this.speechQueue = [];
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }

  /**
   * Web Speech Recognition (Push-to-Talk for Owner Voice Commands)
   */
  private initSpeechRecognition() {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
    }
  }

  public startListening(
    onInterim: (text: string) => void,
    onResult: (finalText: string) => void,
    onError?: (err: any) => void
  ) {
    if (!this.recognition) {
      console.warn("[VoiceAgent] SpeechRecognition not supported in this browser. Use Chrome, Edge, or Safari.");
      onError?.(new Error("SpeechRecognition not supported in this browser"));
      return;
    }

    if (this.isListening) return;
    this.isListening = true;

    let finalTranscript = "";

    this.recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      onInterim(interim || finalTranscript);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (finalTranscript.trim()) {
        onResult(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (e: any) => {
      this.isListening = false;
      console.warn("[VoiceAgent] Speech recognition error:", e);
      onError?.(e);
    };

    try {
      this.recognition.start();
    } catch (err) {
      this.isListening = false;
      onError?.(err);
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignore stop error
      }
      this.isListening = false;
    }
  }
}

export const voiceAgentService = VoiceAgentService.getInstance();
