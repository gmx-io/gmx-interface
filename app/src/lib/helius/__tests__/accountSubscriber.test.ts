jest.mock('@/config/url', () => ({
  HELIUS_WSS_ENDPOINT: 'wss://example.com',
}));
jest.mock('@/config/featureFlagEnable', () => ({
  getGmw334Enabled: () => true,
}));

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  sentMessages: string[] = [];
  close = jest.fn();

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  message(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  disconnect(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

type WatcherInternals = {
  pendingRequests: Map<number, unknown>;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  subIdToPubkey: Map<number, string>;
  subscriptions: Map<string, { subId: number | null }>;
};

describe('HeliusAccountWatcher reconnect lifecycle', () => {
  beforeAll(() => {
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('drops request and subscription ids owned by a closed socket', async () => {
    const { getHeliusAccountWatcher } = await import('../accountSubscriber');
    const watcher = getHeliusAccountWatcher();
    const disposeFirst = watcher.watch('pubkey-1', jest.fn());
    const disposeSecond = watcher.watch('pubkey-2', jest.fn());
    const socket = MockWebSocket.instances[0];
    const internals = watcher as unknown as WatcherInternals;

    socket.open();
    expect(internals.pendingRequests.size).toBe(2);

    const firstRequest = JSON.parse(
      socket.sentMessages[0]
    ) as { id: number };
    socket.message({ id: firstRequest.id, result: 101 });
    expect(internals.pendingRequests.size).toBe(1);
    expect(internals.subIdToPubkey.get(101)).toBe('pubkey-1');

    socket.disconnect();

    expect(internals.pendingRequests.size).toBe(0);
    expect(internals.subIdToPubkey.size).toBe(0);
    expect(internals.subscriptions.get('pubkey-1')?.subId).toBeNull();

    disposeFirst();
    disposeSecond();
    if (internals.reconnectTimer) {
      clearTimeout(internals.reconnectTimer);
      internals.reconnectTimer = null;
    }
  });
});
