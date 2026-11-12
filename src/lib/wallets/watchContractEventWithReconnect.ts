import type {
  Abi,
  ContractEventName,
  PublicClient,
  Transport,
  WatchContractEventParameters,
  WebSocketTransport,
} from "viem";

const MIN_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const FAILURES_RESET_MS = 2 * MAX_RECONNECT_DELAY_MS;

type WsTransport = ReturnType<WebSocketTransport>["config"] & ReturnType<WebSocketTransport>["value"];
type WsRpcClient = Awaited<ReturnType<WsTransport["getRpcClient"]>>;

type Unwatch = () => void;
type Watcher = { watch: (onError: (error: Error) => void) => Unwatch; unwatch?: Unwatch };

/**
 * Keeps the subscriptions of one client alive until their callers stop them: after a socket error it moves
 * all of them to a new socket. viem loses a subscription silently when it is created on a closed socket.
 * The client must be created with `reconnect: false`: this class owns reconnects, so a subscription is
 * never sent twice.
 */
class WsWatchers {
  client: PublicClient;
  watchers = new Set<Watcher>();
  rpcClient?: WsRpcClient;
  reconnectTimerId?: ReturnType<typeof setTimeout>;
  failedAttempts = 0;
  lastFailedAt = 0;
  isConnecting = false;

  constructor(client: PublicClient) {
    this.client = client;
  }

  add(watcher: Watcher) {
    this.watchers.add(watcher);
    this.connect();
  }

  remove(watcher: Watcher) {
    this.watchers.delete(watcher);
    watcher.unwatch?.();

    if (this.watchers.size === 0) {
      clearTimeout(this.reconnectTimerId);
    }
  }

  async connect() {
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    clearTimeout(this.reconnectTimerId);

    try {
      const rpcClient = await this.getOpenRpcClient();

      this.rpcClient = rpcClient;

      for (const watcher of this.watchers) {
        if (!watcher.unwatch) {
          this.startWatcher(watcher, rpcClient);
        }
      }
    } catch {
      this.scheduleReconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  async getOpenRpcClient() {
    const transport = this.client.transport as unknown as WsTransport;
    const rpcClient = await transport.getRpcClient();

    if (rpcClient.socket.readyState === rpcClient.socket.OPEN) {
      return rpcClient;
    }

    // viem keeps a closed client in its cache, closing it here removes it from there.
    rpcClient.close();

    return transport.getRpcClient();
  }

  startWatcher(watcher: Watcher, rpcClient: WsRpcClient) {
    // viem can report one failure several times
    let isActive = true;

    const unwatch = watcher.watch((error) => {
      if (!isActive) {
        return;
      }

      if (getIsRpcResponseError(error)) {
        this.stopWatcher(watcher);
        this.scheduleReconnect();
      } else {
        this.handleSocketFailure(rpcClient);
      }
    });

    watcher.unwatch = () => {
      isActive = false;
      unwatch();
    };
  }

  stopWatcher(watcher: Watcher) {
    watcher.unwatch?.();
    watcher.unwatch = undefined;
  }

  handleSocketFailure(rpcClient: WsRpcClient) {
    if (this.rpcClient !== rpcClient) {
      return;
    }

    this.rpcClient = undefined;
    this.watchers.forEach((watcher) => this.stopWatcher(watcher));
    rpcClient.close();
    this.scheduleReconnect();
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimerId);

    if (this.watchers.size === 0) {
      return;
    }

    const now = Date.now();

    if (now - this.lastFailedAt > FAILURES_RESET_MS) {
      this.failedAttempts = 0;
    }

    const delay = Math.min(MIN_RECONNECT_DELAY_MS * 2 ** this.failedAttempts, MAX_RECONNECT_DELAY_MS);

    this.lastFailedAt = now;
    this.failedAttempts += 1;
    this.reconnectTimerId = setTimeout(() => this.connect(), delay);
  }
}

// viem passes the raw JSON-RPC error when the server rejects a subscription: the socket and the other subscriptions are fine.
function getIsRpcResponseError(error: Error) {
  return !(error instanceof Error) && typeof (error as { code?: unknown }).code === "number";
}

const wsWatchersByClient = new WeakMap<PublicClient, WsWatchers>();

function getWsWatchers(client: PublicClient) {
  let wsWatchers = wsWatchersByClient.get(client);

  if (!wsWatchers) {
    wsWatchers = new WsWatchers(client);
    wsWatchersByClient.set(client, wsWatchers);
  }

  return wsWatchers;
}

export function watchContractEventWithReconnect<
  const abi extends Abi | readonly unknown[],
  eventName extends ContractEventName<abi>,
  strict extends boolean | undefined = undefined,
>(client: PublicClient, params: WatchContractEventParameters<abi, eventName, strict, Transport>): Unwatch {
  if (client.transport.type !== "webSocket") {
    return client.watchContractEvent(params);
  }

  const wsWatchers = getWsWatchers(client);
  const watcher: Watcher = { watch: (onError) => client.watchContractEvent({ ...params, onError }) };

  wsWatchers.add(watcher);

  return () => wsWatchers.remove(watcher);
}
