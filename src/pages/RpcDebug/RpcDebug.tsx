import { useCallback, useEffect, useState } from "react";

import { getProviderNameFromUrl } from "config/rpc";
import { useMarketsInfoRequest } from "domain/synthetics/markets/useMarketsInfoRequest";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { useChainId } from "lib/chains";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { FreshnessMetricId } from "lib/metrics/types";
import { _debugMulticall, MulticallDebugState } from "lib/multicall/_debug";
import { getCurrentRpcUrls, getRpcTrackerByChainId } from "lib/rpc/useRpcUrls";
import { usePrevious } from "lib/usePrevious";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Card from "components/Card/Card";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

import {
  DebugControlsPanel,
  EventsPanel,
  MarketsSection,
  NetworkStatusSection,
  RpcTable,
  GroupedEvent,
  RpcStats,
} from "./parts";

const GRID_STYLE = { minHeight: "600px", maxHeight: "calc(100vh - 250px)" };

export default function RpcDebug() {
  const { chainId } = useChainId();
  const { primary: primaryRpc, fallbacks } = getCurrentRpcUrls(chainId);
  const secondaryRpc = fallbacks[0];
  const prevPrimaryRpc = usePrevious(primaryRpc);
  const { tokensData } = useTokensDataRequest(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });

  const [debugState, setDebugState] = useState<MulticallDebugState>(_debugMulticall?.getDebugState() ?? {});
  const [events, setEvents] = useState<GroupedEvent[]>([]);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [allRpcStats, setAllRpcStats] = useState<RpcStats[]>([]);
  const [freshnessValues, setFreshnessValues] = useState<{
    marketValues: number | undefined;
    balances: number | undefined;
  }>({ marketValues: undefined, balances: undefined });
  const [freshnessHistory, setFreshnessHistory] = useState<{
    marketValues: number[];
    balances: number[];
  }>({ marketValues: [], balances: [] });
  const [networkObserverState, setNetworkObserverState] = useState<
    Record<string, { trackingFailed: boolean; isActive: boolean }>
  >({});

  // Subscribe to debug events
  useEffect(() => {
    const unsubscribe = _debugMulticall?.onEvent((event) => {
      setIdleSeconds(0);
      setEvents((prev) => {
        const now = Date.now();
        const GROUPING_WINDOW = 100; // Group events within 100ms
        const MAX_GROUPS = 500;
        const CLEAR_COUNT = 100;

        // Find if there's a recent group
        const lastGroup = prev[prev.length - 1];
        let newEvents: GroupedEvent[];

        if (lastGroup && now - lastGroup.timestamp < GROUPING_WINDOW) {
          // Add to existing group
          newEvents = [
            ...prev.slice(0, -1),
            {
              ...lastGroup,
              events: [...lastGroup.events, event],
            },
          ];
        } else {
          // Create new group
          newEvents = [...prev, { timestamp: now, events: [event] }];
        }

        if (newEvents.length > MAX_GROUPS) {
          return newEvents.slice(CLEAR_COUNT);
        }

        return newEvents;
      });
    });

    return unsubscribe;
  }, []);

  // Idle timer
  useEffect(() => {
    if (events.length === 0) {
      const interval = setInterval(() => {
        setIdleSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setIdleSeconds(0);
    }
  }, [events.length]);

  // Update all RPC stats
  useEffect(() => {
    const updateStats = () => {
      const tracker = getRpcTrackerByChainId(chainId);

      if (!tracker) {
        setAllRpcStats([]);
        return;
      }

      const fallbackTracker = tracker.fallbackTracker;

      // Update all RPC stats
      const allStats = fallbackTracker.getEndpointsStats();
      const statsWithDetails = allStats.map((stats) => {
        const rpcConfig = tracker.getRpcConfig(stats.endpoint);
        // Get latest responseTime (first in checkResults array, which is sorted from newest to oldest)
        const latestCheckResult = stats.checkResults[0];
        return {
          endpoint: stats.endpoint,
          providerName: getProviderNameFromUrl(stats.endpoint),
          purpose: rpcConfig?.purpose ?? "unknown",
          isPublic: rpcConfig?.isPublic ?? false,
          failureCount: stats.failureTimestamps?.length ?? 0,
          banTime: stats.banned?.timestamp,
          responseTime: latestCheckResult?.success ? latestCheckResult.stats?.responseTime : undefined,
          blockNumber: latestCheckResult?.success ? latestCheckResult.stats?.blockNumber : undefined,
          isPrimary: stats.endpoint === primaryRpc,
          isSecondary: fallbacks.includes(stats.endpoint),
        };
      });
      setAllRpcStats(statsWithDetails);
    };

    updateStats();

    // Update stats periodically to reflect changes
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [chainId, primaryRpc, fallbacks]);

  // Update freshness values periodically and track last 3 diffs when data is updated
  useEffect(() => {
    let previousMarketValuesLastUpdated: number | undefined = undefined;
    let previousBalancesLastUpdated: number | undefined = undefined;

    const updateFreshness = () => {
      const now = Date.now();
      const marketValuesLastUpdated = freshnessMetrics.getLastUpdated(chainId, FreshnessMetricId.MarketsValues);
      const balancesLastUpdated = freshnessMetrics.getLastUpdated(chainId, FreshnessMetricId.Balances);
      const marketValuesFreshness = marketValuesLastUpdated ? now - marketValuesLastUpdated : undefined;
      const balancesFreshness = balancesLastUpdated ? now - balancesLastUpdated : undefined;

      // Track when data is updated (lastUpdated timestamp changes)
      if (
        previousMarketValuesLastUpdated !== undefined &&
        marketValuesLastUpdated !== undefined &&
        marketValuesLastUpdated !== previousMarketValuesLastUpdated
      ) {
        // Data was updated, calculate the diff (time since previous update)
        const diff = marketValuesLastUpdated - previousMarketValuesLastUpdated;
        setFreshnessHistory((prev) => {
          const newHistory = [diff, ...prev.marketValues];
          return {
            ...prev,
            marketValues: newHistory.slice(0, 3), // Keep only last 3
          };
        });
      }

      if (
        previousBalancesLastUpdated !== undefined &&
        balancesLastUpdated !== undefined &&
        balancesLastUpdated !== previousBalancesLastUpdated
      ) {
        // Data was updated, calculate the diff (time since previous update)
        const diff = balancesLastUpdated - previousBalancesLastUpdated;
        setFreshnessHistory((prev) => {
          const newHistory = [diff, ...prev.balances];
          return {
            ...prev,
            balances: newHistory.slice(0, 3), // Keep only last 3
          };
        });
      }

      previousMarketValuesLastUpdated = marketValuesLastUpdated;
      previousBalancesLastUpdated = balancesLastUpdated;

      setFreshnessValues({
        marketValues: marketValuesFreshness,
        balances: balancesFreshness,
      });
    };

    updateFreshness();
    const interval = setInterval(updateFreshness, 1000);

    return () => clearInterval(interval);
  }, [chainId]);

  // Check for URL changes and auto-disable matching flags
  useEffect(() => {
    // Read current state from storage
    const currentState = _debugMulticall?.getDebugState() ?? {};
    let updated = false;

    if (prevPrimaryRpc !== primaryRpc) {
      if (currentState.triggerPrimaryAsFailedInWorker) {
        _debugMulticall?.setFlag("triggerPrimaryAsFailedInWorker", false);
        updated = true;
      }
      if (currentState.triggerPrimaryAsFailedInMainThread) {
        _debugMulticall?.setFlag("triggerPrimaryAsFailedInMainThread", false);
        updated = true;
      }
      if (currentState.triggerPrimaryTimeoutInWorker) {
        _debugMulticall?.setFlag("triggerPrimaryTimeoutInWorker", false);
        updated = true;
      }
    }

    if (updated) {
      // Read updated state after setting flags
      setDebugState(_debugMulticall?.getDebugState() ?? {});
    }
  }, [primaryRpc, prevPrimaryRpc]);

  // Update debug state when it changes
  const handleDebugFlagChange = useCallback(<K extends keyof MulticallDebugState>(flag: K, value: boolean) => {
    _debugMulticall?.setFlag(flag, value);
    setDebugState((prev) => ({ ...prev, [flag]: value }));
  }, []);

  useEffect(() => {
    const updateNetworkObserverState = () => {
      const observer = NetworkStatusObserver.getInstance();
      const states = observer.getAllTrackerStates();
      setNetworkObserverState(states);
    };

    updateNetworkObserverState();

    const observer = NetworkStatusObserver.getInstance();
    const allTrackerKeys = Object.keys(observer.getAllTrackerStates());
    const unsubscribes: (() => void)[] = [];

    allTrackerKeys.forEach((trackerKey) => {
      const unsubscribe = addFallbackTrackerListener("trackingFinished", trackerKey, () => {
        updateNetworkObserverState();
      });
      unsubscribes.push(unsubscribe);
    });

    // Update periodically and re-subscribe if new trackers are added
    const interval = setInterval(() => {
      const currentTrackerKeys = Object.keys(observer.getAllTrackerStates());
      const newTrackerKeys = currentTrackerKeys.filter((key) => !allTrackerKeys.includes(key));

      // Subscribe to new trackers
      newTrackerKeys.forEach((trackerKey) => {
        const unsubscribe = addFallbackTrackerListener("trackingFinished", trackerKey, () => {
          updateNetworkObserverState();
        });
        unsubscribes.push(unsubscribe);
        allTrackerKeys.push(trackerKey);
      });

      updateNetworkObserverState();
    }, 1000);

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      clearInterval(interval);
    };
  }, [chainId]);

  return (
    <AppPageLayout>
      <div className="default-container">
        <Card title="RPC Debug">
          <div className="App-card-content">
            <div className="flex gap-8" style={GRID_STYLE}>
              <div className="flex min-w-0 flex-[2] flex-col">
                <RpcTable allRpcStats={allRpcStats} />
                <div className="mt-16 h-1 bg-slate-800"></div>
                <DataFreshnessSection freshnessValues={freshnessValues} freshnessHistory={freshnessHistory} />
                <div className="mt-16 h-1 bg-slate-800"></div>
                <NetworkStatusSection networkObserverState={networkObserverState} />
              </div>
              <EventsPanel events={events} idleSeconds={idleSeconds} onClearEvents={() => setEvents([])} />
              <div className="min-w-0 flex-1">
                <DebugControlsPanel
                  chainId={chainId}
                  primaryRpc={primaryRpc}
                  secondaryRpc={secondaryRpc}
                  debugState={debugState}
                  onDebugFlagChange={handleDebugFlagChange}
                />
              </div>
            </div>
            <div className="mt-16 h-1 bg-slate-800"></div>
            <MarketsSection marketsInfoData={marketsInfoData} />
          </div>
        </Card>
      </div>
    </AppPageLayout>
  );
}

function DataFreshnessSection({
  freshnessValues,
  freshnessHistory,
}: {
  freshnessValues: { marketValues: number | undefined; balances: number | undefined };
  freshnessHistory: {
    marketValues: number[];
    balances: number[];
  };
}) {
  const formatFreshness = (ms: number | undefined) => {
    if (ms === undefined) {
      return "—";
    }
    if (ms < 1000) {
      return `${ms}ms`;
    }
    if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getFreshnessColor = (ms: number | undefined) => {
    if (ms === undefined) return "text-gray-500";
    if (ms < 5000) return "text-green-400";
    if (ms < 30000) return "text-yellow-400";
    return "text-red-400";
  };

  const renderFreshnessRow = (label: string, current: number | undefined, history: number[]) => {
    // Get last 3 history values (newest first, then pad if needed)
    // History is already stored with newest first, so use as-is to show latest on left
    const previousValues: (number | undefined)[] = [...history].slice(0, 3);
    while (previousValues.length < 3) {
      previousValues.push(undefined);
    }

    return (
      <TableTr>
        <TableTd padding="compact">
          <div className="text-sm font-semibold text-white">{label}</div>
        </TableTd>
        <TableTd padding="compact">
          <span className={`text-xs font-semibold ${getFreshnessColor(current)}`}>{formatFreshness(current)}</span>
        </TableTd>
        <TableTd padding="compact">
          <div className="flex items-center justify-end gap-16">
            {previousValues.map((value, index) =>
              value !== undefined ? (
                <span key={index} className={`text-xs font-semibold ${getFreshnessColor(value)}`}>
                  {formatFreshness(value)}
                </span>
              ) : null
            )}
          </div>
        </TableTd>
      </TableTr>
    );
  };

  return (
    <div className="mt-8 flex min-h-0 flex-shrink-0 flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center justify-between px-8 py-16">
        <h3 className="text-xl muted font-bold uppercase">Data Freshness</h3>
      </div>
      <div className="flex-shrink-0">
        <div className="overflow-x-auto">
          <Table>
            <thead className="sticky top-0 z-10 bg-slate-900">
              <TableTheadTr>
                <TableTh padding="compact">Data Type</TableTh>
                <TableTh padding="compact">Current</TableTh>
                <TableTh padding="compact">Previous</TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {renderFreshnessRow("Market Values", freshnessValues.marketValues, freshnessHistory.marketValues)}
              {renderFreshnessRow("Balances", freshnessValues.balances, freshnessHistory.balances)}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
