// WebSocket client for the ESP32-C6 gimbal. Implements the phone->ESP32 side
// of docs/PROTOCOL.md: TRACKING,X: / LOST / CENTER / PING, throttled to
// roughly 10Hz for tracking updates, with auto-reconnect so a dropped or
// unreachable ESP32 degrades gracefully instead of crashing the app.

export type ConnectionState = "disconnected" | "connecting" | "connected";

const SEND_X_THROTTLE_MS = 100; // ~10Hz
const RECONNECT_DELAY_MS = 2000;

export class ESPSocket {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSendXAt = 0;
  private pendingX: number | null = null;
  private throttleTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;

  constructor(
    private host: string, // e.g. "192.168.1.99"
    private port: number = 81,
    private onStateChange?: (state: ConnectionState) => void,
    private onTelemetry?: (message: string) => void
  ) {}

  connect(): void {
    this.manuallyClosed = false;
    this.setState("connecting");

    const ws = new WebSocket(`ws://${this.host}:${this.port}/`);
    this.ws = ws;

    ws.onopen = () => {
      this.setState("connected");
    };

    ws.onmessage = (event) => {
      this.onTelemetry?.(String(event.data));
    };

    ws.onerror = () => {
      // onclose fires after onerror; reconnect is scheduled there.
    };

    ws.onclose = () => {
      this.ws = null;
      this.setState("disconnected");
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setState("disconnected");
  }

  // Send normalized person-X (0..1). Throttled to ~10Hz; if called faster,
  // only the most recent value is sent at the next tick.
  sendX(x: number): void {
    this.pendingX = x;
    const now = Date.now();
    const elapsed = now - this.lastSendXAt;

    if (elapsed >= SEND_X_THROTTLE_MS) {
      this.flushPendingX();
    } else if (!this.throttleTimer) {
      this.throttleTimer = setTimeout(() => this.flushPendingX(), SEND_X_THROTTLE_MS - elapsed);
    }
  }

  sendLost(): void {
    this.send("LOST");
  }

  sendCenter(): void {
    this.send("CENTER");
  }

  sendPing(): void {
    this.send("PING");
  }

  getState(): ConnectionState {
    return this.state;
  }

  private flushPendingX(): void {
    this.throttleTimer = null;
    if (this.pendingX === null) return;
    this.lastSendXAt = Date.now();
    this.send(`TRACKING,X:${this.pendingX.toFixed(2)}`);
    this.pendingX = null;
  }

  private send(message: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    }
    // Silently drop if not connected — callers should not need to check
    // connection state before every send; games keep running regardless.
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.onStateChange?.(state);
  }
}
