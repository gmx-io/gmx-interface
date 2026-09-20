import { HttpClient } from "../http/http";
import type { IHttp } from "../http/types";

export { HttpError } from "../http/http";

export type GmxSolanaWebSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"
  | "destroyed";

export type GmxSolanaWebSocketState = Readonly<{
  status: GmxSolanaWebSocketStatus;
  error: Error | null;
}>;

export type GmxSolanaWebSocketOptions = {
  onStateChange?: (state: GmxSolanaWebSocketState) => void;
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Error, event?: Event) => void;
  onClose?: (event: CloseEvent) => void;
};

/** Lazy connection; call disconnect() when unused, or destroy() for permanent cleanup. */
export function createGmxSolanaWebSocket(
  getEndpoint: () => string | undefined,
  options: GmxSolanaWebSocketOptions = {}
) {
  let socket: WebSocket | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryAttempt = 0;
  let active = false;
  let destroyed = false;
  let state: GmxSolanaWebSocketState = Object.freeze({ status: "idle", error: null });
  /// reconnection strategy: reconnect after 3 seconds, 5 seconds, and 10 seconds; 
  //  thereafter, continue attempting to reconnect every 10 seconds.
  const retryDelays = [3000, 5000, 10000];

  function setState(status: GmxSolanaWebSocketStatus, error = state.error) {
    state = Object.freeze({ status, error });
    options.onStateChange?.(state);
  }

  function clearRetry() {
    if (retryTimer !== undefined) clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  function detach(current: WebSocket) {
    current.onopen = null;
    current.onmessage = null;
    current.onerror = null;
    current.onclose = null;
  }

  function scheduleRetry(error: Error) {
    if (!active || destroyed || retryTimer !== undefined) return;
    const delay = retryDelays[Math.min(retryAttempt++, retryDelays.length - 1)];
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      open();
    }, delay);
    setState("reconnecting", error);
  }

  function open() {
    if (!active || destroyed || socket) return;

    let endpoint: string;
    try {
      endpoint = getEndpoint()?.trim() ?? "";
      if (!endpoint) throw new Error("VITE_GMX_SOLANA_WSS_ENV is not configured");
      const url = new URL(endpoint);
      if (url.protocol !== "wss:" && url.protocol !== "ws:") {
        throw new Error("VITE_GMX_SOLANA_WSS_ENV must be an absolute WS(S) URL");
      }
      if (typeof WebSocket === "undefined") throw new Error("WebSocket is not supported in this environment");
    } catch (cause) {
      active = false;
      const error = cause instanceof Error ? cause : new Error(String(cause));
      setState("error", error);
      options.onError?.(error);
      return;
    }

    let current: WebSocket;
    try {
      current = new WebSocket(endpoint);
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      scheduleRetry(error);
      options.onError?.(error);
      return;
    }
    socket = current;
    current.onopen = (event) => {
      if (socket !== current || !active || destroyed) return;
      retryAttempt = 0;
      setState("connected", null);
      options.onOpen?.(event);
    };
    current.onmessage = (event) => {
      if (socket === current && active && !destroyed) options.onMessage?.(event);
    };
    current.onerror = (event) => {
      if (socket !== current || !active || destroyed) return;
      const error = new Error("GMX Solana WebSocket connection error");
      // The browser emits close after a transport failure. Only close schedules a retry.
      setState(state.status, error);
      options.onError?.(error, event);
    };
    current.onclose = (event) => {
      if (socket !== current || destroyed) return;
      detach(current);
      socket = undefined;
      if (active) {
        scheduleRetry(
          new Error(`GMX Solana WebSocket closed (${event.code})${event.reason ? `: ${event.reason}` : ""}`)
        );
      } else {
        setState("disconnected", null);
      }
      options.onClose?.(event);
    };
    setState("connecting");
  }

  return {
    get state(): GmxSolanaWebSocketState {
      return state;
    },
    get status(): GmxSolanaWebSocketStatus {
      return state.status;
    },
    get error(): Error | null {
      return state.error;
    },
    connect() {
      if (destroyed) throw new Error("GMX Solana WebSocket client has been destroyed");
      if (active || socket || retryTimer !== undefined) return;
      active = true;
      retryAttempt = 0;
      open();
    },
    send(data: Parameters<WebSocket["send"]>[0]) {
      if (!active || destroyed || !socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error("GMX Solana WebSocket is not connected");
      }
      socket.send(data);
    },
    disconnect() {
      if (destroyed) return;
      active = false;
      clearRetry();
      retryAttempt = 0;
      // Keep the socket until close so connect() cannot overlap its closing handshake.
      socket?.close();
      setState("disconnected", null);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      active = false;
      clearRetry();
      if (socket) {
        detach(socket);
        socket.close();
        socket = undefined;
      }
      const onStateChange = options.onStateChange;
      options = {};
      state = Object.freeze({ status: "destroyed", error: null });
      onStateChange?.(state);
    },
  };
}

/** Resolve configuration on request so a missing endpoint does not prevent app startup. */
export function createGmxSolanaRequest(getEndpoint: () => string | undefined): IHttp {
  let client: HttpClient | undefined;

  function getClient(): HttpClient {
    const endpoint = getEndpoint()?.trim();
    if (!endpoint) {
      throw new Error("VITE_GMX_SOLANA_API_ENDPOINT is not configured");
    }

    try {
      const url = new URL(endpoint);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error("Unsupported protocol");
      }
    } catch {
      throw new Error("VITE_GMX_SOLANA_API_ENDPOINT must be an absolute HTTP(S) URL");
    }

    if (!client || client.url !== endpoint) {
      client = new HttpClient(endpoint);
    }
    return client;
  }

  return {
    get url() {
      return getClient().url;
    },
    async fetchJson<TResult>(
      path: string,
      opts?: { query?: Record<string, any>; transform?: (result: any) => TResult }
    ) {
      return getClient().fetchJson<TResult>(path, opts);
    },
    async postJson<TResult>(path: string, body: unknown, opts?: { transform?: (result: any) => TResult }) {
      return getClient().postJson<TResult>(path, body, opts);
    },
  };
}
