import { useSyncExternalStore } from "react";

import type { ContractsChainId } from "sdk/configs/chains";

// A single stale render (e.g. right after a tab refocus, before the refetch lands) must not tear
// down the api: staleness has to persist this long before the chain flips unhealthy.
const UNHEALTHY_CONFIRMATION_MS = 3_000;
// Require continuous freshness for this long before restoring, to avoid flapping at the threshold.
const RESTORE_COOLDOWN_MS = 15_000;

type ChainHealth = { healthy: boolean; lastStaleAt: number; staleSince: number | undefined };

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
    const current = this.healthByChain.get(chainId) ?? { healthy: true, lastStaleAt: 0, staleSince: undefined };

    if (isStale) {
      const staleSince = current.staleSince ?? now;
      const healthy = current.healthy && now - staleSince < UNHEALTHY_CONFIRMATION_MS;
      this.healthByChain.set(chainId, { healthy, lastStaleAt: now, staleSince });
      if (current.healthy && !healthy) {
        this.emit();
      }
      return;
    }

    if (!current.healthy && now - current.lastStaleAt >= RESTORE_COOLDOWN_MS) {
      this.healthByChain.set(chainId, { healthy: true, lastStaleAt: 0, staleSince: undefined });
      this.emit();
      return;
    }

    if (current.staleSince !== undefined) {
      this.healthByChain.set(chainId, { ...current, staleSince: undefined });
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
