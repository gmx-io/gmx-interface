import { t, Trans } from "@lingui/macro";
import { useCallback, useEffect, useState } from "react";

import { useTokenRecentPricesRequest } from "domain/synthetics/tokens/useTokenRecentPricesData";
import { useChainId } from "lib/chains";
import { addFallbackTrackerListener } from "lib/FallbackTracker/events";
import { NetworkStatusObserver } from "lib/FallbackTracker/NetworkStatusObserver";
import { freshnessMetrics } from "lib/metrics/reportFreshnessMetric";
import { FreshnessMetricId } from "lib/metrics/types";
import {
  _debugOracleKeeper,
  OracleKeeperDebugFlags,
  type OracleKeeperDebugEvent,
  type OracleKeeperDebugState,
} from "lib/oracleKeeperFetcher/_debug";
import { useOracleKeeperFetcher } from "lib/oracleKeeperFetcher/useOracleKeeperFetcher";
import { usePrevious } from "lib/usePrevious";
import { NetworkStatusSection } from "pages/RpcDebug/parts";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Card from "components/Card/Card";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

import { DebugControlsPanel, EventsPanel, OracleEndpointsTable, type OracleEndpointStats } from "./parts";

const GRID_STYLE = { minHeight: "600px", maxHeight: "calc(100vh - 250px)" };

export default function DebugOracleKeeper() {
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId) as any;
  const [endpoints, setEndpoints] = useState(() => fetcher.oracleTracker.fallbackTracker.getCurrentEndpoints());
  const prevPrimaryEndpoint = usePrevious(endpoints.primary);
  const secondaryEndpoint = endpoints.fallbacks[0];
  useTokenRecentPricesRequest(chainId);

  useEffect(() => {
    const updateEndpoints = () => {
      setEndpoints(fetcher.oracleTracker.fallbackTracker.getCurrentEndpoints());
    };

    updateEndpoints();
    const interval = setInterval(updateEndpoints, 5000);

    return () => clearInterval(interval);
  }, [fetcher]);

  const [debugState, setDebugState] = useState<Partial<OracleKeeperDebugState>>(
    _debugOracleKeeper?.getDebugState() ?? {}
  );
  const [events, setEvents] = useState<OracleKeeperDebugEvent[]>([]);
  const [allEndpointStats, setAllEndpointStats] = useState<OracleEndpointStats[]>([]);
  const [freshnessValues, setFreshnessValues] = useState<{
    tickers: number | undefined;
  }>({ tickers: undefined });
  const [freshnessHistory, setFreshnessHistory] = useState<{
    tickers: number[];
  }>({ tickers: [] });
  const [networkObserverState, setNetworkObserverState] = useState<
    Record<string, { trackingFailed: boolean; isActive: boolean }>
  >({});

  useEffect(() => {
    if (!_debugOracleKeeper) return;

    const unsubscribe = _debugOracleKeeper.onEvent((event) => {
      setEvents((prev) => {
        const MAX_EVENTS = 1000;
        const CLEAR_COUNT = 100;
        const newEvents = [...prev, event];

        if (newEvents.length > MAX_EVENTS) {
          return newEvents.slice(CLEAR_COUNT);
        }

        return newEvents;
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!_debugOracleKeeper) return;

    _debugOracleKeeper.subscribeForOracleKeeperDebugging(fetcher);
  }, [fetcher]);

  useEffect(() => {
    const updateStats = () => {
      const fallbackTracker = fetcher.oracleTracker.fallbackTracker;
      const endpoints = fallbackTracker.params.endpoints;
      const primary = fallbackTracker.state.primary;
      const fallbacks = fallbackTracker.state.fallbacks;

      const allStats = fallbackTracker.getEndpointsStats();
      const statsWithDetails = endpoints.map((endpoint) => {
        const endpointStats = allStats.find((s) => s.endpoint === endpoint);
        // Get latest checkResult (first in checkResults array, which is sorted from newest to oldest)
        const latestCheckResult = endpointStats?.checkResults?.[0];
        return {
          endpoint,
          success: latestCheckResult?.success ?? false,
          responseTime: latestCheckResult?.success ? latestCheckResult.stats?.responseTime : undefined,
          bannedTimestamp: endpointStats?.banned?.timestamp,
          failureCount: endpointStats?.failureTimestamps?.length ?? 0,
          isPrimary: endpoint === primary,
          isSecondary: fallbacks.includes(endpoint),
        };
      });

      setAllEndpointStats(statsWithDetails);
    };

    updateStats();

    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [fetcher, endpoints.primary, endpoints.fallbacks]);

  useEffect(() => {
    let previousTickersLastUpdated: number | undefined = undefined;

    const updateFreshness = () => {
      const now = Date.now();
      const tickersLastUpdated = freshnessMetrics.getLastUpdated(chainId, FreshnessMetricId.Tickers);
      const tickersFreshness = tickersLastUpdated ? now - tickersLastUpdated : undefined;

      if (
        previousTickersLastUpdated !== undefined &&
        tickersLastUpdated !== undefined &&
        tickersLastUpdated !== previousTickersLastUpdated
      ) {
        const diff = tickersLastUpdated - previousTickersLastUpdated;
        setFreshnessHistory((prev) => {
          const newHistory = [diff, ...prev.tickers];
          return {
            ...prev,
            tickers: newHistory.slice(0, 3),
          };
        });
      }

      previousTickersLastUpdated = tickersLastUpdated;

      setFreshnessValues({
        tickers: tickersFreshness,
      });
    };

    updateFreshness();
    const interval = setInterval(updateFreshness, 1000);

    return () => clearInterval(interval);
  }, [chainId]);

  useEffect(() => {
    if (!_debugOracleKeeper) return;

    const currentState = _debugOracleKeeper.getDebugState();
    let updated = false;

    if (prevPrimaryEndpoint !== endpoints.primary) {
      if (currentState.triggerTickersFailure) {
        _debugOracleKeeper.setFlag(OracleKeeperDebugFlags.TriggerTickersFailure, false);
        updated = true;
      }
      if (currentState.triggerPartialTickers) {
        _debugOracleKeeper.setFlag(OracleKeeperDebugFlags.TriggerPartialTickers, false);
        updated = true;
      }
    }

    if (updated) {
      setDebugState(_debugOracleKeeper.getDebugState());
    }
  }, [endpoints.primary, prevPrimaryEndpoint]);

  const handleDebugFlagChange = useCallback(<K extends keyof OracleKeeperDebugState>(flag: K, value: boolean) => {
    _debugOracleKeeper?.setFlag(flag, value);
    setDebugState((prev) => ({ ...prev, [flag]: value }));
  }, []);

  // Update NetworkStatusObserver state
  useEffect(() => {
    const updateNetworkObserverState = () => {
      const observer = NetworkStatusObserver.getInstance();
      const states = observer.getAllTrackerStates();
      setNetworkObserverState(states);
    };

    updateNetworkObserverState();

    // Subscribe to all tracker events to update state
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
    <AppPageLayout title="Oracle Keeper Debug">
      <div className="default-container">
        <Card title={t`Oracle Keeper debug`}>
          <div className="App-card-content">
            <div className="flex gap-8" style={GRID_STYLE}>
              <div className="flex min-w-0 flex-[2] flex-col">
                <OracleEndpointsTable allEndpointStats={allEndpointStats} />
                <div className="mt-16 h-1 bg-slate-800"></div>
                <DataFreshnessSection freshnessValues={freshnessValues} freshnessHistory={freshnessHistory} />
                <div className="mt-16 h-1 bg-slate-800"></div>
                <NetworkStatusSection networkObserverState={networkObserverState} />
              </div>
              <EventsPanel events={events} onClearEvents={() => setEvents([])} />
              <div className="min-w-0">
                <DebugControlsPanel
                  chainId={chainId}
                  primaryEndpoint={endpoints.primary}
                  secondaryEndpoint={secondaryEndpoint}
                  debugState={debugState}
                  onDebugFlagChange={handleDebugFlagChange}
                />
              </div>
            </div>
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
  freshnessValues: { tickers: number | undefined };
  freshnessHistory: {
    tickers: number[];
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
        <h3 className="text-xl muted font-bold uppercase">
          <Trans>Data freshness</Trans>
        </h3>
      </div>
      <div className="flex-shrink-0">
        <div className="overflow-x-auto">
          <Table>
            <thead className="sticky top-0 z-10 bg-slate-900">
              <TableTheadTr>
                <TableTh padding="compact">
                  <Trans>DATA TYPE</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>CURRENT</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>PREVIOUS</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>{renderFreshnessRow("Tickers", freshnessValues.tickers, freshnessHistory.tickers)}</tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
