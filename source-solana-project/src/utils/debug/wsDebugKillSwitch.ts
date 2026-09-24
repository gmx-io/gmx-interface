// Dev-only WebSocket kill switch for testing reconnect/backoff behavior.
//
// Console usage (dev only):
//   __wsBlock()    -> sever all sockets and keep new ones from connecting
//   __wsRestore()  -> allow reconnection again
//   __wsStatus()   -> log the blocked flag and every live socket's state

const CLOSE_CODE = 4001;
const CLOSE_REASON = 'ws-debug-killswitch';

let blocked = false;
const liveSockets = new Set<WebSocket>();

function abort(ws: WebSocket): void {
  try {
    ws.close(CLOSE_CODE, CLOSE_REASON);
  } catch {
    /* already closing/closed */
  }
}

export function installWsDebugKillSwitch(): void {
  // Guard against double-install (e.g. HMR).
  if ((window as Window & { __wsBlock?: unknown }).__wsBlock) return;

  const Native = window.WebSocket;

  class PatchedWebSocket extends Native {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      liveSockets.add(this);
      this.addEventListener('close', () => liveSockets.delete(this));
      console.log('---------- new websocket connecting:', url);
      if (blocked) {
        queueMicrotask(() => {
          if (blocked) abort(this);
        });
      }
    }
  }

  window.WebSocket = PatchedWebSocket as unknown as typeof WebSocket;

  const w = window as Window & {
    __wsBlock?: () => void;
    __wsRestore?: () => void;
    __wsStatus?: () => void;
  };

  w.__wsBlock = () => {
    blocked = true;
    for (const ws of liveSockets) abort(ws);
    console.warn(
      '[ws-debug] BLOCKED -- all sockets severed; clients keep retrying and failing (watch the backoff).'
    );
  };

  w.__wsRestore = () => {
    blocked = false;
    console.warn('[ws-debug] RESTORED -- the next reconnect attempt will succeed.');
  };

  w.__wsStatus = () => {
    const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
    console.log(`[ws-debug] blocked=${blocked}, live sockets=${liveSockets.size}`);
    for (const ws of liveSockets) {
      console.log(`  ${states[ws.readyState]} ${ws.url}`);
    }
  };

  console.info('[ws-debug] kill switch ready: __wsBlock() / __wsRestore() / __wsStatus()');
}
