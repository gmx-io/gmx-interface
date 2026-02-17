import { getChainName } from "config/chains";
import { getProviderNameFromUrl } from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { emitReportEndpointFailure } from "lib/FallbackTracker/events";
import type { MulticallDebugEvent, MulticallDebugState } from "lib/multicall/_debug";
import { formatUsd } from "lib/numbers";
import { getRpcTrackerByChainId } from "lib/rpc/useRpcUrls";
import { getMarkPrice } from "sdk/utils/prices";

import Button from "components/Button/Button";
import { Table, TableTd, TableTh, TableTheadTr, TableTr } from "components/Table/Table";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import { t, Trans } from "@lingui/macro";

export type RpcStats = {
  endpoint: string;
  providerName: string;
  purpose: string;
  isPublic: boolean;
  failureCount: number;
  banTime: number | undefined;
  responseTime: number | undefined;
  blockNumber: number | undefined;
  isPrimary: boolean;
  isSecondary: boolean;
};

export type GroupedEvent = {
  timestamp: number;
  events: MulticallDebugEvent[];
};

const getPurposeColor = (purpose: string) => {
  switch (purpose) {
    case "default":
      return "text-cyan-400";
    case "largeAccount":
      return "text-purple-400";
    case "fallback":
      return "text-yellow-400";
    case "express":
      return "text-pink-400";
    default:
      return "text-gray-400";
  }
};

const formatEventType = (type: string) => {
  return type.replace(/-/g, " ");
};

const getEventColor = (type: string) => {
  if (type.includes("success")) return "text-green-500";
  if (type.includes("failed")) return "text-red-500";
  if (type.includes("timeout")) return "text-orange-500";
  if (type.includes("start")) return "text-blue-500";
  if (type.includes("fallback")) return "text-purple-500";
  return "text-gray-500";
};

const getThreadName = (isInWorker: boolean) => {
  return isInWorker ? t`Worker` : t`Main thread`;
};

export function RpcTable({ allRpcStats }: { allRpcStats: RpcStats[] }) {
  return (
    <div className="flex max-h-[450px] min-h-0 flex-shrink-0 flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center justify-between px-8 py-16">
        <h3 className="text-xl muted font-bold uppercase">
          <Trans>RPC endpoints</Trans>
        </h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
          <Table>
            <thead className="sticky top-0 z-10 bg-slate-900">
              <TableTheadTr>
                <TableTh padding="compact">
                  <Trans>PROVIDER</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>STATUS</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>FAILURES</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>BANNED</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>PURPOSE</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>TYPE</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>RESPONSE</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>BLOCK</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {allRpcStats.map((rpc, index) => (
                <TableTr key={`${rpc.endpoint}-${rpc.purpose}-${index}`}>
                  <TableTd padding="compact">
                    <div className="text-sm font-semibold text-white">{rpc.providerName}</div>
                  </TableTd>
                  <TableTd padding="compact">
                    <div className="text-xs flex flex-wrap gap-1">
                      {rpc.isPrimary && (
                        <span className="text-green-400">
                          <Trans>Primary</Trans>
                        </span>
                      )}
                      {rpc.isSecondary && (
                        <span className="text-yellow-300">
                          <Trans>Secondary</Trans>
                        </span>
                      )}
                    </div>
                  </TableTd>
                  <TableTd padding="compact">
                    <span className="text-orange-500 text-sm font-semibold">{rpc.failureCount}</span>
                  </TableTd>
                  <TableTd padding="compact">
                    {rpc.banTime ? (
                      <span className="text-xs font-semibold text-red-500">
                        {new Date(rpc.banTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableTd>
                  <TableTd padding="compact">
                    <span className={`text-xs ${getPurposeColor(rpc.purpose)}`}>{rpc.purpose}</span>
                  </TableTd>
                  <TableTd padding="compact">
                    {rpc.isPublic ? (
                      <span className="text-xs text-green-400">
                        <Trans>Public</Trans>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        <Trans>Private</Trans>
                      </span>
                    )}
                  </TableTd>
                  <TableTd padding="compact">
                    {rpc.responseTime !== undefined ? (
                      <span className="text-xs text-white">{t`${rpc.responseTime}ms`}</span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableTd>
                  <TableTd padding="compact">
                    {rpc.blockNumber !== undefined ? (
                      <span className="text-xs text-white">{rpc.blockNumber}</span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </TableTd>
                </TableTr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function EventsPanel({
  events,
  idleSeconds,
  onClearEvents,
}: {
  events: GroupedEvent[];
  idleSeconds: number;
  onClearEvents: () => void;
}) {
  return (
    <div className="flex min-h-0 min-w-[320px] flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center justify-between px-8 py-16">
        <h3 className="text-xl muted font-bold uppercase">
          <Trans>Multicall events</Trans>
        </h3>
        <Button variant="secondary" onClick={onClearEvents}>
          <Trans>Clear events</Trans>
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <Table>
            <tbody>
              <TableTr>
                <TableTd padding="compact" colSpan={2}>
                  <div className="text-sm font-semibold">
                    <Trans>Multicall idle</Trans>
                  </div>
                  <div className="text-xs text-gray-500">{t`${idleSeconds}s`}</div>
                </TableTd>
              </TableTr>
            </tbody>
          </Table>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead className="sticky top-0 z-10 bg-slate-900">
                <TableTheadTr>
                  <TableTh padding="compact" className="text-left">
                    <Trans>THREAD</Trans>
                  </TableTh>
                  <TableTh padding="compact" className="text-left">
                    <Trans>EVENT</Trans>
                  </TableTh>
                </TableTheadTr>
              </thead>
              <tbody>
                {events.flatMap((group, groupIndex) => {
                  const threadName = getThreadName(group.events[0]?.isInWorker ?? false);
                  return group.events.map((event, eventIndex) => {
                    const chainName = event.chainId ? getChainName(event.chainId) : null;
                    const providerName = event.providerUrl ? getProviderNameFromUrl(event.providerUrl) : null;
                    const chainAndProvider =
                      chainName && providerName ? `${chainName} - ${providerName}` : chainName || providerName || null;
                    return (
                      <TableTr key={`${groupIndex}-${eventIndex}`}>
                        <TableTd padding="compact">
                          {eventIndex === 0 && (
                            <div className="text-xs font-semibold">
                              {threadName} ({group.events.length})
                            </div>
                          )}
                        </TableTd>
                        <TableTd padding="compact">
                          <div className="flex flex-col items-start gap-2">
                            <div className={`text-xs font-semibold ${getEventColor(event.type)}`}>
                              {formatEventType(event.type)}
                            </div>
                            {chainAndProvider && <div className="text-xs text-gray-500">{chainAndProvider}</div>}
                          </div>
                        </TableTd>
                      </TableTr>
                    );
                  });
                })}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

export function DebugControlsPanel({
  chainId,
  primaryRpc,
  secondaryRpc: _secondaryRpc,
  debugState,
  onDebugFlagChange,
}: {
  chainId: number;
  primaryRpc: string | undefined;
  secondaryRpc: string | undefined;
  debugState: MulticallDebugState;
  onDebugFlagChange: <K extends keyof MulticallDebugState>(flag: K, value: boolean) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center px-8 py-16">
        <h3 className="text-xl muted font-bold uppercase">
          <Trans>Debug controls</Trans>
        </h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
          <Table>
            <tbody>
              <TableTr>
                <TableTd padding="compact" colSpan={2}>
                  <div className="py-6">
                    <div className="text-base mb-6 font-semibold text-gray-400">
                      <Trans>Account type</Trans>
                    </div>
                    <div className="text-base text-white">
                      {getIsLargeAccount() ? t`Large account` : t`Regular account`}
                    </div>
                  </div>
                </TableTd>
              </TableTr>
              <TableTr>
                <TableTd padding="compact" colSpan={2}>
                  <div className="py-6">
                    <div className="text-base mb-6 font-semibold text-gray-400">
                      <Trans>Force failures</Trans>
                    </div>
                    <div className="space-y-4">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          if (!primaryRpc) {
                            return;
                          }
                          emitReportEndpointFailure({
                            endpoint: primaryRpc,
                            trackerKey: getRpcTrackerByChainId(chainId)?.trackerKey ?? "unknown",
                          });
                        }}
                      >
                        <Trans>Force primary failure</Trans>
                      </Button>
                    </div>
                  </div>
                </TableTd>
              </TableTr>
              <TableTr>
                <TableTd padding="compact" colSpan={2}>
                  <div className="py-6">
                    <div className="text-base mb-6 font-semibold text-gray-400">
                      <Trans>Multicall simulation</Trans>
                    </div>
                    <div className="space-y-8">
                      <div>
                        <h4 className="text-sm mb-6 font-semibold text-gray-400">
                          <Trans>Worker thread</Trans>
                        </h4>
                        <div className="space-y-6">
                          <ToggleSwitch
                            isChecked={debugState.triggerPrimaryAsFailedInWorker ?? false}
                            setIsChecked={(checked) => onDebugFlagChange("triggerPrimaryAsFailedInWorker", checked)}
                            textClassName="text-base text-white"
                          >
                            <Trans>Primary failed</Trans>
                          </ToggleSwitch>
                          <ToggleSwitch
                            isChecked={debugState.triggerPrimaryTimeoutInWorker ?? false}
                            setIsChecked={(checked) => onDebugFlagChange("triggerPrimaryTimeoutInWorker", checked)}
                            textClassName="text-base text-white"
                          >
                            <Trans>Primary timeout</Trans>
                          </ToggleSwitch>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm mb-6 font-semibold text-gray-400">
                          <Trans>Main thread</Trans>
                        </h4>
                        <div className="space-y-6">
                          <ToggleSwitch
                            isChecked={debugState.triggerPrimaryAsFailedInMainThread ?? false}
                            setIsChecked={(checked) => onDebugFlagChange("triggerPrimaryAsFailedInMainThread", checked)}
                            textClassName="text-base text-white"
                          >
                            <Trans>Primary failed</Trans>
                          </ToggleSwitch>
                        </div>
                      </div>
                    </div>
                  </div>
                </TableTd>
              </TableTr>
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function NetworkStatusSection({
  networkObserverState,
}: {
  networkObserverState: Record<string, { trackingFailed: boolean; isActive: boolean }>;
}) {
  const trackerEntries = Object.entries(networkObserverState);
  const activeTrackers = trackerEntries.filter(([, state]) => state.isActive);
  const isGlobalNetworkDown = activeTrackers.length > 0 && activeTrackers.every(([, state]) => state.trackingFailed);
  const failedTrackersCount = trackerEntries.filter(([, state]) => state.trackingFailed && state.isActive).length;
  const totalActiveTrackersCount = activeTrackers.length;
  const totalTrackersCount = trackerEntries.length;

  const getStatusColor = (trackingFailed: boolean, isActive: boolean) => {
    if (!isActive) {
      return "text-gray-400";
    }
    return trackingFailed ? "text-red-400" : "text-green-400";
  };

  const getStatusText = (trackingFailed: boolean, isActive: boolean) => {
    if (!isActive) {
      return t`Inactive`;
    }
    return trackingFailed ? t`Failed` : t`OK`;
  };

  return (
    <div className="mt-8 flex min-h-0 flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center justify-between px-8 py-16">
        <h3 className="text-xl muted font-bold uppercase">
          <Trans>Network status</Trans>
        </h3>
      </div>
      <div className="max-h-[400px] min-h-0 flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
          <Table>
            <thead className="sticky top-0 z-10 bg-slate-900">
              <TableTheadTr>
                <TableTh padding="compact">
                  <Trans>TRACKER</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>STATUS</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              <TableTr>
                <TableTd padding="compact">
                  <div className="text-sm font-semibold text-white">
                    <Trans>Global network</Trans>
                  </div>
                </TableTd>
                <TableTd padding="compact">
                  <span className={`text-xs font-semibold ${isGlobalNetworkDown ? "text-red-400" : "text-green-400"}`}>
                    {isGlobalNetworkDown ? t`Down` : t`Up`}
                  </span>
                </TableTd>
              </TableTr>
              <TableTr>
                <TableTd padding="compact">
                  <div className="text-sm font-semibold text-white">
                    <Trans>Summary</Trans>
                  </div>
                </TableTd>
                <TableTd padding="compact">
                  <span className="text-xs text-white">
                    <Trans>
                      {failedTrackersCount} / {totalActiveTrackersCount} active trackers failed ({totalTrackersCount}{" "}
                      total)
                    </Trans>
                  </span>
                </TableTd>
              </TableTr>
              {trackerEntries.length === 0 ? (
                <TableTr>
                  <TableTd padding="compact" colSpan={2}>
                    <span className="text-xs text-gray-500">
                      <Trans>No trackers registered</Trans>
                    </span>
                  </TableTd>
                </TableTr>
              ) : (
                trackerEntries.map(([trackerKey, state]) => (
                  <TableTr key={trackerKey}>
                    <TableTd padding="compact">
                      <div className="text-xs text-white">{trackerKey}</div>
                    </TableTd>
                    <TableTd padding="compact">
                      <span className={`text-xs font-semibold ${getStatusColor(state.trackingFailed, state.isActive)}`}>
                        {getStatusText(state.trackingFailed, state.isActive)}
                      </span>
                    </TableTd>
                  </TableTr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function MarketsSection({ marketsInfoData }: { marketsInfoData: any }) {
  return (
    <div className="mt-6">
      <h3 className="text-xl mb-4 font-bold">
        <Trans>Markets info</Trans>
      </h3>
      <div className="max-h-[400px] overflow-y-auto">
        <div className="overflow-x-auto">
          <Table>
            <thead className="sticky top-0 z-10 bg-slate-900">
              <TableTheadTr>
                <TableTh padding="compact">
                  <Trans>MARKET</Trans>
                </TableTh>
                <TableTh padding="compact">
                  <Trans>PRICE</Trans>
                </TableTh>
              </TableTheadTr>
            </thead>
            <tbody>
              {!marketsInfoData ? (
                <TableTr>
                  <TableTd padding="compact" colSpan={2}>
                    <Trans>Loading markets data...</Trans>
                  </TableTd>
                </TableTr>
              ) : (
                Object.values(marketsInfoData || {}).map((marketInfo: any) => (
                  <TableTr key={marketInfo.name}>
                    <TableTd padding="compact">
                      <div className="font-semibold">{marketInfo.name}</div>
                    </TableTd>
                    <TableTd padding="compact">
                      <div className="text-sm">
                        {formatUsd(
                          getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: true, isLong: true })
                        )}
                      </div>
                    </TableTd>
                  </TableTr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
}
