import { create } from 'zustand';

// After the marin migration, position state changes flow through the
// marin `positions(owner)` subscription instead of a Helius
// `transactionSubscribe` cascade. This store no longer manages a
// WebSocket connection — it only retains the cross-component refresh
// flag (`isRefreshPositionAndOrder`) used by ExchangeNew /
// useTriggerCancelOrder, plus the `connect` / `disconnect` /
// `sendJsonMessage` no-op API surface that DataFetcher still calls
// during render so its existing wiring keeps compiling without an
// invasive refactor.
//
// The full Helius `transactionSubscribe` implementation lived in this
// file before cleanup; consult git history for the prior implementation.

interface SocketState {
  isRefreshPositionAndOrder: boolean;
  readyState: number;
  setIsRefreshPositionAndOrder: (isRefreshPositionAndOrder: boolean) => void;
  // No-op: the position pipeline is push-driven via marin. Kept so the
  // existing DataFetcher useEffect signatures continue to compile.
  sendJsonMessage: (positionKeys: string[]) => void;
  // No-op. `readyState` is reported as OPEN so DataFetcher's reconnect
  // logic does not loop attempting to revive a connection that no
  // longer exists.
  connect: (program: unknown) => void;
  disconnect: () => void;
}

const usePositionSocketStore = create<SocketState>((set) => ({
  isRefreshPositionAndOrder: false,
  readyState: WebSocket.OPEN,
  setIsRefreshPositionAndOrder: (isRefreshPositionAndOrder: boolean) =>
    set({ isRefreshPositionAndOrder }),
  sendJsonMessage: () => {
    // Intentional no-op. Marin position subscription is owner-scoped and
    // does not need per-position-key push from the client.
  },
  connect: () => {
    // Intentional no-op.
  },
  disconnect: () => {
    // Intentional no-op.
  },
}));

export default usePositionSocketStore;
