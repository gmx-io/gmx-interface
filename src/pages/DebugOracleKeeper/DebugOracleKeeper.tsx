import { useCallback, useEffect, useState } from "react";

import { useTokenRecentPricesRequest } from "domain/synthetics/tokens/useTokenRecentPricesData";
import { useChainId } from "lib/chains";
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

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Card from "components/Card/Card";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";

import { DebugControlsPanel, EventsPanel, OracleEndpointsTable, type OracleEndpointStats } from "./parts";

const GRID_STYLE = { minHeight: "600px", maxHeight: "calc(100vh - 250px)" };

export default function DebugOracleKeeper() {
  const { chainId } = useChainId();
  const fetcher = useOracleKeeperFetcher(chainId) as any;
  const endpoints = fetcher.oracleTracker.fallbackTracker.getCurrentEndpoints();
  const prevPrimaryEndpoint = usePrevious(endpoints.primary);
  const prevSecondaryEndpoint = usePrevious(endpoints.secondary);
  useTokenRecentPricesRequest(chainId);

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

  useEffect(() => {
    if (!_debugOracleKeeper) return;

    const unsubscribe = _debugOracleKeeper.onEvent((event) => {
      setEvents((prev) => [...prev, event]);
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
      const secondary = fallbackTracker.state.secondary;

      const allStats = fallbackTracker.getEndpointsStats();
      const statsWithDetails = endpoints.map((endpoint) => {
        const endpointStats = allStats.find((s) => s.endpoint === endpoint);
        return {
          endpoint,
          success: endpointStats?.checkResult?.success ?? false,
          responseTime: endpointStats?.checkResult?.stats?.responseTime,
          bannedTimestamp: endpointStats?.banned?.timestamp,
          failureCount: endpointStats?.failureTimestamps?.length ?? 0,
          isPrimary: endpoint === primary,
          isSecondary: endpoint === secondary,
        };
      });

      setAllEndpointStats(statsWithDetails);
    };

    updateStats();

    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [fetcher, endpoints.primary, endpoints.secondary]);

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

    if (prevSecondaryEndpoint !== endpoints.secondary) {
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
  }, [endpoints.primary, endpoints.secondary, prevPrimaryEndpoint, prevSecondaryEndpoint]);

  const handleDebugFlagChange = useCallback(<K extends keyof OracleKeeperDebugState>(flag: K, value: boolean) => {
    _debugOracleKeeper?.setFlag(flag, value);
    setDebugState((prev) => ({ ...prev, [flag]: value }));
  }, []);

  return (
    <AppPageLayout>
      <div className="default-container">
        <Card title="Oracle Keeper Debug">
          <div className="App-card-content">
            <div className="flex gap-8" style={GRID_STYLE}>
              <div className="flex min-w-0 flex-col">
                <OracleEndpointsTable allEndpointStats={allEndpointStats} />
                <DataFreshnessSection freshnessValues={freshnessValues} freshnessHistory={freshnessHistory} />
              </div>
              <EventsPanel events={events} onClearEvents={() => setEvents([])} />
              <div className="min-w-0 flex-1">
                <DebugControlsPanel
                  chainId={chainId}
                  primaryEndpoint={endpoints.primary}
                  secondaryEndpoint={endpoints.secondary}
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
    <div className="mt-8 flex min-h-0 flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center justify-between px-8 py-16">
        <h3 className="text-xl muted font-bold uppercase">Data Freshness</h3>
      </div>
      <div className="min-h-0 overflow-y-auto">
        <div className="overflow-x-auto">
          <Table>
            <thead className="sticky top-0 z-10 bg-slate-900">
              <TableTheadTr>
                <TableTh padding="compact">Data Type</TableTh>
                <TableTh padding="compact">Current</TableTh>
                <TableTh padding="compact">Previous</TableTh>
              </TableTheadTr>
            </thead>
            <tbody>{renderFreshnessRow("Tickers", freshnessValues.tickers, freshnessHistory.tickers)}</tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
