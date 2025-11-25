import { useEffect, useState, useCallback } from "react";

import { getProviderNameFromUrl } from "config/rpc";
import { useMarketsInfoRequest } from "domain/synthetics/markets/useMarketsInfoRequest";
import { useTokensDataRequest } from "domain/synthetics/tokens/useTokensDataRequest";
import { useChainId } from "lib/chains";
import { multicallDevtools, type MulticallDebugState } from "lib/multicall/_debug";
import { getCurrentRpcUrls, getRpcTracker } from "lib/rpc/bestRpcTracker";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import Card from "components/Card/Card";

import { DebugControlsPanel, EventsPanel, MarketsSection, RpcTable, type GroupedEvent, type RpcStats } from "./parts";

const GRID_STYLE = { minHeight: "600px", maxHeight: "calc(100vh - 250px)" };

export default function RpcDebug() {
  const { chainId } = useChainId();
  const { primary: primaryRpc, secondary: secondaryRpc } = getCurrentRpcUrls(chainId);
  const { tokensData } = useTokensDataRequest(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId, { tokensData });

  const [debugState, setDebugState] = useState<MulticallDebugState>(multicallDevtools.getDebugState());
  const [events, setEvents] = useState<GroupedEvent[]>([]);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [allRpcStats, setAllRpcStats] = useState<RpcStats[]>([]);

  // Subscribe to debug events
  useEffect(() => {
    const unsubscribe = multicallDevtools.onDebugEvent((event) => {
      setIdleSeconds(0);
      setEvents((prev) => {
        const now = Date.now();
        const GROUPING_WINDOW = 100; // Group events within 100ms

        // Find if there's a recent group
        const lastGroup = prev[prev.length - 1];
        if (lastGroup && now - lastGroup.timestamp < GROUPING_WINDOW) {
          // Add to existing group
          return [
            ...prev.slice(0, -1),
            {
              ...lastGroup,
              events: [...lastGroup.events, event],
            },
          ];
        }

        // Create new group
        return [...prev, { timestamp: now, events: [event] }];
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
      const tracker = getRpcTracker(chainId);
      if (!tracker) {
        setAllRpcStats([]);
        return;
      }

      const fallbackTracker = tracker.fallbackTracker;

      // Update all RPC stats
      const allStats = fallbackTracker.getEndpointsStats();
      const statsWithDetails = allStats.map((stats) => {
        const rpcConfig = tracker.getRpcConfig(stats.endpoint);
        return {
          endpoint: stats.endpoint,
          providerName: getProviderNameFromUrl(stats.endpoint),
          purpose: rpcConfig?.purpose ?? "unknown",
          isPublic: rpcConfig?.isPublic ?? false,
          failureCount: stats.failureTimestamps?.length ?? 0,
          banTime: stats.banned?.timestamp,
          responseTime: stats.checkResult?.stats?.responseTime,
          blockNumber: stats.checkResult?.stats?.blockNumber,
          isPrimary: stats.endpoint === primaryRpc,
          isSecondary: stats.endpoint === secondaryRpc,
        };
      });
      setAllRpcStats(statsWithDetails);
    };

    updateStats();

    // Update stats periodically to reflect changes
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [chainId, primaryRpc, secondaryRpc]);

  // Update debug state when it changes
  const handleDebugFlagChange = useCallback(<K extends keyof MulticallDebugState>(flag: K, value: boolean) => {
    multicallDevtools.setDebugFlag(flag, value);
    setDebugState((prev) => ({ ...prev, [flag]: value }));
  }, []);

  return (
    <AppPageLayout>
      <div className="default-container page-layout">
        <Card title="RPC Debug">
          <div className="App-card-content">
            <div className="grid grid-cols-[2fr_1fr_320px] gap-6" style={GRID_STYLE}>
              <RpcTable allRpcStats={allRpcStats} />
              <EventsPanel events={events} idleSeconds={idleSeconds} onClearEvents={() => setEvents([])} />
              <DebugControlsPanel
                chainId={chainId}
                primaryRpc={primaryRpc}
                secondaryRpc={secondaryRpc}
                debugState={debugState}
                onDebugFlagChange={handleDebugFlagChange}
              />
            </div>
            <MarketsSection marketsInfoData={marketsInfoData} />
          </div>
        </Card>
      </div>
    </AppPageLayout>
  );
}
