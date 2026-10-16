/**
 * Web Speech API Voice Interface for SpatialTwin AI Copilot
 */
export class VoiceAgentService {
  private static instance: VoiceAgentService;
  private recognition: any = null;
  public isListening = false;
  public isSupported = false;

  private constructor() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.isSupported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = "en-US";
    }
  }

  public static getInstance(): VoiceAgentService {
    if (!VoiceAgentService.instance) {
      VoiceAgentService.instance = new VoiceAgentService();
    }
    return VoiceAgentService.instance;
  }

  public startListening(onResult: (transcript: string) => void, onError?: (err: any) => void) {
    if (!this.recognition) return;
    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      this.isListening = false;
      onResult(text);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
    } catch {
      this.isListening = false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }

  public speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export const voiceAgentService = VoiceAgentService.getInstance();
