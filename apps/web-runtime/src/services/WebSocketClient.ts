import { WsMessage } from "@spatialtwin/core-schema";

type Listener = (msg: WsMessage) => void;

export class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private reconnectInterval = 2000;
  private isConnecting = false;
  public onConnectionChange?: (connected: boolean) => void;

  constructor(url = "ws://localhost:8000/ws") {
    this.url = url;
  }

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log(`[WS] Connected to SpatialTwin Bridge at ${this.url}`);
        this.onConnectionChange?.(true);
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.onConnectionChange?.(false);
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.ws.onerror = (err) => {
        console.warn("[WS] Connection error:", err);
        this.ws?.close();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          for (const listener of this.listeners) {
            listener(msg);
          }
        } catch (e) {
          console.error("[WS] Failed to parse message:", e, event.data);
        }
      };
    } catch (e) {
      this.isConnecting = false;
      this.onConnectionChange?.(false);
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  }
}

export const wsClient = new WebSocketClient();
