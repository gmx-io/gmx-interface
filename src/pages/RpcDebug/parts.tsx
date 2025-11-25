import { getChainName } from "config/chains";
import { getProviderNameFromUrl } from "config/rpc";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { emitFallbackTrackerEndpointFailure } from "lib/FallbackTracker/events";
import type { MulticallDebugState, MulticallDebugEvent } from "lib/multicall/_debug";
import { formatUsd } from "lib/numbers";
import { getRpcTracker } from "lib/rpc/bestRpcTracker";
import { getMarkPrice } from "sdk/utils/prices";

import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";

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
  return isInWorker ? "Worker" : "Main Thread";
};

export function RpcTable({ allRpcStats }: { allRpcStats: RpcStats[] }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center">
        <h3 className="text-xl font-bold">RPC Endpoints</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="rounded overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-xs p-2 text-left font-semibold text-gray-400">Provider</th>
                <th className="text-xs p-2 text-left font-semibold text-gray-400">Status</th>
                <th className="text-xs p-2 text-left font-semibold text-gray-400">Failures</th>
                <th className="text-xs p-2 text-left font-semibold text-gray-400">Banned</th>
                <th className="text-xs p-2 text-left font-semibold text-gray-400">Purpose</th>
                <th className="text-xs p-2 text-left font-semibold text-gray-400">Type</th>
                <th className="text-xs p-2 text-left font-semibold text-gray-400">Response</th>
                <th className="text-xs p-2 text-left font-semibold text-gray-400">Block</th>
              </tr>
            </thead>
            <tbody>
              {allRpcStats.map((rpc) => (
                <tr key={rpc.endpoint} className="border-b border-gray-200">
                  <td className="p-2">
                    <div className="text-sm font-semibold text-white">{rpc.providerName}</div>
                  </td>
                  <td className="p-2">
                    <div className="text-xs flex flex-wrap gap-1">
                      {rpc.isPrimary && <span className="text-cyan-400">Primary</span>}
                      {rpc.isSecondary && <span className="text-purple-400">Secondary</span>}
                    </div>
                  </td>
                  <td className="p-2">
                    <span className="text-orange-500 text-sm font-semibold">{rpc.failureCount}</span>
                  </td>
                  <td className="p-2">
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
                  </td>
                  <td className="p-2">
                    <span className={`text-xs ${getPurposeColor(rpc.purpose)}`}>{rpc.purpose}</span>
                  </td>
                  <td className="p-2">
                    {rpc.isPublic ? (
                      <span className="text-xs text-green-400">public</span>
                    ) : (
                      <span className="text-xs text-gray-400">private</span>
                    )}
                  </td>
                  <td className="p-2">
                    {rpc.responseTime !== undefined ? (
                      <span className="text-xs text-white">{rpc.responseTime}ms</span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                  <td className="p-2">
                    {rpc.blockNumber !== undefined ? (
                      <span className="text-xs text-white">{rpc.blockNumber}</span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="flex flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center justify-between">
        <h3 className="text-xl font-bold">Multicall Events</h3>
        <Button variant="secondary" onClick={onClearEvents}>
          Clear Events
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto">
        {events.length === 0 ? (
          <div className="rounded border border-gray-300 p-2">
            <div className="text-sm font-semibold text-gray-700">Multicall Idle</div>
            <div className="text-xs text-gray-500">{idleSeconds}s</div>
          </div>
        ) : (
          events.map((group, groupIndex) => {
            const threadName = getThreadName(group.events[0]?.isInWorker ?? false);
            return (
              <div key={groupIndex} className="rounded border border-gray-300 p-2">
                <div className="text-xs mb-1 font-semibold">
                  {threadName} ({group.events.length})
                </div>
                <div className="space-y-1">
                  {group.events.map((event, eventIndex) => {
                    const chainName = event.chainId ? getChainName(event.chainId) : null;
                    const providerName = event.providerUrl ? getProviderNameFromUrl(event.providerUrl) : null;
                    const chainAndProvider =
                      chainName && providerName ? `${chainName} - ${providerName}` : chainName || providerName || null;
                    return (
                      <div key={eventIndex} className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${getEventColor(event.type)}`}>
                          {formatEventType(event.type)}
                        </span>
                        {chainAndProvider && <span className="text-xs text-gray-500">{chainAndProvider}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function DebugControlsPanel({
  chainId,
  primaryRpc,
  secondaryRpc,
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
    <div className="flex flex-col overflow-hidden">
      <div className="mb-6 flex h-8 flex-shrink-0 items-center">
        <h3 className="text-xl font-bold">Debug Controls</h3>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto pr-4">
        <div className="rounded border border-gray-200 p-3">
          <div className="text-sm mb-1 font-semibold text-gray-600">Account Type</div>
          <div className="text-sm text-white">{getIsLargeAccount() ? "Large Account" : "Regular Account"}</div>
        </div>

        <div className="rounded border border-gray-200 p-3">
          <h3 className="text-sm mb-3 font-semibold">Force Failures</h3>
          <div className="space-y-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (!primaryRpc) {
                  return;
                }
                emitFallbackTrackerEndpointFailure({
                  endpoint: primaryRpc,
                  trackerKey: getRpcTracker(chainId)?.trackerKey ?? "unknown",
                });
              }}
            >
              Force Primary Failure
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (!secondaryRpc) {
                  return;
                }
                emitFallbackTrackerEndpointFailure({
                  endpoint: secondaryRpc,
                  trackerKey: getRpcTracker(chainId)?.trackerKey ?? "unknown",
                });
              }}
            >
              Force Secondary Failure
            </Button>
          </div>
        </div>

        <div className="rounded border border-gray-200 p-3">
          <h3 className="text-sm mb-3 font-semibold">Multicall Simulation</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-xs mb-2 font-semibold text-gray-400">Worker Thread</h4>
              <div className="space-y-2">
                <Checkbox
                  isChecked={debugState.triggerPrimaryAsFailedInWorker ?? false}
                  setIsChecked={(checked) => onDebugFlagChange("triggerPrimaryAsFailedInWorker", checked)}
                >
                  Primary failed
                </Checkbox>
                <Checkbox
                  isChecked={debugState.triggerPrimaryTimeoutInWorker ?? false}
                  setIsChecked={(checked) => onDebugFlagChange("triggerPrimaryTimeoutInWorker", checked)}
                >
                  Primary timeout
                </Checkbox>
                <Checkbox
                  isChecked={debugState.triggerSecondaryFailedInWorker ?? false}
                  setIsChecked={(checked) => onDebugFlagChange("triggerSecondaryFailedInWorker", checked)}
                >
                  Secondary failed
                </Checkbox>
                <Checkbox
                  isChecked={debugState.triggerSecondaryTimeoutInWorker ?? false}
                  setIsChecked={(checked) => onDebugFlagChange("triggerSecondaryTimeoutInWorker", checked)}
                >
                  Secondary timeout
                </Checkbox>
              </div>
            </div>
            <div>
              <h4 className="text-xs mb-2 font-semibold text-gray-400">Main Thread</h4>
              <div className="space-y-2">
                <Checkbox
                  isChecked={debugState.triggerPrimaryAsFailedInMainThread ?? false}
                  setIsChecked={(checked) => onDebugFlagChange("triggerPrimaryAsFailedInMainThread", checked)}
                >
                  Primary failed
                </Checkbox>
                <Checkbox
                  isChecked={debugState.triggerSecondaryFailedInMainThread ?? false}
                  setIsChecked={(checked) => onDebugFlagChange("triggerSecondaryFailedInMainThread", checked)}
                >
                  Secondary failed
                </Checkbox>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketsSection({ marketsInfoData }: { marketsInfoData: any }) {
  return (
    <div className="mt-6">
      <h3 className="text-xl mb-4 font-bold">Markets Info</h3>
      <div className="rounded border border-gray-200">
        {!marketsInfoData ? (
          <div className="p-4">Loading markets data...</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.values(marketsInfoData || {}).map((marketInfo: any) => (
              <div key={marketInfo.name} className="p-4">
                <div className="font-semibold">{marketInfo.name}</div>
                <div className="text-sm text-gray-600">
                  {formatUsd(getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: true, isLong: true }))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
