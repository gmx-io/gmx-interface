import { useSyncExternalStore } from "react";

import type { ContractsChainId } from "sdk/configs/chains";

// Require continuous freshness for this long before restoring, to avoid flapping at the threshold.
const RESTORE_COOLDOWN_MS = 15_000;

type ChainHealth = { healthy: boolean; lastStaleAt: number };

export class ApiHealthTracker {
  private static instance: ApiHealthTracker | null = null;

  static getInstance(): ApiHealthTracker {
    if (!ApiHealthTracker.instance) {
      ApiHealthTracker.instance = new ApiHealthTracker();
    }
    return ApiHealthTracker.instance;
  }

  private readonly healthByChain = new Map<ContractsChainId, ChainHealth>();
  private readonly listeners = new Set<() => void>();

  reportMarketsFreshness(chainId: ContractsChainId, isStale: boolean): void {
    const now = Date.now();
    const current = this.healthByChain.get(chainId) ?? { healthy: true, lastStaleAt: 0 };

    if (isStale) {
      this.healthByChain.set(chainId, { healthy: false, lastStaleAt: now });
      if (current.healthy) {
        this.emit();
      }
      return;
    }

    if (!current.healthy && now - current.lastStaleAt >= RESTORE_COOLDOWN_MS) {
      this.healthByChain.set(chainId, { healthy: true, lastStaleAt: 0 });
      this.emit();
    }
  }

  isHealthy(chainId: ContractsChainId): boolean {
    return this.healthByChain.get(chainId)?.healthy ?? true;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export function useIsApiHealthy(chainId: ContractsChainId): boolean {
  const tracker = ApiHealthTracker.getInstance();
  return useSyncExternalStore(
    tracker.subscribe,
    () => tracker.isHealthy(chainId),
    () => true
  );
}
